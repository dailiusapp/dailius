"use server";

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type MissedActivityCandidate = {
  id: string;
  activityName: string;
  dayLabel: string;
  scheduledDate: string;
};

const SYSTEM_PROMPT = `You match a user's message about a missed activity to one of a
provided list of their real, already-scheduled activities. Only ever return the id of
one of the provided candidates, or null if nothing clearly matches. Never invent an id
that isn't in the list.`;

export async function extractIntent(
  userMessage: string,
  todayIso: string,
  candidates: MissedActivityCandidate[],
): Promise<{ blockId: string | null }> {
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
          name: "missed_activity_match",
          strict: true,
          schema: {
            type: "object",
            properties: {
              blockId: { type: ["string", "null"] },
            },
            required: ["blockId"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { blockId: null };

    const parsed = JSON.parse(content) as { blockId: string | null };
    const isRealCandidate = candidates.some((candidate) => candidate.id === parsed.blockId);
    return { blockId: isRealCandidate ? parsed.blockId : null };
  } catch (error) {
    console.error("Failed to extract chat intent:", error);
    return { blockId: null };
  }
}
