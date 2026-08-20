"use server";

import { loadEngineInputs } from "@/features/planning/services/loadEngineInputs";
import { generateWeeklySchedule } from "@/features/planning/services/engine";
import { addDays, getWeekStart, toISODate } from "@/features/planning/services/dateUtils";
import type { ActivityInput } from "@/features/planning/types";

export type CheckFixedTimeConflictResult = { ok: true } | { ok: false; message: string };

// Reuses the deterministic engine as its own conflict validator (mirrors
// how planningValidator.ts already reuses engine building blocks) rather
// than writing a second free/busy-checking code path. Only meaningful when
// candidate.fixedStartTime is set — callers should skip calling this
// otherwise.
//
// Scoped to the current week's window only: commitments never extend
// beyond it (see loadEngineInputs.ts), and a "days"/"oneTime" fixed-time
// conflict recurs identically every week, so checking this week is
// equivalent to checking every future week for those modes. The one known
// gap is "timesPerWeek" activities, whose day floats week to week — an
// accepted risk (see the plan's decision on this), surfaced later via the
// regeneration warning if it ever actually collides.
export async function checkFixedTimeConflict(userId: string, candidate: ActivityInput): Promise<CheckFixedTimeConflictResult> {
  if (!candidate.fixedStartTime) {
    return { ok: true };
  }

  const loaded = await loadEngineInputs(userId);
  if (!loaded.ok) {
    return { ok: false, message: loaded.message };
  }

  if (candidate.oneTimeDate) {
    const weekStart = toISODate(getWeekStart(loaded.input.today));
    const weekEnd = toISODate(addDays(getWeekStart(loaded.input.today), 7));
    if (candidate.oneTimeDate < weekStart || candidate.oneTimeDate >= weekEnd) {
      // Outside the window the engine can currently reason about — nothing
      // to check yet. It'll be validated for real once that week's plan is
      // generated (surfaced via the unplaced-fixed-time-activity warning if
      // it turns out to collide with something).
      return { ok: true };
    }
  }

  const activities = loaded.input.activities.some((activity) => activity.id === candidate.id)
    ? loaded.input.activities.map((activity) => (activity.id === candidate.id ? candidate : activity))
    : [...loaded.input.activities, candidate];

  const result = generateWeeklySchedule({ ...loaded.input, activities });
  const placedAtExactTime = result.blocks.some(
    (block) => block.activityId === candidate.id && block.startTime === candidate.fixedStartTime,
  );

  if (!placedAtExactTime) {
    return {
      ok: false,
      message: "That time conflicts with an existing commitment or another fixed-time activity.",
    };
  }

  return { ok: true };
}
