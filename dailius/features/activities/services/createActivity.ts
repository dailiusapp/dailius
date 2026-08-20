"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { getUserTimezone } from "@/features/auth/services/getUserTimezone";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/features/planning/services/generatePlan";
import { toISODate, todayInTimezone } from "@/features/planning/services/dateUtils";
import { checkFixedTimeConflict } from "./checkFixedTimeConflict";
import type { CreateActivityInput, CreateActivityResult } from "../types";

const FREQUENCY_OPTIONS = ["Daily", "3 times per week", "2 times per week", "Once per week", "Twice per month"];
const MAX_NAME_LENGTH = 60;
const FIXED_TIME_PATTERN = /^([01]\d|2[0-3]):(00|15|30|45)$/;

export async function createActivity(input: CreateActivityInput): Promise<CreateActivityResult> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, message: "Give this activity a name.", field: "name" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, message: `Keep the name under ${MAX_NAME_LENGTH} characters.`, field: "name" };
  }

  if (input.frequencyMode === "days") {
    if (input.preferredDays.length === 0) {
      return { ok: false, message: "Pick at least one day.", field: "preferredDays" };
    }
  } else if (input.frequencyMode === "timesPerWeek") {
    if (!input.preferredFrequency || !FREQUENCY_OPTIONS.includes(input.preferredFrequency)) {
      return { ok: false, message: "Pick how often this happens.", field: "preferredFrequency" };
    }
  } else if (!input.oneTimeDate) {
    return { ok: false, message: "Pick a date.", field: "oneTimeDate" };
  }

  if (input.fixedStartTime && !FIXED_TIME_PATTERN.test(input.fixedStartTime)) {
    return { ok: false, message: "Pick a valid time.", field: "fixedStartTime" };
  }

  const user = await requireUser();
  const timezone = (await getUserTimezone(user.id)) ?? "UTC";
  const supabase = await createClient();

  if (input.frequencyMode === "oneTime") {
    const today = toISODate(todayInTimezone(timezone));
    if (input.oneTimeDate! < today) {
      return { ok: false, message: "Pick a date in the future.", field: "oneTimeDate" };
    }
  }

  const activityId = crypto.randomUUID();
  if (input.fixedStartTime) {
    const conflict = await checkFixedTimeConflict(user.id, {
      id: activityId,
      name,
      defaultDurationMinutes: input.durationMinutes,
      preferredFrequency: input.frequencyMode === "timesPerWeek" ? input.preferredFrequency : null,
      preferredDays: input.frequencyMode === "days" ? input.preferredDays : [],
      preferredTimeOfDay: input.preferredTimeOfDay,
      minimumDurationMinutes: null,
      maximumDurationMinutes: null,
      flexible: input.flexible,
      goalIds: input.goalIds,
      fixedStartTime: input.fixedStartTime,
      oneTimeDate: input.frequencyMode === "oneTime" ? input.oneTimeDate : null,
    });
    if (!conflict.ok) {
      return { ok: false, message: conflict.message, field: "fixedStartTime" };
    }
  }

  const { data, error } = await supabase
    .from("activities")
    .insert({
      id: activityId,
      user_id: user.id,
      name,
      default_duration_minutes: input.durationMinutes,
      preferred_frequency: input.frequencyMode === "timesPerWeek" ? input.preferredFrequency : null,
      preferred_days: input.frequencyMode === "days" ? input.preferredDays : [],
      preferred_time_of_day: input.preferredTimeOfDay,
      flexible: input.flexible,
      fixed_start_time: input.fixedStartTime,
      one_time_date: input.frequencyMode === "oneTime" ? input.oneTimeDate : null,
      enabled: true,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: "Something went wrong adding that activity. Please try again." };
  }

  if (input.goalIds.length > 0) {
    const { error: linkError } = await supabase
      .from("activity_goals")
      .insert(input.goalIds.map((goalId) => ({ activity_id: data.id, goal_id: goalId })));

    if (linkError) {
      console.error("Failed to link new activity to goals:", linkError);
    } else {
      revalidatePath("/goals");
    }
  }

  // Reflect the new activity in the schedule right away rather than leaving
  // it as an input the user won't see until they separately regenerate.
  const planResult = await generatePlan();
  if (!planResult.ok) {
    console.error("Failed to regenerate plan after adding activity:", planResult.message);
  }

  return { ok: true, activityId: data.id };
}
