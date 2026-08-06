"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import type { ScheduledBlockDraft } from "../types";
import {
  EXERCISE_ACTIVITY_NAMES,
  computeFreeBlocksForWeek,
  placeOccurrenceCandidates,
  prioritizeActivities,
  seedExistingBookings,
} from "./engine";
import { dayOfWeekLabel, parseISODate, timeToMinutes, toISODate } from "./dateUtils";
import { getCurrentPlan } from "./getCurrentPlan";
import { loadEngineInputs } from "./loadEngineInputs";

const OPTION_LIMIT = 3;

export type ProposeRescheduleResult =
  | { ok: true; missedActivityName: string; missedDayLabel: string; options: ScheduledBlockDraft[] }
  | { ok: false; message: string };

export async function proposeReschedule(blockId: string): Promise<ProposeRescheduleResult> {
  const user = await requireUser();

  const plan = await getCurrentPlan(user.id);
  if (!plan) {
    return { ok: false, message: "You don't have an active weekly plan yet." };
  }

  const missedBlock = plan.blocks.find((block) => block.id === blockId);
  if (!missedBlock) {
    return { ok: false, message: "That activity is no longer on your schedule." };
  }
  if (missedBlock.status !== "scheduled") {
    return { ok: false, message: `That activity has already been marked ${missedBlock.status}.` };
  }

  const todayIso = toISODate(new Date());
  if (missedBlock.scheduledDate > todayIso) {
    return { ok: false, message: "You can only report activities that have already happened." };
  }

  const missedDayLabel = dayOfWeekLabel(parseISODate(missedBlock.scheduledDate));

  const loaded = await loadEngineInputs(user.id);
  if (!loaded.ok) {
    return { ok: false, message: loaded.message };
  }
  const { input } = loaded;

  const matchedActivity = input.activities.find((activity) => activity.id === missedBlock.activityId);
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

  // computeFreeBlocksForWeek's `isPast` is date-only — it has no concept of
  // the current clock time, so today's date is never "past" even mid-day.
  // Left alone, a same-day miss report would free up the slot it just
  // vacated and immediately re-offer that same now-empty slot as an option,
  // reproducing the same-day/same-time no-op bug. Until the engine is
  // time-of-day aware, today is simply not a valid candidate for a
  // same-day replan.
  if (missedBlock.scheduledDate === todayIso) {
    const today = days.find((day) => day.date === todayIso);
    if (today) today.freeRanges = [];
  }

  const [resolved] = prioritizeActivities({ ...input, activities: [matchedActivity] });

  const latestExerciseConstraint = input.constraints.find((c) => c.type === "latest_exercise_time");
  const exerciseCutoffMinutes = latestExerciseConstraint ? timeToMinutes(latestExerciseConstraint.value) : null;
  const maxDailyMinutes = input.availability.maxDailyPlanningMinutes;

  const options = placeOccurrenceCandidates(resolved, days, 0, exerciseCutoffMinutes, maxDailyMinutes, OPTION_LIMIT);

  if (options.length === 0) {
    return {
      ok: false,
      message: `We couldn't find any available slot to reschedule ${matchedActivity.name} this week.`,
    };
  }

  return { ok: true, missedActivityName: matchedActivity.name, missedDayLabel, options };
}
