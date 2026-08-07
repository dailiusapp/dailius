import type {
  ActivityInput,
  AvailabilityInput,
  EngineInput,
  EngineResult,
  GoalInput,
  GoalPriority,
  ScheduledBlockDraft,
} from "../types";
import { addDays, dayOfWeekLabel, getWeekStart, isWeekend, minutesToTime, timeToMinutes, toISODate } from "./dateUtils";
import { buildRationale, type PlacementReason } from "./rationale";

// Built from GoalsStep.tsx's GOAL_OPTIONS and RecurringActivitiesStep.tsx's
// ACTIVITY_OPTIONS — the subset that reads as physical exercise. No
// `category` field exists on activities yet, so this name-keyword match is
// the pragmatic first-pass classifier; a real fix is adding a category
// field to onboarding in a later pass.
export const EXERCISE_ACTIVITY_NAMES = new Set(
  ["Running", "Cycling", "Strength Training", "Walking", "Gym", "Soccer"].map((name) => name.toLowerCase()),
);

// Matches GoalsStep.tsx's FREQUENCY_OPTIONS exactly. Unknown/future values
// default to 1 weekly occurrence.
export const FREQUENCY_TO_WEEKLY_COUNT: Record<string, number> = {
  Daily: 7,
  "3 times per week": 3,
  "2 times per week": 2,
  "Once per week": 1,
  // No cross-week memory exists (Plan Version is out of scope this pass),
  // so alternating weeks isn't possible — rounding up is the safer
  // deterministic choice and is explainable via rationale.
  "Twice per month": 1,
};

const DEFAULT_ACTIVITY_DURATION_MINUTES = 30;

type MinuteRange = { start: number; end: number };

type ProtectedRange = { label: string; start: number; end: number };

type DayPlan = {
  date: string;
  dayLabel: string;
  isWeekend: boolean;
  isPast: boolean;
  freeRanges: MinuteRange[];
  plannedMinutes: number;
  hasExerciseBlock: boolean;
  activeProtectedRanges: ProtectedRange[];
};

// scheduling_constraints.value for type="protected_time" is a free-text
// label from PreferencesStep.tsx's fixed PROTECT_OPTIONS, not a time
// range, so this lookup maps each known label to a concrete range. Labels
// with no entry here (e.g. "Personal Time") are stored but have no engine
// effect yet — a documented limitation, not a bug.
const PROTECTED_TIME_RULES: Record<string, { scope: "all" | "weekdays"; ranges: MinuteRange[] }> = {
  Sleep: { scope: "all", ranges: [{ start: 22 * 60, end: 24 * 60 }, { start: 0, end: 6 * 60 }] },
  "Family Dinner": { scope: "all", ranges: [{ start: 18 * 60, end: 19 * 60 }] },
  "School Pickup": { scope: "weekdays", ranges: [{ start: 15 * 60, end: 15 * 60 + 30 }] },
};

const TIME_OF_DAY_BOUNDS: Record<string, MinuteRange> = {
  Morning: { start: 0, end: 12 * 60 },
  Afternoon: { start: 12 * 60, end: 17 * 60 },
  Evening: { start: 17 * 60, end: 24 * 60 },
};

const PRIORITY_RANK: Record<GoalPriority, number> = { high: 3, medium: 2, low: 1 };

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

function windowsForDay(availability: AvailabilityInput, weekend: boolean): MinuteRange[] {
  const morning = weekend ? availability.weekendMorning : availability.weekdayMorning;
  const afternoon = weekend ? availability.weekendAfternoon : availability.weekdayAfternoon;
  const evening = weekend ? availability.weekendEvening : availability.weekdayEvening;
  return [morning, afternoon, evening]
    .filter((range): range is NonNullable<typeof range> => range !== null)
    .map((range) => ({ start: timeToMinutes(range.start), end: timeToMinutes(range.end) }));
}

export function computeFreeBlocksForWeek(input: EngineInput): DayPlan[] {
  const weekStartDate = getWeekStart(input.today);
  const todayIso = toISODate(input.today);
  const protectedLabels = new Set(
    input.constraints.filter((constraint) => constraint.type === "protected_time").map((c) => c.value),
  );

  const days: DayPlan[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStartDate, i);
    const iso = toISODate(date);
    const dayLabel = dayOfWeekLabel(date);
    const weekend = isWeekend(date);
    const isPast = iso < todayIso;

    let freeRanges: MinuteRange[] = [];
    const activeProtectedRanges: ProtectedRange[] = [];

    if (!isPast) {
      if (dayLabel === "Sun" && protectedLabels.has("Sunday Rest")) {
        freeRanges = [];
      } else {
        freeRanges = windowsForDay(input.availability, weekend);
        for (const label of protectedLabels) {
          const rule = PROTECTED_TIME_RULES[label];
          if (!rule || (rule.scope === "weekdays" && weekend)) continue;
          for (const range of rule.ranges) {
            freeRanges = subtractRange(freeRanges, range);
            activeProtectedRanges.push({ label, start: range.start, end: range.end });
          }
        }
        freeRanges.sort((a, b) => a.start - b.start);
      }
    }

    days.push({
      date: iso,
      dayLabel,
      isWeekend: weekend,
      isPast,
      freeRanges,
      plannedMinutes: 0,
      hasExerciseBlock: false,
      activeProtectedRanges,
    });
  }

  return days;
}

