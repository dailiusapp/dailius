import { createClient } from "@/lib/supabase/server";
import { getWeekStart, toISODate } from "./dateUtils";
import type { ScheduledBlockStatus, WeeklyPlan, WeeklyPlanStatus } from "../types";

export async function getCurrentPlan(userId: string): Promise<WeeklyPlan | null> {
  const supabase = await createClient();
  const weekStart = toISODate(getWeekStart(new Date()));

  const { data: planRow, error: planError } = await supabase
    .from("weekly_plans")
    .select("id, week_start, status")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .eq("status", "active")
    .maybeSingle();

  if (planError) {
    throw planError;
  }

  if (!planRow) {
    return null;
  }

  const { data: blockRows, error: blockError } = await supabase
    .from("scheduled_blocks")
    .select("id, activity_id, scheduled_date, start_time, end_time, status, rationale, activities(name)")
    .eq("weekly_plan_id", planRow.id)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (blockError) {
    throw blockError;
  }

  return {
    id: planRow.id,
    weekStart: planRow.week_start,
    status: planRow.status as WeeklyPlanStatus,
    blocks: (blockRows ?? []).map((row) => ({
      id: row.id,
      activityId: row.activity_id,
      activityName: (row.activities as unknown as { name: string } | null)?.name ?? "Activity",
      scheduledDate: row.scheduled_date,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      status: row.status as ScheduledBlockStatus,
      rationale: row.rationale,
    })),
  };
}
