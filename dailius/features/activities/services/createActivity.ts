"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { getUserTimezone } from "@/features/auth/services/getUserTimezone";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/features/planning/services/generatePlan";
import { localDateTimeToInstant } from "@/features/planning/services/dateUtils";
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
  } else if (input.frequencyMode === "timesPerWeek") {
    if (!input.preferredFrequency || !FREQUENCY_OPTIONS.includes(input.preferredFrequency)) {
      return { ok: false, message: "Pick how often this happens.", field: "preferredFrequency" };
    }
  } else {
    if (!input.scheduledDate) {
      return { ok: false, message: "Pick a date.", field: "scheduledDate" };
    }
    if (!input.scheduledTime) {
      return { ok: false, message: "Pick a time.", field: "scheduledTime" };
    }
  }

  const user = await requireUser();
  const supabase = await createClient();

  if (input.frequencyMode === "oneTime") {
    const timezone = (await getUserTimezone(user.id)) ?? "UTC";
    const start = localDateTimeToInstant(input.scheduledDate!, input.scheduledTime!, timezone);
    // Compared here, against the user's own timezone-resolved instant,
    // rather than by parsing "${date}T${time}" as a string earlier — this
    // server runs in UTC, so a naive "local time" string parse would judge
    // the user's picked wall-clock time against the wrong clock entirely.
    if (start < new Date()) {
      return { ok: false, message: "Pick a date and time in the future.", field: "scheduledTime" };
    }
    const end = new Date(start.getTime() + input.durationMinutes * 60_000);

    const { data, error } = await supabase
      .from("commitments")
      .insert({
        user_id: user.id,
        title: name,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        timezone,
        source: "Manual",
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, message: "Something went wrong adding that activity. Please try again." };
    }

    const planResult = await generatePlan();
    if (!planResult.ok) {
      console.error("Failed to regenerate plan after adding activity:", planResult.message);
    } else {
      revalidatePath("/weekly-plan");
      revalidatePath("/dashboard");
    }

    return { ok: true, activityId: data.id };
  }

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
