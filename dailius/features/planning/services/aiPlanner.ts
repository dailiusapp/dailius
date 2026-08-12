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
activityId from activities, goalId from goals, commitmentId from commitments — but ONLY a
commitment whose "id" in context is non-null; a commitment with "id": null is a fixed external
calendar event and can never be moved, no matter how the user phrases the request). Never invent
an id.

The same rule applies to NAMES, not just ids: the user's own message ("userMessage" in the context)
may misname, misremember, or garble an activity — e.g. call it by the wrong number or a name that
doesn't exist in "activities"/"scheduledBlocks" at all. Use userMessage only to understand what the
user means (which real block/activity/day they're pointing at), never as a source of truth for what
to call it. Every activity name in your "summary" MUST be copied exactly from the "activities" or
"scheduledBlocks" list — never repeat back a name from userMessage that doesn't exactly match one of
those.

Operations you may propose:
- MOVE_ACTIVITY { blockId, targetDate } — relocate an existing scheduled block to a different day.
- ADD_ACTIVITY { activityId, targetDate } — schedule a new occurrence of an activity this week.
- REMOVE_ACTIVITY { blockId } — drop an existing scheduled block from this week.
- CHANGE_PRIORITY { goalId, newPriority } — change a goal's priority ("low"|"medium"|"high").
- MOVE_COMMITMENT { commitmentId, targetDate } — relocate an existing one-time commitment (e.g. an
  appointment) to a different day. Only ever valid for a commitment with a non-null "id" in context.

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
- trigger.type "COMMITMENT_MOVE": the named commitmentId must move to a different day.
  targetDayLabel, if present, is the day the user asked for — propose exactly that day as
  targetDate on your first attempt. Unlike MOVE_ACTIVITY, a commitment move that doesn't fit on
  the requested day FAILS rather than silently landing elsewhere — only propose a different day if
  priorViolations shows the requested day had no room.

Principles:
- Prefer the smallest set of changes that produces a meaningfully better week. Do not move
  activities just because another arrangement exists.
- Only move a SECOND activity to accommodate the first when there is no way to satisfy the request
  without it — e.g. every other day for the first activity would violate a hard constraint. Landing
  the first activity on a day that merely isn't its preferred day is still a smaller, better change
  than displacing an activity that was already scheduled and unaffected by this request. A day that
  is "less ideal" is not the same as "infeasible" — prefer the less-ideal single move over a swap.
- Not all activities are equally movable: prefer moving lower-priority, more flexible activities
  over higher-priority, less flexible ones — but only once you've confirmed a second move is
  actually necessary, not as a first resort.
- Consider the whole remaining week, not just the one activity mentioned — moving one activity may
  require moving another to avoid conflicts or an unbalanced week (e.g. two hard workouts back to
  back). This is about avoiding NEW problems the request would otherwise create, not about
  optimizing an activity onto its ideal day when a valid, if less ideal, day was already available.
- If you are given priorViolations from a rejected attempt, your new proposal must address them,
  not repeat the same operations.
- Write a short, concrete "summary" in plain language describing what you're proposing and why,
  suitable to show the user directly (e.g. "Move Thursday's strength session to Friday and
  reschedule the missed run for Thursday — this keeps your weekly running goal on track.").`;

const OPERATION_SCHEMA = {
  type: "object" as const,
  properties: {
    type: { type: "string", enum: ["MOVE_ACTIVITY", "ADD_ACTIVITY", "REMOVE_ACTIVITY", "CHANGE_PRIORITY", "MOVE_COMMITMENT"] },
    blockId: { type: ["string", "null"] },
    activityId: { type: ["string", "null"] },
    goalId: { type: ["string", "null"] },
    commitmentId: { type: ["string", "null"] },
    targetDate: { type: ["string", "null"] },
    newPriority: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
  },
  required: ["type", "blockId", "activityId", "goalId", "commitmentId", "targetDate", "newPriority"],
  additionalProperties: false,
};

type RawOperation = {
  type: string;
  blockId: string | null;
  activityId: string | null;
  goalId: string | null;
  commitmentId: string | null;
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
    case "MOVE_COMMITMENT":
      return raw.commitmentId && raw.targetDate
        ? { type: "MOVE_COMMITMENT", commitmentId: raw.commitmentId, targetDate: raw.targetDate }
        : null;
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
