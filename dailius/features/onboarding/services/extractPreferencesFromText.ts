"use server";

import OpenAI from "openai";
import { requireUser } from "@/features/auth/services/requireUser";
import { AVOID_AFTER_OPTIONS, PROTECT_OPTIONS, WORKOUT_LENGTH_OPTIONS } from "../constants";
import type { PlanningStyle, Preferences } from "../types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PLANNING_STYLE_VALUES: PlanningStyle[] = ["relaxed", "balanced", "productive"];

const SYSTEM_PROMPT = `You help a user set scheduling preferences during onboarding for
a planning app. You'll be given fixed option lists for "avoid scheduling after" times,
"protect time for" labels, preferred workout length, and planning style, plus the
user's current preferences and a free-text description. Return the COMPLETE updated
preferences: only change a field the message actually addresses, otherwise keep the
current value. Only use values from the provided option lists — never invent a new
"avoid after" time, protected-time label, workout length, or planning style. Also
include a one-sentence "note" summarizing what you understood.`;

export async function extractPreferencesFromText(
  description: string,
  currentPreferences: Preferences,
): Promise<{ preferences: Preferences; note: string | null }> {
  await requireUser();

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            avoidAfterOptions: AVOID_AFTER_OPTIONS.map((option) => option.value),
            protectOptions: PROTECT_OPTIONS,
            workoutLengthOptions: WORKOUT_LENGTH_OPTIONS,
            planningStyleOptions: PLANNING_STYLE_VALUES,
            current: currentPreferences,
            message: description,
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "preferences_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              note: { type: "string" },
              avoidSchedulingAfter: { type: ["string", "null"] },
              protectedTimes: { type: "array", items: { type: "string" } },
              preferredWorkoutLengthMinutes: { type: ["integer", "null"] },
              planningStyle: { type: ["string", "null"] },
            },
            required: [
              "note",
              "avoidSchedulingAfter",
              "protectedTimes",
              "preferredWorkoutLengthMinutes",
              "planningStyle",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { preferences: currentPreferences, note: "Sorry, I couldn't quite parse that — use the options below." };
    }

    const parsed = JSON.parse(content) as {
      note: string;
      avoidSchedulingAfter: string | null;
      protectedTimes: unknown[];
      preferredWorkoutLengthMinutes: number | null;
      planningStyle: string | null;
    };

    const avoidSchedulingAfter =
      typeof parsed.avoidSchedulingAfter === "string" &&
      AVOID_AFTER_OPTIONS.some((option) => option.value === parsed.avoidSchedulingAfter)
        ? parsed.avoidSchedulingAfter
        : null;

    const protectedTimes = Array.isArray(parsed.protectedTimes)
      ? [...new Set(parsed.protectedTimes.filter((label): label is string => typeof label === "string" && PROTECT_OPTIONS.includes(label)))]
      : [];

    const preferredWorkoutLengthMinutes =
      typeof parsed.preferredWorkoutLengthMinutes === "number" &&
      WORKOUT_LENGTH_OPTIONS.includes(parsed.preferredWorkoutLengthMinutes)
        ? parsed.preferredWorkoutLengthMinutes
        : null;

    const planningStyle =
      typeof parsed.planningStyle === "string" && PLANNING_STYLE_VALUES.includes(parsed.planningStyle as PlanningStyle)
        ? (parsed.planningStyle as PlanningStyle)
        : null;

    const preferences: Preferences = {
      avoidSchedulingAfter,
      protectedTimes,
      preferredWorkoutLengthMinutes,
      planningStyle,
    };

    const note = typeof parsed.note === "string" ? parsed.note : null;

    return { preferences, note };
  } catch (error) {
    console.error("Failed to extract preferences from text:", error);
    return { preferences: currentPreferences, note: "Sorry, I couldn't quite parse that — use the options below." };
  }
}
