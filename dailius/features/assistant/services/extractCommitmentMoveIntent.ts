"use server";

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type CommitmentCandidate = {
  id: string;
  title: string;
  scheduledDate: string;
};

const VALID_DAY_LABELS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

const SYSTEM_PROMPT = `You match a user's message about moving or rescheduling a one-time
commitment (e.g. an appointment) to one of a provided list of their real, manually-added
commitments. Only ever return the id of one of the provided candidates, or null if
nothing clearly matches. Never invent an id that isn't in the list. If the user's message
also names a day of the week they want it moved to (e.g. "move it to Saturday"), return
that day as a three-letter label (Mon, Tue, Wed, Thu, Fri, Sat, Sun); otherwise return
null for targetDayLabel.

You are also given "fixedCommitments" — titles of calendar commitments (meetings, fixed
events) that can never be rescheduled through this feature and are NOT valid candidates.
If the user's message names something that matches a fixedCommitments title rather than
a real candidate, that is NOT a match — return null, even if a candidate's name sounds
superficially similar. Do not guess the nearest-sounding candidate.`;

export async function extractCommitmentMoveIntent(
  userMessage: string,
  todayIso: string,
  candidates: CommitmentCandidate[],
  fixedCommitments: string[] = [],
): Promise<{ commitmentId: string | null; targetDayLabel: string | null }> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({ today: todayIso, message: userMessage, candidates, fixedCommitments }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "commitment_move_match",
          strict: true,
          schema: {
            type: "object",
            properties: {
              commitmentId: { type: ["string", "null"] },
              targetDayLabel: { type: ["string", "null"] },
            },
            required: ["commitmentId", "targetDayLabel"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { commitmentId: null, targetDayLabel: null };

    const parsed = JSON.parse(content) as { commitmentId: string | null; targetDayLabel: string | null };
    const isRealCandidate = candidates.some((candidate) => candidate.id === parsed.commitmentId);
    const isValidDayLabel = parsed.targetDayLabel !== null && VALID_DAY_LABELS.has(parsed.targetDayLabel);

    return {
      commitmentId: isRealCandidate ? parsed.commitmentId : null,
      targetDayLabel: isValidDayLabel ? parsed.targetDayLabel : null,
    };
  } catch (error) {
    console.error("Failed to extract commitment move intent:", error);
    return { commitmentId: null, targetDayLabel: null };
  }
}