// Seeds a `days` array (from `computeFreeBlocksForWeek`) with time already
// occupied by blocks the caller already knows about — used by targeted
// single-activity replanning, where the week isn't blank the way it is for
// a full `generateWeeklySchedule` run. Mutates `days` in place, same as
// `placeOccurrence`.
export function seedExistingBookings(
  days: DayPlan[],
  bookings: { scheduledDate: string; startTime: string; endTime: string; isExercise: boolean }[],
): void {
  for (const booking of bookings) {
    const day = days.find((d) => d.date === booking.scheduledDate);
    if (!day) continue;

    const range = { start: timeToMinutes(booking.startTime), end: timeToMinutes(booking.endTime) };
    day.freeRanges = subtractRange(day.freeRanges, range);
    day.plannedMinutes += range.end - range.start;
    if (booking.isExercise) day.hasExerciseBlock = true;
  }
}

type ResolvedActivity = {
  activity: ActivityInput;
  priority: GoalPriority;
  linkedGoalTitle: string | null;
  weeklyCount: number;
  durationMinutes: number;
  isExercise: boolean;
};

export function prioritizeActivities(input: EngineInput): ResolvedActivity[] {
  const goalsById = new Map<string, GoalInput>(input.goals.map((goal) => [goal.id, goal]));
  const workoutLengthPreference = input.preferences.find((p) => p.type === "preferred_workout_length");

  const resolved: ResolvedActivity[] = input.activities.map((activity) => {
    const linkedGoals = activity.goalIds
      .map((id) => goalsById.get(id))
      .filter((goal): goal is GoalInput => Boolean(goal));

    const topGoal =
      linkedGoals.length > 0
        ? linkedGoals.reduce((best, goal) => (PRIORITY_RANK[goal.priority] > PRIORITY_RANK[best.priority] ? goal : best))
        : null;

    const priority: GoalPriority = topGoal?.priority ?? "medium";
    const isExercise = EXERCISE_ACTIVITY_NAMES.has(activity.name.trim().toLowerCase());

    const weeklyCount =
      activity.preferredDays.length > 0
        ? activity.preferredDays.length
        : FREQUENCY_TO_WEEKLY_COUNT[activity.preferredFrequency ?? ""] ?? 1;

    const durationMinutes =
      activity.defaultDurationMinutes ??
      (isExercise && workoutLengthPreference
        ? Number(workoutLengthPreference.value)
        : DEFAULT_ACTIVITY_DURATION_MINUTES);

    return {
      activity,
      priority,
      linkedGoalTitle: topGoal?.title ?? null,
      weeklyCount,
      durationMinutes,
      isExercise,
    };
  });

  resolved.sort((a, b) => {
    if (PRIORITY_RANK[b.priority] !== PRIORITY_RANK[a.priority]) {
      return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    }
    const aConstrained = a.activity.preferredDays.length > 0 || !a.activity.flexible;
    const bConstrained = b.activity.preferredDays.length > 0 || !b.activity.flexible;
    if (aConstrained !== bConstrained) return aConstrained ? -1 : 1;
    return a.activity.id.localeCompare(b.activity.id);
  });

  return resolved;
}

function rankDaysByBalance(days: DayPlan[], isExercise: boolean): DayPlan[] {
  return [...days].sort((a, b) => {
    if (isExercise && a.hasExerciseBlock !== b.hasExerciseBlock) {
      return a.hasExerciseBlock ? 1 : -1;
    }
    return a.plannedMinutes - b.plannedMinutes || a.date.localeCompare(b.date);
  });
}

function candidateDaysForOccurrence(
  resolved: ResolvedActivity,
  occurrenceIndex: number,
  days: DayPlan[],
): DayPlan[] {
  const { activity, isExercise } = resolved;

  if (activity.preferredDays.length > 0) {
    const targetLabel = activity.preferredDays[occurrenceIndex % activity.preferredDays.length];
    const targetDay = days.find((day) => day.dayLabel === targetLabel);
    const preferredFirst = targetDay ? [targetDay] : [];

    if (!activity.flexible) {
      return preferredFirst;
    }

    const rest = rankDaysByBalance(days, isExercise).filter((day) => day.dayLabel !== targetLabel);
    return [...preferredFirst, ...rest];
  }

  return rankDaysByBalance(days, isExercise);
}

