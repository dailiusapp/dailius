"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_ONBOARDING_DATA, type OnboardingData } from "../types";

export async function saveOnboardingProgress(step: number, data: OnboardingData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("onboarding_progress").upsert({
    user_id: user.id,
    current_step: step,
    data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function getOnboardingProgress(): Promise<{ step: number; data: OnboardingData }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("onboarding_progress")
    .select("current_step, data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { step: 0, data: EMPTY_ONBOARDING_DATA };
  }

  return {
    step: data.current_step,
    data: { ...EMPTY_ONBOARDING_DATA, ...(data.data as Partial<OnboardingData>) },
  };
}

export async function completeOnboarding(data: OnboardingData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  for (const goal of data.goals) {
    const { data: goalRow, error: goalError } = await supabase
      .from("goals")
      .insert({ user_id: user.id, title: goal.label, priority: goal.priority })
      .select("id")
      .single();
    if (goalError) throw goalError;

    const { data: activityRow, error: activityError } = await supabase
      .from("activities")
      .insert({
        user_id: user.id,
        name: goal.label,
        default_duration_minutes: 30,
        preferred_frequency: goal.frequency,
      })
      .select("id")
      .single();
    if (activityError) throw activityError;

    const { error: linkError } = await supabase
      .from("activity_goals")
      .insert({ activity_id: activityRow.id, goal_id: goalRow.id });
    if (linkError) throw linkError;
  }

  if (data.activities.length > 0) {
    const { error } = await supabase.from("activities").insert(
      data.activities.map((activity) => ({
        user_id: user.id,
        name: activity.name,
        default_duration_minutes: activity.durationMinutes,
        preferred_days: activity.preferredDays,
        preferred_time_of_day: activity.preferredTimeOfDay,
        flexible: activity.flexible,
        enabled: true,
      })),
    );
    if (error) throw error;
  }

  const availability = data.availability;
  const { error: availabilityError } = await supabase.from("availability").upsert({
    user_id: user.id,
    weekday_morning_start: availability.weekdayMorning?.start ?? null,
    weekday_morning_end: availability.weekdayMorning?.end ?? null,
    weekday_afternoon_start: availability.weekdayAfternoon?.start ?? null,
    weekday_afternoon_end: availability.weekdayAfternoon?.end ?? null,
    weekday_evening_start: availability.weekdayEvening?.start ?? null,
    weekday_evening_end: availability.weekdayEvening?.end ?? null,
    weekend_morning_start: availability.weekendMorning?.start ?? null,
    weekend_morning_end: availability.weekendMorning?.end ?? null,
    weekend_afternoon_start: availability.weekendAfternoon?.start ?? null,
    weekend_afternoon_end: availability.weekendAfternoon?.end ?? null,
    weekend_evening_start: availability.weekendEvening?.start ?? null,
    weekend_evening_end: availability.weekendEvening?.end ?? null,
    max_daily_planning_minutes: availability.maxDailyPlanningMinutes,
    updated_at: new Date().toISOString(),
  });
  if (availabilityError) throw availabilityError;

  const constraintRows: { user_id: string; type: string; value: string }[] = [];
  if (data.preferences.avoidSchedulingAfter) {
    constraintRows.push({
      user_id: user.id,
      type: "latest_exercise_time",
      value: data.preferences.avoidSchedulingAfter,
    });
  }
  for (const protectedTime of data.preferences.protectedTimes) {
    constraintRows.push({ user_id: user.id, type: "protected_time", value: protectedTime });
  }
  if (constraintRows.length > 0) {
    const { error } = await supabase.from("scheduling_constraints").insert(constraintRows);
    if (error) throw error;
  }

  const preferenceRows: { user_id: string; type: string; value: string }[] = [];
  if (data.preferences.preferredWorkoutLengthMinutes) {
    preferenceRows.push({
      user_id: user.id,
      type: "preferred_workout_length",
      value: String(data.preferences.preferredWorkoutLengthMinutes),
    });
  }
  if (data.preferences.planningStyle) {
    preferenceRows.push({
      user_id: user.id,
      type: "planning_style",
      value: data.preferences.planningStyle,
    });
  }
  if (preferenceRows.length > 0) {
    const { error } = await supabase.from("preferences").insert(preferenceRows);
    if (error) throw error;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);
  if (profileError) throw profileError;

  const { error: clearError } = await supabase
    .from("onboarding_progress")
    .delete()
    .eq("user_id", user.id);
  if (clearError) throw clearError;
}
