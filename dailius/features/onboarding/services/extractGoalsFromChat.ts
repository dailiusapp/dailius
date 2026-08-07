"use server";

import OpenAI from "openai";
import { requireUser } from "@/features/auth/services/requireUser";
import { FREQUENCY_OPTIONS, GOAL_OPTIONS } from "../constants";
import type { GoalSelection, Priority } from "../types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ChatTurn = { role: "user" | "assistant"; text: string };

const PRIORITY_VALUES: Priority[] = ["low", "medium", "high"];

const SYSTEM_PROMPT = `You help a user pick personal goals during onboarding for a
planning app. You'll be given a fixed list of goal options, a fixed list of frequency
options, the goals the user has selected so far, their conversation history, and their
newest message. Update the selected-goals list based on the newest message: add goals
they mention (matching to the closest provided goal option), remove ones they say they
don't want, and set frequency/priority when they're clear from context. Always return
the COMPLETE resulting list of selected goals, not just what changed. If a detail
(frequency or priority) is ambiguous or unstated for a newly-added goal, make a
reasonable default and briefly ask a short clarifying follow-up in your reply so the
user can correct it. Only ever use goal names, frequencies, and priorities from the
provided lists — never invent a new one. Keep replies short (1-2 sentences).`;

function keyFor(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

function validateGoal(raw: { label?: unknown; frequency?: unknown; priority?: unknown }): GoalSelection | null {
  if (typeof raw.label !== "string") return null;
  const label = raw.label.toLowerCase().trim();
  const matchedOption = GOAL_OPTIONS.find((option) => option.toLowerCase() === label);
  if (!matchedOption) return null;

  const frequency =
    typeof raw.frequency === "string" && FREQUENCY_OPTIONS.includes(raw.frequency)
      ? raw.frequency
      : FREQUENCY_OPTIONS[1];
  const priority: Priority =
    typeof raw.priority === "string" && PRIORITY_VALUES.includes(raw.priority as Priority)
      ? (raw.priority as Priority)
      : "medium";

  return { key: keyFor(matchedOption), label: matchedOption, frequency, priority };
}

export async function extractGoalsFromChat(
  history: ChatTurn[],
  userMessage: string,
  currentGoals: GoalSelection[],
): Promise<{ reply: string; goals: GoalSelection[] }> {
  await requireUser();

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            goalOptions: GOAL_OPTIONS,
            frequencyOptions: FREQUENCY_OPTIONS,
            priorityOptions: PRIORITY_VALUES,
            currentGoals,
            history,
            message: userMessage,
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "goal_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              goals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    frequency: { type: "string" },
                    priority: { type: "string" },
                  },
                  required: ["label", "frequency", "priority"],
                  additionalProperties: false,
                },
              },
            },
            required: ["reply", "goals"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { reply: "Sorry, I had trouble with that — you can still pick manually below.", goals: currentGoals };

    const parsed = JSON.parse(content) as { reply: string; goals: unknown[] };
    const validated = parsed.goals
      .map((raw) => validateGoal(raw as { label?: unknown; frequency?: unknown; priority?: unknown }))
      .filter((goal): goal is GoalSelection => goal !== null);

    const deduped = new Map(validated.map((goal) => [goal.key, goal]));

    return { reply: parsed.reply, goals: [...deduped.values()] };
  } catch (error) {
    console.error("Failed to extract goals from chat:", error);
    return { reply: "Sorry, something went wrong — you can still pick manually below.", goals: currentGoals };
  }
}
