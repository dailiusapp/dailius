"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { getGoalsForUser } from "@/features/goals/services/getGoalsForUser";
import type { GetActivityForEditResult } from "../types";

export async function getActivityForEdit(activityId: string): Promise<GetActivityForEditResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: activity, error } = await supabase
    .from("activities")
    .select(
      "id, name, default_duration_minutes, preferred_frequency, preferred_days, preferred_time_of_day, flexible",
    )
    .eq("id", activityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Something went wrong loading that activity. Please try again." };
  }
  if (!activity) {
    return { ok: false, message: "That activity couldn't be found." };
  }

  const { data: goalLinks, error: goalLinksError } = await supabase
    .from("activity_goals")
    .select("goal_id")
    .eq("activity_id", activityId);

  if (goalLinksError) {
    return { ok: false, message: "Something went wrong loading that activity. Please try again." };
  }

  const preferredDays = activity.preferred_days ?? [];
  const goals = await getGoalsForUser(user.id, { status: "active" });

  return {
    ok: true,
    activity: {
      id: activity.id,
      name: activity.name,
      durationMinutes: activity.default_duration_minutes ?? 60,
      frequencyMode: preferredDays.length > 0 ? "days" : "timesPerWeek",
      preferredDays,
      preferredFrequency: activity.preferred_frequency,
      preferredTimeOfDay: activity.preferred_time_of_day,
      flexible: activity.flexible,
      goalIds: (goalLinks ?? []).map((link) => link.goal_id),
    },
    goals,
  };
}
