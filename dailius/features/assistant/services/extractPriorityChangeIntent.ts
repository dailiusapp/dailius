"use server";

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type GoalCandidate = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
};

const VALID_PRIORITIES = new Set(["low", "medium", "high"]);

const SYSTEM_PROMPT = `You match a user's message asking to change how important a goal is (e.g.
"prioritize running", "running matters most right now", "deprioritize guitar") to one of a
provided list of their real goals. Only ever return the id of one of the provided candidates, or
null if nothing clearly matches — never invent an id. If a clear match exists, also return the
requested priority ("low", "medium", or "high") inferred from the message; if the message doesn't
imply a specific priority level, default to "high" for a "prioritize X" style request. Return null
for both fields if the message isn't about changing a goal's priority at all.`;

export async function extractPriorityChangeIntent(
  userMessage: string,
  candidates: GoalCandidate[],
): Promise<{ goalId: string | null; newPriority: "low" | "medium" | "high" | null }> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ message: userMessage, candidates }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "priority_change_match",
          strict: true,
          schema: {
            type: "object",
            properties: {
              goalId: { type: ["string", "null"] },
              newPriority: { type: ["string", "null"] },
            },
            required: ["goalId", "newPriority"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { goalId: null, newPriority: null };

    const parsed = JSON.parse(content) as { goalId: string | null; newPriority: string | null };
    const isRealCandidate = candidates.some((candidate) => candidate.id === parsed.goalId);
    const isValidPriority = parsed.newPriority !== null && VALID_PRIORITIES.has(parsed.newPriority);

    return {
      goalId: isRealCandidate ? parsed.goalId : null,
      newPriority: isRealCandidate && isValidPriority ? (parsed.newPriority as "low" | "medium" | "high") : null,
    };
  } catch (error) {
    console.error("Failed to extract priority change intent:", error);
    return { goalId: null, newPriority: null };
  }
}