function rangeMidpoint(range: MinuteRange): number {
  return (range.start + range.end) / 2;
}

// Ranges actually overlapping the preferred window always come first. When
// none do (that window is fully booked, protected, or was never configured
// as available), the remaining ranges are tried in order of how close they
// are to the preferred window rather than their arbitrary original order —
// otherwise a fallback always lands in whichever window happens to be
// listed first (morning), even when a closer, equally-free window (e.g.
// evening, for an "Afternoon" preference) is available.
function orderRangesByPreference(ranges: MinuteRange[], preferredTimeOfDay: string | null): MinuteRange[] {
  if (!preferredTimeOfDay || !TIME_OF_DAY_BOUNDS[preferredTimeOfDay]) return ranges;
  const bounds = TIME_OF_DAY_BOUNDS[preferredTimeOfDay];
  const preferredCenter = rangeMidpoint(bounds);
  const matches = ranges.filter((range) => range.start < bounds.end && range.end > bounds.start);
  const rest = [...ranges.filter((range) => !(range.start < bounds.end && range.end > bounds.start))].sort(
    (a, b) => Math.abs(rangeMidpoint(a) - preferredCenter) - Math.abs(rangeMidpoint(b) - preferredCenter),
  );
  return [...matches, ...rest];
}

function findSlotInDay(
  day: DayPlan,
  durationMinutes: number,
  preferredTimeOfDay: string | null,
  isExercise: boolean,
  exerciseCutoffMinutes: number | null,
  maxDailyMinutes: number | null,
): { slot: MinuteRange; matchedPreferredTime: boolean } | null {
  if (day.isPast) return null;
  if (maxDailyMinutes !== null && day.plannedMinutes + durationMinutes > maxDailyMinutes) return null;

  const cutoff = isExercise && exerciseCutoffMinutes !== null ? exerciseCutoffMinutes : null;
  const bounds = preferredTimeOfDay ? TIME_OF_DAY_BOUNDS[preferredTimeOfDay] : null;
  const orderedRanges = orderRangesByPreference(day.freeRanges, preferredTimeOfDay);

  for (const range of orderedRanges) {
    const effectiveEnd = cutoff !== null ? Math.min(range.end, cutoff) : range.end;
    if (effectiveEnd - range.start >= durationMinutes) {
      const slot = { start: range.start, end: range.start + durationMinutes };
      const matchedPreferredTime = !bounds || (slot.start < bounds.end && slot.end > bounds.start);
      return { slot, matchedPreferredTime };
    }
  }
  return null;
}

function findNearbyProtectedLabel(day: DayPlan, slot: MinuteRange): string | null {
  const PROXIMITY_MINUTES = 60;
  const nearby = day.activeProtectedRanges.find(
    (range) => Math.abs(range.start - slot.end) <= PROXIMITY_MINUTES || Math.abs(slot.start - range.end) <= PROXIMITY_MINUTES,
  );
  return nearby?.label ?? null;
}

export function placeOccurrence(
  resolved: ResolvedActivity,
  occurrenceIndex: number,
  days: DayPlan[],
  exerciseCutoffMinutes: number | null,
  maxDailyMinutes: number | null,
): ScheduledBlockDraft | null {
  const { activity, durationMinutes, isExercise, linkedGoalTitle } = resolved;
  const candidates = candidateDaysForOccurrence(resolved, occurrenceIndex, days);

  const durationsToTry = [durationMinutes];
  if (activity.minimumDurationMinutes && activity.minimumDurationMinutes < durationMinutes) {
    durationsToTry.push(activity.minimumDurationMinutes);
  }

  for (const wantedDuration of durationsToTry) {
    for (const day of candidates) {
      const found = findSlotInDay(
        day,
        wantedDuration,
        activity.preferredTimeOfDay,
        isExercise,
        exerciseCutoffMinutes,
        maxDailyMinutes,
      );
      if (!found) continue;
      const { slot, matchedPreferredTime } = found;

      day.freeRanges = subtractRange(day.freeRanges, slot);
      day.plannedMinutes += wantedDuration;
      if (isExercise) day.hasExerciseBlock = true;

      const matchedPreferredDay = activity.preferredDays.includes(day.dayLabel);
      const placementReason: PlacementReason =
        activity.preferredDays.length === 0 ? "balance" : matchedPreferredDay ? "preferred-day" : "fallback-from-preferred-day";

      const rationale = buildRationale({
        activityName: activity.name,
        dayLabel: day.dayLabel,
        placementReason,
        linkedGoalTitle,
        cutoffTime: isExercise && exerciseCutoffMinutes !== null ? minutesToTime(exerciseCutoffMinutes) : null,
        protectedLabel: findNearbyProtectedLabel(day, slot),
        shortenedToMinutes: wantedDuration < durationMinutes ? wantedDuration : null,
        preferredTimeOfDay: !matchedPreferredTime ? activity.preferredTimeOfDay : null,
      });

      return {
        activityId: activity.id,
        activityName: activity.name,
        scheduledDate: day.date,
        startTime: minutesToTime(slot.start),
        endTime: minutesToTime(slot.end),
        rationale,
      };
    }
  }

  return null;
}

