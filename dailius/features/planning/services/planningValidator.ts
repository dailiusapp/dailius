import { occupiedSegments } from "./elapsedTime";
import { commitmentSegments } from "./commitmentSegments";
import type { EngineInput, ScheduledBlockDraft, Violation } from "../types";
import { EXERCISE_ACTIVITY_NAMES, computeFreeBlocksForWeek, seedExistingBookings, instantRangeIsFree } from "./engine";
import { getWeekStart, toISODate, timeToMinutes } from "./dateUtils";

export type ValidationResult = { valid: true } | { valid: false; violations: Violation[] };

type MinuteRange = { start: number; end: number };

// Mirrors engine.ts's private subtractRange exactly (interval subtraction).
// Kept local to validation; absolute overlap checks also distinguish the
// earlier/later occurrences when the clocks go back.
function subtractRange(ranges: MinuteRange[], sub: MinuteRange): MinuteRange[] {
  const result: MinuteRange[] = [];
  for (const range of ranges) {
    if (sub.end <= range.start || sub.start >= range.end) {
      result.push(range);
      continue;
    }
    if (sub.start > range.start) {
      result.push({ start: range.start, end: Math.min(sub.start, range.end) });
    }
    if (sub.end < range.end) {
      result.push({ start: Math.max(sub.end, range.start), end: range.end });
    }
  }
  return result.filter((range) => range.end > range.start);
}

