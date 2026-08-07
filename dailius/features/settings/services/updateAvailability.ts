"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import type { Availability } from "@/features/onboarding/types";

export type UpdateAvailabilityResult = { ok: true } | { ok: false; message: string };

function hasInvalidRange(availability: Availability): boolean {
  return [
    availability.weekdayMorning,
    availability.weekdayAfternoon,
    availability.weekdayEvening,
    availability.weekendMorning,
    availability.weekendAfternoon,
    availability.weekendEvening,
  ].some((range) => range !== null && range.end <= range.start);
}

export async function updateAvailability(availability: Availability): Promise<UpdateAvailabilityResult> {
  if (hasInvalidRange(availability)) {
    return { ok: false, message: "End time must be after start time for every enabled block." };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("availability").upsert({
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

  if (error) {
    return { ok: false, message: "Something went wrong updating your availability. Please try again." };
  }

  revalidatePath("/settings");
  return { ok: true };
}
