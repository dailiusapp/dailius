"use server";

import OpenAI from "openai";
import { requireUser } from "@/features/auth/services/requireUser";
import { ACTIVITY_OPTIONS, DAY_OPTIONS, DURATION_OPTIONS, TIME_OPTIONS } from "../constants";
import type { RecurringActivitySelection } from "../types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ChatTurn = { role: "user" | "assistant"; text: string };

const MAX_NAME_LENGTH = 60;

const SYSTEM_PROMPT = `You help a user list their recurring activities during onboarding
for a planning app (things that regularly appear on their schedule — not goals). You'll
be given a fixed list of activity options, the activities selected so far, their
conversation history, and their newest message. Update the selected-activities list
based on the newest message: add activities they mention (matching to the closest
provided option when it fits), remove ones they say they don't want, and set
duration/preferred days/preferred time/flexibility when clear from context. If an
activity doesn't match any provided option, use the option "Other" and put the real
activity name in the "name" field. Always return the COMPLETE resulting list, not just
what changed. Keep replies short (1-2 sentences), and briefly ask a clarifying question
if an important detail is missing or ambiguous. Only use activity options, durations,
days, and times of day from the provided lists — never invent a new option (except the
free-text name when the option is "Other").`;

function keyFor(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

function validateActivity(raw: {
  label?: unknown;
  name?: unknown;
  durationMinutes?: unknown;
  preferredDays?: unknown;
  preferredTimeOfDay?: unknown;
  flexible?: unknown;
}): RecurringActivitySelection | null {
  if (typeof raw.label !== "string") return null;
  const rawLabel = raw.label.toLowerCase().trim();
  const matchedOption = ACTIVITY_OPTIONS.find((option) => option.toLowerCase() === rawLabel);
  const label = matchedOption ?? "Other";

  const name =
    label === "Other"
      ? typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim().slice(0, MAX_NAME_LENGTH)
        : "Other"
      : label;

  const durationMinutes =
    typeof raw.durationMinutes === "number" && DURATION_OPTIONS.includes(raw.durationMinutes)
      ? raw.durationMinutes
      : 60;

  const preferredDays = Array.isArray(raw.preferredDays)
    ? [...new Set(raw.preferredDays.filter((day): day is string => typeof day === "string" && DAY_OPTIONS.includes(day)))]
    : [];

  const preferredTimeOfDay =
    typeof raw.preferredTimeOfDay === "string" && TIME_OPTIONS.includes(raw.preferredTimeOfDay)
      ? raw.preferredTimeOfDay
      : null;

  const flexible = typeof raw.flexible === "boolean" ? raw.flexible : true;

  return { key: keyFor(label), label, name, durationMinutes, preferredDays, preferredTimeOfDay, flexible };
}

export async function extractActivitiesFromChat(
  history: ChatTurn[],
  userMessage: string,
  currentActivities: RecurringActivitySelection[],
): Promise<{ reply: string; activities: RecurringActivitySelection[] }> {
  await requireUser();

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            activityOptions: ACTIVITY_OPTIONS,
            durationOptions: DURATION_OPTIONS,
            dayOptions: DAY_OPTIONS,
            timeOptions: TIME_OPTIONS,
            currentActivities,
            history,
            message: userMessage,
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "activity_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              activities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    name: { type: "string" },
                    durationMinutes: { type: ["integer", "null"] },
                    preferredDays: { type: "array", items: { type: "string" } },
                    preferredTimeOfDay: { type: ["string", "null"] },
                    flexible: { type: "boolean" },
                  },
                  required: ["label", "name", "durationMinutes", "preferredDays", "preferredTimeOfDay", "flexible"],
                  additionalProperties: false,
                },
              },
            },
            required: ["reply", "activities"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { reply: "Sorry, I had trouble with that — you can still pick manually below.", activities: currentActivities };
    }

    const parsed = JSON.parse(content) as { reply: string; activities: unknown[] };
    const validated = parsed.activities
      .map((raw) =>
        validateActivity(
          raw as {
            label?: unknown;
            name?: unknown;
            durationMinutes?: unknown;
            preferredDays?: unknown;
            preferredTimeOfDay?: unknown;
            flexible?: unknown;
          },
        ),
      )
      .filter((activity): activity is RecurringActivitySelection => activity !== null);

    const deduped = new Map(validated.map((activity) => [activity.key, activity]));

    return { reply: parsed.reply, activities: [...deduped.values()] };
  } catch (error) {
    console.error("Failed to extract activities from chat:", error);
    return { reply: "Sorry, something went wrong — you can still pick manually below.", activities: currentActivities };
  }
}
