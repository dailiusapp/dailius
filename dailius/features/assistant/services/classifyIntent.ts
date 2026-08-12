"use server";

import type { PlanningTrigger } from "@/features/planning/types";
import { extractIntent, type MissedActivityCandidate } from "./extractIntent";
import { extractFutureRescheduleIntent, type UpcomingActivityCandidate } from "./extractFutureRescheduleIntent";
import { extractPriorityChangeIntent, type GoalCandidate } from "./extractPriorityChangeIntent";
import { extractCommitmentMoveIntent, type CommitmentCandidate } from "./extractCommitmentMoveIntent";

// Chains the narrowly-scoped classifiers rather than merging their prompts
// into one broad one — the missed-activity and future-move prompts are
// already tuned and live-confirmed working with zero test coverage to catch
// an accuracy regression from a merged prompt, so each stays byte-for-byte
// untouched. Unifies only at the return type. Tried in this order: missed
// activity (only makes sense if there's something to have missed), future
// move, commitment move, then priority change.
export async function classifyIntent(
  userMessage: string,
  todayIso: string,
  pastCandidates: MissedActivityCandidate[],
  futureCandidates: UpcomingActivityCandidate[],
  goalCandidates: GoalCandidate[],
  fixedCommitmentTitles: string[] = [],
  commitmentCandidates: CommitmentCandidate[] = [],
): Promise<PlanningTrigger> {
  if (pastCandidates.length > 0) {
    const { blockId } = await extractIntent(userMessage, todayIso, pastCandidates, fixedCommitmentTitles);
    if (blockId) return { type: "MISSED_ACTIVITY", blockId };
  }

  if (futureCandidates.length > 0) {
    const { blockId, targetDayLabel } = await extractFutureRescheduleIntent(
      userMessage,
      todayIso,
      futureCandidates,
      fixedCommitmentTitles,
    );
    if (blockId) return { type: "FUTURE_MOVE", blockId, targetDayLabel };
  }

  if (commitmentCandidates.length > 0) {
    const { commitmentId, targetDayLabel } = await extractCommitmentMoveIntent(
      userMessage,
      todayIso,
      commitmentCandidates,
      fixedCommitmentTitles,
    );
    if (commitmentId) return { type: "COMMITMENT_MOVE", commitmentId, targetDayLabel };
  }

  if (goalCandidates.length > 0) {
    const { goalId, newPriority } = await extractPriorityChangeIntent(userMessage, goalCandidates);
    if (goalId && newPriority) return { type: "PRIORITY_CHANGE", goalId, newPriority };
  }

  return { type: "UNKNOWN" };
}
