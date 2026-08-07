"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/features/planning/services/generatePlan";
import type { CreateActivityInput, CreateActivityResult } from "../types";

const FREQUENCY_OPTIONS = ["Daily", "3 times per week", "2 times per week", "Once per week", "Twice per month"];
const MAX_NAME_LENGTH = 60;

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
  } else if (!input.preferredFrequency || !FREQUENCY_OPTIONS.includes(input.preferredFrequency)) {
    return { ok: false, message: "Pick how often this happens.", field: "preferredFrequency" };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .insert({
      user_id: user.id,
      name,
      default_duration_minutes: input.durationMinutes,
      preferred_frequency: input.frequencyMode === "timesPerWeek" ? input.preferredFrequency : null,
      preferred_days: input.frequencyMode === "days" ? input.preferredDays : [],
      preferred_time_of_day: input.preferredTimeOfDay,
      flexible: input.flexible,
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
  } else {
    revalidatePath("/weekly-plan");
    revalidatePath("/dashboard");
  }

  return { ok: true, activityId: data.id };
}
