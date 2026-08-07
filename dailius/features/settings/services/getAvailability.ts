import { createClient } from "@/lib/supabase/server";
import type { Availability } from "@/features/onboarding/types";

const EMPTY_AVAILABILITY: Availability = {
  weekdayMorning: null,
  weekdayAfternoon: null,
  weekdayEvening: null,
  weekendMorning: null,
  weekendAfternoon: null,
  weekendEvening: null,
  maxDailyPlanningMinutes: null,
};

// DB "time" columns come back as "HH:MM:SS" — Availability's TimeRange is
// documented as "HH:MM", matching what AvailabilityStep's <input type="time">
// already produces, so seconds are trimmed here at the read boundary.
function toRange(start: string | null, end: string | null): { start: string; end: string } | null {
  return start && end ? { start: start.slice(0, 5), end: end.slice(0, 5) } : null;
}

export async function getAvailability(userId: string): Promise<Availability> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability")
    .select(
      "weekday_morning_start, weekday_morning_end, weekday_afternoon_start, weekday_afternoon_end, weekday_evening_start, weekday_evening_end, weekend_morning_start, weekend_morning_end, weekend_afternoon_start, weekend_afternoon_end, weekend_evening_start, weekend_evening_end, max_daily_planning_minutes",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return EMPTY_AVAILABILITY;

  return {
    weekdayMorning: toRange(data.weekday_morning_start, data.weekday_morning_end),
    weekdayAfternoon: toRange(data.weekday_afternoon_start, data.weekday_afternoon_end),
    weekdayEvening: toRange(data.weekday_evening_start, data.weekday_evening_end),
    weekendMorning: toRange(data.weekend_morning_start, data.weekend_morning_end),
    weekendAfternoon: toRange(data.weekend_afternoon_start, data.weekend_afternoon_end),
    weekendEvening: toRange(data.weekend_evening_start, data.weekend_evening_end),
    maxDailyPlanningMinutes: data.max_daily_planning_minutes,
  };
}
