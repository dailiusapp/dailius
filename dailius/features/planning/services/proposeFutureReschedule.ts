"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import type { ActivityInput, ScheduledBlockDraft } from "../types";
import {
  EXERCISE_ACTIVITY_NAMES,
  computeFreeBlocksForWeek,
  placeOccurrenceCandidates,
  prioritizeActivities,
  seedExistingBookings,
} from "./engine";
import { dayOfWeekLabel, parseISODate, timeToMinutes, toISODate, todayInTimezone } from "./dateUtils";
import { getCurrentPlan } from "./getCurrentPlan";
import { loadEngineInputs } from "./loadEngineInputs";
import { getUserTimezone } from "@/features/auth/services/getUserTimezone";

const OPTION_LIMIT = 3;

export type ProposeFutureRescheduleResult =
  | { ok: true; activityName: string; currentDayLabel: string; options: ScheduledBlockDraft[] }
  | { ok: false; message: string };

export async function proposeFutureReschedule(
  blockId: string,
  targetDayLabel: string | null,
): Promise<ProposeFutureRescheduleResult> {
  const user = await requireUser();

  const plan = await getCurrentPlan(user.id);
  if (!plan) {
    return { ok: false, message: "You don't have an active weekly plan yet." };
  }

  const movingBlock = plan.blocks.find((block) => block.id === blockId);
  if (!movingBlock) {
    return { ok: false, message: "That activity is no longer on your schedule." };
  }
  if (movingBlock.status !== "scheduled") {
    return { ok: false, message: `That activity has already been marked ${movingBlock.status}.` };
  }

  const timezone = await getUserTimezone(user.id);
  const todayIso = toISODate(todayInTimezone(timezone));
  if (movingBlock.scheduledDate <= todayIso) {
    return {
      ok: false,
      message: "That activity has already happened or is today — I can only move activities later in the week right now.",
    };
  }

  const currentDayLabel = dayOfWeekLabel(parseISODate(movingBlock.scheduledDate));

  const loaded = await loadEngineInputs(user.id);
  if (!loaded.ok) {
    return { ok: false, message: loaded.message };
  }
  const { input } = loaded;

  const matchedActivity = input.activities.find((activity) => activity.id === movingBlock.activityId);
  if (!matchedActivity) {
    return { ok: false, message: "That activity no longer exists." };
  }

  const days = computeFreeBlocksForWeek(input);
  const otherBookings = plan.blocks
    .filter((block) => block.id !== blockId && (block.status === "scheduled" || block.status === "completed"))
    .map((block) => ({
      scheduledDate: block.scheduledDate,
      startTime: block.startTime,
      endTime: block.endTime,
      isExercise: EXERCISE_ACTIVITY_NAMES.has(block.activityName.trim().toLowerCase()),
    }));
  seedExistingBookings(days, otherBookings);
  seedExistingBookings(
    days,
    input.commitments.map((commitment) => ({
      scheduledDate: commitment.scheduledDate,
      startTime: commitment.startTime,
      endTime: commitment.endTime,
      isExercise: false,
    })),
  );

  // Same reasoning as proposeReschedule.ts's same-day workaround: the engine's
  // isPast is date-only with no clock-time awareness, so it can't tell
  // whether "today" has already passed. Today is never a valid destination
  // for either flow until the engine becomes time-of-day aware.
  const today = days.find((day) => day.date === todayIso);
  if (today) today.freeRanges = [];

  // If the user named a target day, bias the search toward it first while
  // still allowing fallback to other days if it's unavailable — mirrors how
  // an activity with preferredDays + flexible already behaves in the engine.
  const activityForSearch: ActivityInput = targetDayLabel
    ? { ...matchedActivity, preferredDays: [targetDayLabel], flexible: true }
    : matchedActivity;

  const [resolved] = prioritizeActivities({ ...input, activities: [activityForSearch] });

  const latestExerciseConstraint = input.constraints.find((c) => c.type === "latest_exercise_time");
  const exerciseCutoffMinutes = latestExerciseConstraint ? timeToMinutes(latestExerciseConstraint.value) : null;
  const maxDailyMinutes = input.availability.maxDailyPlanningMinutes;

  const options = placeOccurrenceCandidates(resolved, days, 0, exerciseCutoffMinutes, maxDailyMinutes, OPTION_LIMIT);

  if (options.length === 0) {
    return {
      ok: false,
      message: `We couldn't find any available slot to move ${matchedActivity.name} to this week.`,
    };
  }

  return { ok: true, activityName: matchedActivity.name, currentDayLabel, options };
}
