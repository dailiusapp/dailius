"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/features/planning/services/generatePlan";
import type { UpdateActivityInput, UpdateActivityResult } from "../types";

const FREQUENCY_OPTIONS = ["Daily", "3 times per week", "2 times per week", "Once per week", "Twice per month"];
const MAX_NAME_LENGTH = 60;

export async function updateActivity(input: UpdateActivityInput): Promise<UpdateActivityResult> {
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
  } else if (!input.preferredFrequency || !FREQUENCY_OPTIONS.includes(input.preferredFrequency)) {
    return { ok: false, message: "Pick how often this happens.", field: "preferredFrequency" };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("activities")
    .update({
      name,
      default_duration_minutes: input.durationMinutes,
      preferred_frequency: input.frequencyMode === "timesPerWeek" ? input.preferredFrequency : null,
      preferred_days: input.frequencyMode === "days" ? input.preferredDays : [],
      preferred_time_of_day: input.preferredTimeOfDay,
      flexible: input.flexible,
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: "Something went wrong updating that activity. Please try again." };
  }

  const { error: unlinkError } = await supabase.from("activity_goals").delete().eq("activity_id", input.id);
  if (unlinkError) {
    console.error("Failed to clear existing goal links before relinking:", unlinkError);
  } else if (input.goalIds.length > 0) {
    const { error: linkError } = await supabase
      .from("activity_goals")
      .insert(input.goalIds.map((goalId) => ({ activity_id: input.id, goal_id: goalId })));
    if (linkError) {
      console.error("Failed to relink activity to goals:", linkError);
    }
  }
  revalidatePath("/goals");

  // Any field change (name, duration, frequency, days, time-of-day,
  // flexible) can affect the schedule, so regenerate unconditionally rather
  // than trying to detect which specific fields actually changed.
  // generatePlan() already revalidates /weekly-plan and /dashboard.
  const planResult = await generatePlan();
  if (!planResult.ok) {
    console.error("Failed to regenerate plan after updating activity:", planResult.message);
  }

  return { ok: true };
}
