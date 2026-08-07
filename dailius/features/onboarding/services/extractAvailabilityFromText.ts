"use server";

import OpenAI from "openai";
import { requireUser } from "@/features/auth/services/requireUser";
import { MAX_TIME_OPTIONS } from "../constants";
import type { Availability, TimeRange } from "../types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

const BLOCK_KEYS = [
  "weekdayMorning",
  "weekdayAfternoon",
  "weekdayEvening",
  "weekendMorning",
  "weekendAfternoon",
  "weekendEvening",
] as const;

const SYSTEM_PROMPT = `You help a user set their weekly availability during onboarding
for a planning app. There are six fixed time blocks: weekday/weekend x
morning/afternoon/evening. You'll be given the user's current availability (each block
is either null, meaning unavailable, or a {start,end} 24h "HH:MM" time range) and a
free-text description of when they're usually free. Return the COMPLETE updated
availability for all six blocks: only change a block if the message actually addresses
it (e.g. "weekday mornings" or "most evenings"); leave every other block exactly as it
was in "current". Use reasonable specific times when the message doesn't give exact
times (e.g. "evenings" might mean 17:00-21:00). Also include a one-sentence "note"
summarizing what you understood, so the user can double check it.`;

function validateRange(raw: unknown): TimeRange | null {
  if (!raw || typeof raw !== "object") return null;
  const { start, end } = raw as { start?: unknown; end?: unknown };
  if (typeof start !== "string" || typeof end !== "string") return null;
  if (!TIME_FORMAT.test(start) || !TIME_FORMAT.test(end)) return null;
  if (end <= start) return null;
  return { start, end };
}

export async function extractAvailabilityFromText(
  description: string,
  currentAvailability: Availability,
): Promise<{ availability: Availability; note: string | null }> {
  await requireUser();

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            current: currentAvailability,
            maxDailyPlanningMinutesOptions: MAX_TIME_OPTIONS.map((option) => option.value),
            message: description,
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "availability_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              note: { type: "string" },
              maxDailyPlanningMinutes: { type: ["integer", "null"] },
              ...Object.fromEntries(
                BLOCK_KEYS.map((key) => [
                  key,
                  {
                    anyOf: [
                      { type: "null" },
                      {
                        type: "object",
                        properties: { start: { type: "string" }, end: { type: "string" } },
                        required: ["start", "end"],
                        additionalProperties: false,
                      },
                    ],
                  },
                ]),
              ),
            },
            required: ["note", "maxDailyPlanningMinutes", ...BLOCK_KEYS],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { availability: currentAvailability, note: "Sorry, I couldn't turn that into availability — try the toggles below." };
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;

    const availability: Availability = {
      weekdayMorning: validateRange(parsed.weekdayMorning),
      weekdayAfternoon: validateRange(parsed.weekdayAfternoon),
      weekdayEvening: validateRange(parsed.weekdayEvening),
      weekendMorning: validateRange(parsed.weekendMorning),
      weekendAfternoon: validateRange(parsed.weekendAfternoon),
      weekendEvening: validateRange(parsed.weekendEvening),
      maxDailyPlanningMinutes:
        typeof parsed.maxDailyPlanningMinutes === "number" &&
        MAX_TIME_OPTIONS.some((option) => option.value === parsed.maxDailyPlanningMinutes)
          ? parsed.maxDailyPlanningMinutes
          : null,
    };

    const note = typeof parsed.note === "string" ? parsed.note : null;

    return { availability, note };
  } catch (error) {
    console.error("Failed to extract availability from text:", error);
    return { availability: currentAvailability, note: "Sorry, I couldn't turn that into availability — try the toggles below." };
  }
}
