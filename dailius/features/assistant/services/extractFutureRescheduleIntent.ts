"use server";

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type UpcomingActivityCandidate = {
  id: string;
  activityName: string;
  dayLabel: string;
  scheduledDate: string;
};

const VALID_DAY_LABELS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

const SYSTEM_PROMPT = `You match a user's message about moving or rescheduling an
upcoming activity (one that hasn't happened yet) to one of a provided list of their
real, already-scheduled activities. Only ever return the id of one of the provided
candidates, or null if nothing clearly matches. Never invent an id that isn't in the
list. If the user's message also names a day of the week they want the activity moved
to (e.g. "move it to Saturday"), return that day as a three-letter label (Mon, Tue,
Wed, Thu, Fri, Sat, Sun); otherwise return null for targetDayLabel.`;

export async function extractFutureRescheduleIntent(
  userMessage: string,
  todayIso: string,
  candidates: UpcomingActivityCandidate[],
): Promise<{ blockId: string | null; targetDayLabel: string | null }> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({ today: todayIso, message: userMessage, candidates }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "future_reschedule_match",
          strict: true,
          schema: {
            type: "object",
            properties: {
              blockId: { type: ["string", "null"] },
              targetDayLabel: { type: ["string", "null"] },
            },
            required: ["blockId", "targetDayLabel"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { blockId: null, targetDayLabel: null };

    const parsed = JSON.parse(content) as { blockId: string | null; targetDayLabel: string | null };
    const isRealCandidate = candidates.some((candidate) => candidate.id === parsed.blockId);
    const isValidDayLabel = parsed.targetDayLabel !== null && VALID_DAY_LABELS.has(parsed.targetDayLabel);

    return {
      blockId: isRealCandidate ? parsed.blockId : null,
      targetDayLabel: isValidDayLabel ? parsed.targetDayLabel : null,
    };
  } catch (error) {
    console.error("Failed to extract future reschedule intent:", error);
    return { blockId: null, targetDayLabel: null };
  }
}