// Holistic validator for an AI-proposed resulting week — the deterministic
// half of the AI-proposes/engine-validates loop (docs/requirements/
// scheduling refactoring.md §5/§17). Unlike confirmReschedule.ts's
// pairwise-overlap-only check (built for exactly one moved block), this
// walks every block in the proposed resulting week and consumes
// (subtracts) each valid one's range as it goes, so two AI-proposed blocks
// colliding with each other on the same free window are also caught, not
// just blocks colliding with pre-existing bookings/commitments.
export function validateSchedule(resultingBlocks: ScheduledBlockDraft[], input: EngineInput): ValidationResult {
  // Computed once, before any seeding/consumption — used only to tell
  // "genuinely outside availability" apart from "available in principle but
  // this exact time is booked." Once commitments/other blocks are seeded
  // into `days` below, freeRanges no longer distinguishes the two (a fully
  // booked-over window and a window that was never available both end up
  // as "not free"), so this separate pristine snapshot is required, not
  // just a nicety.
  const pristineDays = computeFreeBlocksForWeek(input);

  const days = computeFreeBlocksForWeek(input);
  // A commitment being moved this batch appears in `resultingBlocks` at its
  // NEW slot (tagged with commitmentId — see applyPlanningOperations.ts).
  // Without excluding it here, its OLD slot would still get seeded as
  // permanently busy below, and a same-day move that happens to land back
  // on an overlapping time would be wrongly rejected as conflicting with
  // itself.
  const movedCommitmentIds = new Set(resultingBlocks.map((block) => block.commitmentId).filter((id): id is string => Boolean(id)));
  seedExistingBookings(
    days,
    input.commitments
      .filter((commitment) => !movedCommitmentIds.has(commitment.id))
      .flatMap((commitment) => commitmentSegments(commitment, toISODate(getWeekStart(input.today))))
      .map((commitment) => ({
        scheduledDate: commitment.scheduledDate,
        startTime: commitment.startTime,
        endTime: commitment.endTime,
        startInstant: commitment.startInstant,
        endInstant: commitment.endInstant,
        isExercise: false,
      })),
  );

  const latestExerciseConstraint = input.constraints.find((c) => c.type === "latest_exercise_time");
  const exerciseCutoffMinutes = latestExerciseConstraint ? timeToMinutes(latestExerciseConstraint.value) : null;
  const maxDailyMinutes = input.availability.maxDailyPlanningMinutes;

  const violations: Violation[] = [];

  // Sorted so max-daily-duration accumulation and same-day collision
  // detection are order-independent of the AI's own operation ordering.
  const sortedBlocks = [...resultingBlocks].sort(
    (a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.startTime.localeCompare(b.startTime),
  );

  for (const block of sortedBlocks) {
    const day = days.find((d) => d.date === block.scheduledDate);
    const isExercise = EXERCISE_ACTIVITY_NAMES.has(block.activityName.trim().toLowerCase());
    const occupied = block.startInstant && block.endInstant
      ? occupiedSegments(block.startInstant, block.endInstant, input.timezone ?? "UTC") : [];
    const start = occupied.length === 1 ? timeToMinutes(occupied[0].startTime) : timeToMinutes(block.startTime);
    const end = occupied.length === 1 ? timeToMinutes(occupied[0].endTime) : timeToMinutes(block.endTime);
    const duration = block.startInstant && block.endInstant
      ? (Date.parse(block.endInstant) - Date.parse(block.startInstant)) / 60_000 : end - start;

    if (!day || day.isPast) {
      violations.push({
        type: "AVAILABILITY",
        activityName: block.activityName,
        detail: `${block.scheduledDate} is not a valid day for this week's plan.`,
        date: block.scheduledDate,
      });
      continue;
    }

    const activity = input.activities.find((candidate) => candidate.id === block.activityId);
    if (!block.commitmentId && activity?.fixedStartTime && activity.fixedStartTime !== block.startTime) {
      violations.push({ type: "FIXED_TIME", activityName: block.activityName,
        detail: `Must start at its explicit time ${activity.fixedStartTime}.`, date: block.scheduledDate });
      continue;
    }

    const protectedHit = day.activeProtectedRanges.find((range) => range.start < end && start < range.end);
    if (protectedHit) {
      violations.push({
        type: "PROTECTED_TIME",
        activityName: block.activityName,
        detail: `${block.startTime}–${block.endTime} on ${block.scheduledDate} overlaps protected ${protectedHit.label} time.`,
        date: block.scheduledDate,
      });
      continue;
    }

    const fits = day.freeRanges.some((range) => range.start <= start && end <= range.end);
    const absoluteConflict = block.startInstant && block.endInstant && !instantRangeIsFree(day, block.startInstant, block.endInstant);
    if (!fits || absoluteConflict) {
      // If the block overlaps the day's pristine (pre-booking) availability
      // at all, this time slot was available in principle — something else
      // (a commitment or another block) must be occupying it now, so it's a
      // conflict. Zero overlap with pristine availability means the slot
      // was never available to begin with.
      const pristineDay = pristineDays.find((d) => d.date === block.scheduledDate);
      const overlapsPristineAvailability =
        pristineDay?.freeRanges.some((range) => range.start < end && start < range.end) ?? false;
      violations.push({
        type: absoluteConflict || overlapsPristineAvailability ? "TIME_CONFLICT" : "AVAILABILITY",
        activityName: block.activityName,
        detail: absoluteConflict || overlapsPristineAvailability
          ? `${block.startTime}–${block.endTime} on ${block.scheduledDate} conflicts with another commitment or scheduled activity.`
          : `${block.startTime}–${block.endTime} on ${block.scheduledDate} is outside your available windows.`,
        date: block.scheduledDate,
      });
      continue;
    }

    const isExplicitTime = !block.commitmentId && activity?.fixedStartTime === block.startTime;
    if (isExercise && !isExplicitTime && exerciseCutoffMinutes !== null && end > exerciseCutoffMinutes) {
      violations.push({
        type: "EXERCISE_CUTOFF",
        activityName: block.activityName,
        detail: `Ends at ${block.endTime} on ${block.scheduledDate}, after your exercise cutoff.`,
        date: block.scheduledDate,
      });
      continue;
    }

    if (maxDailyMinutes !== null && day.plannedMinutes + duration > maxDailyMinutes) {
      violations.push({
        type: "MAX_DAILY_DURATION",
        activityName: block.activityName,
        detail: `Pushes ${block.scheduledDate} over your ${maxDailyMinutes}-minute daily planning cap.`,
        date: block.scheduledDate,
      });
      continue;
    }

    // Valid — consume this block's range so later blocks on the same day
    // correctly see it as booked.
    if (!day.hasRepeatedMinutes || !block.startInstant || !block.endInstant) {
      day.freeRanges = subtractRange(day.freeRanges, { start, end });
    }
    if (block.startInstant && block.endInstant) day.busyInstants.push({ start: Date.parse(block.startInstant), end: Date.parse(block.endInstant) });
    day.plannedMinutes += duration;
    if (isExercise) day.hasExerciseBlock = true;
  }

  return violations.length > 0 ? { valid: false, violations } : { valid: true };
}
