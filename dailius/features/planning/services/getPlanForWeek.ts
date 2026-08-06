import { createClient } from "@/lib/supabase/server";
import type { ScheduledBlockStatus, WeeklyPlan, WeeklyPlanStatus } from "../types";
import { addDays, instantToLocalDateTime, parseISODate } from "./dateUtils";

export async function getPlanForWeek(userId: string, weekStart: string): Promise<WeeklyPlan | null> {
  const supabase = await createClient();

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

  const weekEndDate = addDays(parseISODate(weekStart), 7);

  const [blocksRes, commitmentsRes] = await Promise.all([
    supabase
      .from("scheduled_blocks")
      .select("id, activity_id, scheduled_date, start_time, end_time, status, rationale, activities(name)")
      .eq("weekly_plan_id", planRow.id)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("commitments")
      .select("id, title, start_time, end_time, timezone, source")
      .eq("user_id", userId)
      .gte("start_time", parseISODate(weekStart).toISOString())
      .lt("start_time", weekEndDate.toISOString()),
  ]);

  if (blocksRes.error) {
    throw blocksRes.error;
  }
  if (commitmentsRes.error) {
    throw commitmentsRes.error;
  }

  return {
    id: planRow.id,
    weekStart: planRow.week_start,
    status: planRow.status as WeeklyPlanStatus,
    blocks: (blocksRes.data ?? []).map((row) => ({
      id: row.id,
      activityId: row.activity_id,
      activityName: (row.activities as unknown as { name: string } | null)?.name ?? "Activity",
      scheduledDate: row.scheduled_date,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      status: row.status as ScheduledBlockStatus,
      rationale: row.rationale,
    })),
    commitments: (commitmentsRes.data ?? []).map((row) => {
      const start = instantToLocalDateTime(row.start_time, row.timezone);
      const end = instantToLocalDateTime(row.end_time, row.timezone);
      return {
        id: row.id,
        title: row.title,
        scheduledDate: start.date,
        startTime: start.time,
        endTime: end.time,
        source: row.source,
      };
    }),
  };
}
