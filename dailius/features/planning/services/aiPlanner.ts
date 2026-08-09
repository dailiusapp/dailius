"use server";

import OpenAI from "openai";
import type { PlanningContext, PlanningOperation } from "../types";
import { AI_PLANNER_MODEL } from "../constants";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are Dailius's AI planner. You reason about a user's week and PROPOSE
schedule changes — you never decide exact times or write directly to the schedule. A separate
deterministic engine will validate your proposal and pick the exact time within whatever day you
target; you only ever choose a DAY (targetDate, "YYYY-MM-DD"), never a clock time.

You may only reference ids that appear in the provided context (blockId from scheduledBlocks,
activityId from activities, goalId from goals). Never invent an id.

Operations you may propose:
- MOVE_ACTIVITY { blockId, targetDate } — relocate an existing scheduled block to a different day.
- ADD_ACTIVITY { activityId, targetDate } — schedule a new occurrence of an activity this week.
- REMOVE_ACTIVITY { blockId } — drop an existing scheduled block from this week.
- CHANGE_PRIORITY { goalId, newPriority } — change a goal's priority ("low"|"medium"|"high").

The context's "trigger" field tells you exactly what was requested — honor it:
- trigger.type "MISSED_ACTIVITY": the named blockId was missed. Do not simply re-add it to the
  same slot — consider whether it still matters and where it best fits given the rest of the week.
- trigger.type "FUTURE_MOVE": the named blockId must move off its current day. targetDayLabel, if
  present, is the user's preferred destination — try it first, but you may pick another day if
  needed.
- trigger.type "PRIORITY_CHANGE": your operations MUST include a CHANGE_PRIORITY operation for
  exactly this goalId and newPriority, plus whatever MOVE_ACTIVITY/ADD_ACTIVITY/REMOVE_ACTIVITY
  operations are needed so the schedule actually reflects the new priority (e.g. protecting a
  newly high-priority activity by moving a lower-priority one instead of it).

Principles:
- Prefer the smallest set of changes that produces a meaningfully better week. Do not move
  activities just because another arrangement exists.
- Not all activities are equally movable: prefer moving lower-priority, more flexible activities
  over higher-priority, less flexible ones.
- Consider the whole remaining week, not just the one activity mentioned — moving one activity may
  require moving another to avoid conflicts or an unbalanced week (e.g. two hard workouts back to
  back).
- If you are given priorViolations from a rejected attempt, your new proposal must address them,
  not repeat the same operations.
- Write a short, concrete "summary" in plain language describing what you're proposing and why,
  suitable to show the user directly (e.g. "Move Thursday's strength session to Friday and
  reschedule the missed run for Thursday — this keeps your weekly running goal on track.").`;

const OPERATION_SCHEMA = {
  type: "object" as const,
  properties: {
    type: { type: "string", enum: ["MOVE_ACTIVITY", "ADD_ACTIVITY", "REMOVE_ACTIVITY", "CHANGE_PRIORITY"] },
    blockId: { type: ["string", "null"] },
    activityId: { type: ["string", "null"] },
    goalId: { type: ["string", "null"] },
    targetDate: { type: ["string", "null"] },
    newPriority: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
  },
  required: ["type", "blockId", "activityId", "goalId", "targetDate", "newPriority"],
  additionalProperties: false,
};

type RawOperation = {
  type: string;
  blockId: string | null;
  activityId: string | null;
  goalId: string | null;
  targetDate: string | null;
  newPriority: "low" | "medium" | "high" | null;
};

export type AIPlannerOutput = { summary: string; operations: PlanningOperation[] };

// Rejects malformed/unsupported operations outright rather than passing
// them through — docs/requirements/scheduling refactoring.md §28. A raw
// operation missing the fields its type requires is simply dropped (not
// applied, not treated as fatal) since the planning loop's validator will
// see fewer operations than the AI's stated intent and can react to that
// via a violation on the next attempt.
function parseOperation(raw: RawOperation): PlanningOperation | null {
  switch (raw.type) {
    case "MOVE_ACTIVITY":
      return raw.blockId && raw.targetDate ? { type: "MOVE_ACTIVITY", blockId: raw.blockId, targetDate: raw.targetDate } : null;
    case "ADD_ACTIVITY":
      return raw.activityId && raw.targetDate
        ? { type: "ADD_ACTIVITY", activityId: raw.activityId, targetDate: raw.targetDate }
        : null;
    case "REMOVE_ACTIVITY":
      return raw.blockId ? { type: "REMOVE_ACTIVITY", blockId: raw.blockId } : null;
    case "CHANGE_PRIORITY":
      return raw.goalId && raw.newPriority ? { type: "CHANGE_PRIORITY", goalId: raw.goalId, newPriority: raw.newPriority } : null;
    default:
      return null;
  }
}

export async function callAIPlanner(
  context: PlanningContext,
): Promise<{ ok: true; output: AIPlannerOutput; inputTokens: number | null; outputTokens: number | null } | { ok: false }> {
  try {
    const response = await client.chat.completions.create({
      model: AI_PLANNER_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(context) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "planning_proposal",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              operations: { type: "array", items: OPERATION_SCHEMA },
            },
            required: ["summary", "operations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { ok: false };

    const parsed = JSON.parse(content) as { summary: string; operations: RawOperation[] };
    const operations = parsed.operations.map(parseOperation).filter((op): op is PlanningOperation => op !== null);

    if (typeof parsed.summary !== "string" || operations.length === 0) return { ok: false };

    return {
      ok: true,
      output: { summary: parsed.summary, operations },
      inputTokens: response.usage?.prompt_tokens ?? null,
      outputTokens: response.usage?.completion_tokens ?? null,
    };
  } catch (error) {
    console.error("Failed to call AI planner:", error);
    return { ok: false };
  }
}
