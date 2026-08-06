import { createClient } from "@/lib/supabase/server";
import type { ActivityInput, AvailabilityInput, CommitmentInput, EngineInput, GoalInput } from "../types";
import { addDays, getWeekStart, timeFromDate, toISODate } from "./dateUtils";

const GENERIC_ERROR_MESSAGE = "Something went wrong loading your planning data. Please try again.";

export async function loadEngineInputs(
  userId: string,
): Promise<{ ok: true; input: EngineInput } | { ok: false; message: string }> {
  const supabase = await createClient();

  const weekStart = getWeekStart(new Date());
  const weekEnd = addDays(weekStart, 7);

  const [goalsRes, activitiesRes, constraintsRes, preferencesRes, availabilityRes, commitmentsRes] =
    await Promise.all([
      supabase.from("goals").select("id, title, priority").eq("user_id", userId).eq("status", "active"),
      supabase
        .from("activities")
        .select(
          "id, name, default_duration_minutes, preferred_frequency, preferred_days, preferred_time_of_day, minimum_duration_minutes, maximum_duration_minutes, flexible",
        )
        .eq("user_id", userId)
        .eq("enabled", true),
      supabase.from("scheduling_constraints").select("type, value").eq("user_id", userId).eq("enabled", true),
      supabase.from("preferences").select("type, value").eq("user_id", userId),
      supabase
        .from("availability")
        .select(
          "weekday_morning_start, weekday_morning_end, weekday_afternoon_start, weekday_afternoon_end, weekday_evening_start, weekday_evening_end, weekend_morning_start, weekend_morning_end, weekend_afternoon_start, weekend_afternoon_end, weekend_evening_start, weekend_evening_end, max_daily_planning_minutes",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("commitments")
        .select("title, start_time, end_time")
        .eq("user_id", userId)
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", weekEnd.toISOString()),
    ]);

  for (const res of [goalsRes, activitiesRes, constraintsRes, preferencesRes, availabilityRes, commitmentsRes]) {
    if (res.error) {
      console.error("Failed to load planning inputs:", res.error);
      return { ok: false, message: GENERIC_ERROR_MESSAGE };
    }
  }

  const availabilityRow = availabilityRes.data;
  const hasAnyAvailability =
    availabilityRow &&
    [
      availabilityRow.weekday_morning_start,
      availabilityRow.weekday_afternoon_start,
      availabilityRow.weekday_evening_start,
      availabilityRow.weekend_morning_start,
      availabilityRow.weekend_afternoon_start,
      availabilityRow.weekend_evening_start,
    ].some((value) => value !== null);

  if (!hasAnyAvailability) {
    return {
      ok: false,
      message: "We couldn't load your planning data because your availability is missing.",
    };
  }

  const goals: GoalInput[] = (goalsRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    priority: row.priority as GoalInput["priority"],
  }));
  const activityRows = activitiesRes.data ?? [];

  if (goals.length === 0 && activityRows.length === 0) {
    return {
      ok: false,
      message: "We couldn't load your planning data because you haven't added any goals or activities yet.",
    };
  }

  const activityIds = activityRows.map((row) => row.id);
  const activityGoalsRes =
    activityIds.length > 0
      ? await supabase.from("activity_goals").select("activity_id, goal_id").in("activity_id", activityIds)
      : { data: [], error: null };

  if (activityGoalsRes.error) {
    console.error("Failed to load activity-goal links:", activityGoalsRes.error);
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  const goalIdsByActivity = new Map<string, string[]>();
  for (const link of activityGoalsRes.data ?? []) {
    const existing = goalIdsByActivity.get(link.activity_id) ?? [];
    existing.push(link.goal_id);
    goalIdsByActivity.set(link.activity_id, existing);
  }

  const activities: ActivityInput[] = activityRows.map((row) => ({
    id: row.id,
    name: row.name,
    defaultDurationMinutes: row.default_duration_minutes,
    preferredFrequency: row.preferred_frequency,
    preferredDays: row.preferred_days ?? [],
    preferredTimeOfDay: row.preferred_time_of_day,
    minimumDurationMinutes: row.minimum_duration_minutes,
    maximumDurationMinutes: row.maximum_duration_minutes,
    flexible: row.flexible,
    goalIds: goalIdsByActivity.get(row.id) ?? [],
  }));

  const toRange = (start: string | null, end: string | null) => (start && end ? { start, end } : null);
  const availability: AvailabilityInput = {
    weekdayMorning: toRange(availabilityRow.weekday_morning_start, availabilityRow.weekday_morning_end),
    weekdayAfternoon: toRange(availabilityRow.weekday_afternoon_start, availabilityRow.weekday_afternoon_end),
    weekdayEvening: toRange(availabilityRow.weekday_evening_start, availabilityRow.weekday_evening_end),
    weekendMorning: toRange(availabilityRow.weekend_morning_start, availabilityRow.weekend_morning_end),
    weekendAfternoon: toRange(availabilityRow.weekend_afternoon_start, availabilityRow.weekend_afternoon_end),
    weekendEvening: toRange(availabilityRow.weekend_evening_start, availabilityRow.weekend_evening_end),
    maxDailyPlanningMinutes: availabilityRow.max_daily_planning_minutes,
  };

  // Same-day-only defensive filter, mirroring syncGoogleCalendarEvents.ts —
  // the engine's MinuteRange model has no concept of a commitment spanning
  // more than one calendar day.
  const commitments: CommitmentInput[] = (commitmentsRes.data ?? [])
    .map((row) => ({ title: row.title, start: new Date(row.start_time), end: new Date(row.end_time) }))
    .filter((row) => toISODate(row.start) === toISODate(row.end))
    .map((row) => ({
      title: row.title,
      scheduledDate: toISODate(row.start),
      startTime: timeFromDate(row.start),
      endTime: timeFromDate(row.end),
    }));

  return {
    ok: true,
    input: {
      today: new Date(),
      goals,
      activities,
      constraints: constraintsRes.data ?? [],
      preferences: preferencesRes.data ?? [],
      availability,
      commitments,
    },
  };
}
