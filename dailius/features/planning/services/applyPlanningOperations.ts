import type { ActivityInput, CommitmentInput, EngineInput, GoalPriority, PlanningOperation, ScheduledBlock, ScheduledBlockDraft } from "../types";
import { EXERCISE_ACTIVITY_NAMES, computeFreeBlocksForWeek, placeOccurrence, prioritizeActivities, seedExistingBookings } from "./engine";
import { dayOfWeekLabel, parseISODate, timeToMinutes, toISODate } from "./dateUtils";

export type ApplyOperationsResult =
  | {
      ok: true;
      resultingBlocks: ScheduledBlockDraft[]; // full resulting week, for planningValidator
      newBlocks: ScheduledBlockDraft[]; // to insert on confirm (MOVE targets + ADD)
      removedBlockIds: string[]; // to delete on confirm (MOVE sources + REMOVE)
      priorityChanges: { goalId: string; newPriority: GoalPriority }[];
    }
  | { ok: false; reason: string };

// Applies an AI-proposed operation batch to the current real week, producing
// a hypothetical resulting schedule for planningValidator to check — never
// touches the database itself. Every id an operation references must exist
// in the real, server-loaded context; a single invalid reference rejects
// the WHOLE attempt (never partially applied), mirroring extractIntent.ts's
// "never trust an AI-supplied id blindly" principle, generalized to all 4
// operation shapes.
export function applyPlanningOperations(
  operations: PlanningOperation[],
  currentBlocks: ScheduledBlock[],
  input: EngineInput,
): ApplyOperationsResult {
  const activitiesById = new Map<string, ActivityInput>(input.activities.map((activity) => [activity.id, activity]));
  const goalIds = new Set(input.goals.map((goal) => goal.id));
  const blocksById = new Map<string, ScheduledBlock>(currentBlocks.map((block) => [block.id, block]));
  const commitmentsById = new Map<string, CommitmentInput>(input.commitments.map((commitment) => [commitment.id, commitment]));

  const touchedBlockIds = new Set<string>(); // MOVE/REMOVE sources — vacate their old slot
  const touchedCommitmentIds = new Set<string>(); // MOVE_COMMITMENT sources — vacate their old slot
  for (const op of operations) {
    if (op.type === "MOVE_ACTIVITY" || op.type === "REMOVE_ACTIVITY") {
      const block = blocksById.get(op.blockId);
      if (!block || block.status !== "scheduled") {
        return { ok: false, reason: `Referenced activity is no longer scheduled (blockId ${op.blockId}).` };
      }
      touchedBlockIds.add(op.blockId);
    }
    if (op.type === "ADD_ACTIVITY" && !activitiesById.has(op.activityId)) {
      return { ok: false, reason: `Referenced activity does not exist (activityId ${op.activityId}).` };
    }
    if (op.type === "CHANGE_PRIORITY" && !goalIds.has(op.goalId)) {
      return { ok: false, reason: `Referenced goal does not exist (goalId ${op.goalId}).` };
    }
    if (op.type === "MOVE_COMMITMENT") {
      // Never trust an AI-supplied id blindly (same principle as every other
      // operation above) — even though buildPlanningContext.ts should never
      // expose a non-Manual commitment's id to the AI in the first place,
      // this is the layer that actually enforces it can't be moved.
      const commitment = commitmentsById.get(op.commitmentId);
      if (!commitment || commitment.source !== "Manual") {
        return { ok: false, reason: `Referenced commitment does not exist or is not movable (commitmentId ${op.commitmentId}).` };
      }
      touchedCommitmentIds.add(op.commitmentId);
    }
  }

  const days = computeFreeBlocksForWeek(input);

  const untouchedBlocks = currentBlocks.filter(
    (block) => (block.status === "scheduled" || block.status === "completed") && !touchedBlockIds.has(block.id),
  );
  seedExistingBookings(
    days,
    untouchedBlocks.map((block) => ({
      scheduledDate: block.scheduledDate,
      startTime: block.startTime,
      endTime: block.endTime,
      isExercise: EXERCISE_ACTIVITY_NAMES.has(block.activityName.trim().toLowerCase()),
    })),
  );
  seedExistingBookings(
    days,
    input.commitments
      .filter((commitment) => !touchedCommitmentIds.has(commitment.id))
      .map((commitment) => ({
        scheduledDate: commitment.scheduledDate,
        startTime: commitment.startTime,
        endTime: commitment.endTime,
        isExercise: false,
      })),
  );

  // Same same-day workaround as proposeReschedule.ts/proposeFutureReschedule.ts:
  // computeFreeBlocksForWeek's isPast is date-only, so today is never a
  // valid destination until the engine becomes time-of-day aware.
  const todayIso = toISODate(input.today);
  const today = days.find((day) => day.date === todayIso);
  if (today) today.freeRanges = [];

  const latestExerciseConstraint = input.constraints.find((c) => c.type === "latest_exercise_time");
  const exerciseCutoffMinutes = latestExerciseConstraint ? timeToMinutes(latestExerciseConstraint.value) : null;
  const maxDailyMinutes = input.availability.maxDailyPlanningMinutes;

  const newBlocks: ScheduledBlockDraft[] = [];
  const removedBlockIds: string[] = [];
  const priorityChanges: { goalId: string; newPriority: GoalPriority }[] = [];

  // REMOVE first (vacating is already achieved by exclusion from seeding
  // above), then MOVE, then ADD — matches the plan's stated order and
  // ensures MOVE/ADD always see the most up-to-date free/busy picture.
  for (const op of operations.filter((o) => o.type === "REMOVE_ACTIVITY")) {
    if (op.type !== "REMOVE_ACTIVITY") continue;
    removedBlockIds.push(op.blockId);
  }

  for (const op of operations.filter((o) => o.type === "MOVE_ACTIVITY" || o.type === "ADD_ACTIVITY")) {
    const activity =
      op.type === "MOVE_ACTIVITY" ? activitiesById.get(blocksById.get(op.blockId)!.activityId)! : activitiesById.get(op.activityId)!;

    const targetDayLabel = dayOfWeekLabel(parseISODate(op.targetDate));
    // Bias the search toward the AI's proposed day while still allowing
    // fallback to another day if it's genuinely unavailable — the exact
    // same trick proposeFutureReschedule.ts already uses and this codebase
    // has live-confirmed working.
    const activityForSearch: ActivityInput = { ...activity, preferredDays: [targetDayLabel], flexible: true };
    const [resolved] = prioritizeActivities({ ...input, activities: [activityForSearch] });

    const placed = placeOccurrence(resolved, 0, days, exerciseCutoffMinutes, maxDailyMinutes);
    if (!placed) {
      return { ok: false, reason: `No available slot near ${op.targetDate} for ${activity.name}.` };
    }

    if (op.type === "MOVE_ACTIVITY") {
      placed.originalScheduledDate = blocksById.get(op.blockId)!.scheduledDate;
      removedBlockIds.push(op.blockId);
    }
    newBlocks.push(placed);
  }

  for (const op of operations.filter((o) => o.type === "MOVE_COMMITMENT")) {
    if (op.type !== "MOVE_COMMITMENT") continue;
    const commitment = commitmentsById.get(op.commitmentId)!;
    const durationMinutes = timeToMinutes(commitment.endTime) - timeToMinutes(commitment.startTime);
    const targetDayLabel = dayOfWeekLabel(parseISODate(op.targetDate));

    // Unlike MOVE_ACTIVITY's activityForSearch, this is deliberately
    // flexible: false (only the target day is ever considered — no
    // fallback to another day) and minimumDurationMinutes: null (no
    // shrink-to-fit). A commitment's day and duration are real-world facts
    // the user asked for, not preferences the engine may quietly trade off
    // — if the requested day has no room, this operation batch fails and
    // the AI decides on its next attempt whether to try a different day,
    // rather than the engine silently substituting one.
    const commitmentForSearch: ActivityInput = {
      id: commitment.id,
      name: commitment.title,
      defaultDurationMinutes: durationMinutes,
      preferredFrequency: null,
      preferredDays: [targetDayLabel],
      preferredTimeOfDay: null,
      minimumDurationMinutes: null,
      maximumDurationMinutes: null,
      flexible: false,
      goalIds: [],
    };
    const [resolved] = prioritizeActivities({ ...input, activities: [commitmentForSearch] });

    const placed = placeOccurrence(resolved, 0, days, exerciseCutoffMinutes, maxDailyMinutes);
    if (!placed) {
      return { ok: false, reason: `No available slot on ${op.targetDate} for ${commitment.title}.` };
    }

    placed.commitmentId = op.commitmentId;
    newBlocks.push(placed);
  }

  for (const op of operations) {
    if (op.type === "CHANGE_PRIORITY") priorityChanges.push({ goalId: op.goalId, newPriority: op.newPriority });
  }

  // untouchedBlocks already excludes every MOVE/REMOVE source (touchedBlockIds
  // above), so no further filtering by removedBlockIds is needed here.
  const resultingBlocks: ScheduledBlockDraft[] = [
    ...untouchedBlocks.map((block) => ({
      activityId: block.activityId,
      activityName: block.activityName,
      scheduledDate: block.scheduledDate,
      startTime: block.startTime,
      endTime: block.endTime,
      rationale: block.rationale,
    })),
    ...newBlocks,
  ];

  return { ok: true, resultingBlocks, newBlocks, removedBlockIds, priorityChanges };
}