// Non-mutating sibling of `placeOccurrence`, used to propose several
// alternative slots (e.g. for a user to pick from) instead of committing to
// one. Unlike `placeOccurrence`, it never writes to `days` — every
// candidate is evaluated against the same free/busy snapshot rather than
// sequential placement into a shrinking pool — and it returns at most one
// slot per candidate day (up to `limit` days), trying the duration fallback
// within each day before moving to the next, which is the right order for
// "here are your options" rather than "here is the one placement."
export function placeOccurrenceCandidates(
  resolved: ResolvedActivity,
  days: DayPlan[],
  occurrenceIndex: number,
  exerciseCutoffMinutes: number | null,
  maxDailyMinutes: number | null,
  limit: number,
): ScheduledBlockDraft[] {
  const { activity, durationMinutes, isExercise, linkedGoalTitle } = resolved;
  const candidates = candidateDaysForOccurrence(resolved, occurrenceIndex, days);

  const durationsToTry = [durationMinutes];
  if (activity.minimumDurationMinutes && activity.minimumDurationMinutes < durationMinutes) {
    durationsToTry.push(activity.minimumDurationMinutes);
  }

  const results: ScheduledBlockDraft[] = [];

  for (const day of candidates) {
    if (results.length >= limit) break;

    for (const wantedDuration of durationsToTry) {
      const found = findSlotInDay(
        day,
        wantedDuration,
        activity.preferredTimeOfDay,
        isExercise,
        exerciseCutoffMinutes,
        maxDailyMinutes,
      );
      if (!found) continue;
      const { slot, matchedPreferredTime } = found;

      const matchedPreferredDay = activity.preferredDays.includes(day.dayLabel);
      const placementReason: PlacementReason =
        activity.preferredDays.length === 0 ? "balance" : matchedPreferredDay ? "preferred-day" : "fallback-from-preferred-day";

      const rationale = buildRationale({
        activityName: activity.name,
        dayLabel: day.dayLabel,
        placementReason,
        linkedGoalTitle,
        cutoffTime: isExercise && exerciseCutoffMinutes !== null ? minutesToTime(exerciseCutoffMinutes) : null,
        protectedLabel: findNearbyProtectedLabel(day, slot),
        shortenedToMinutes: wantedDuration < durationMinutes ? wantedDuration : null,
        preferredTimeOfDay: !matchedPreferredTime ? activity.preferredTimeOfDay : null,
      });

      results.push({
        activityId: activity.id,
        activityName: activity.name,
        scheduledDate: day.date,
        startTime: minutesToTime(slot.start),
        endTime: minutesToTime(slot.end),
        rationale,
      });
      break;
    }
  }

  return results;
}

export function placeActivities(
  input: EngineInput,
  days: DayPlan[],
  resolvedActivities: ResolvedActivity[],
): { blocks: ScheduledBlockDraft[]; unplacedCount: number } {
  const blocks: ScheduledBlockDraft[] = [];
  let unplacedCount = 0;

  const latestExerciseConstraint = input.constraints.find((c) => c.type === "latest_exercise_time");
  const exerciseCutoffMinutes = latestExerciseConstraint ? timeToMinutes(latestExerciseConstraint.value) : null;
  const maxDailyMinutes = input.availability.maxDailyPlanningMinutes;

  for (const resolved of resolvedActivities) {
    for (let occurrence = 0; occurrence < resolved.weeklyCount; occurrence++) {
      const placed = placeOccurrence(resolved, occurrence, days, exerciseCutoffMinutes, maxDailyMinutes);
      if (placed) {
        blocks.push(placed);
      } else {
        unplacedCount++;
      }
    }
  }

  return { blocks, unplacedCount };
}

export function generateWeeklySchedule(input: EngineInput): EngineResult {
  const days = computeFreeBlocksForWeek(input);
  seedExistingBookings(
    days,
    input.commitments.map((commitment) => ({
      scheduledDate: commitment.scheduledDate,
      startTime: commitment.startTime,
      endTime: commitment.endTime,
      isExercise: false,
    })),
  );
  const resolvedActivities = prioritizeActivities(input);
  const { blocks, unplacedCount } = placeActivities(input, days, resolvedActivities);

  return {
    weekStart: toISODate(getWeekStart(input.today)),
    blocks,
    unplacedCount,
  };
}
