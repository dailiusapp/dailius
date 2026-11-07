import { commitmentInput, commitmentSegments } from "./commitmentSegments";
import { createClient } from "@/lib/supabase/server";
import type { ScheduledBlockStatus, WeeklyPlan, WeeklyPlanStatus } from "../types";
import { weekBounds } from "./dateUtils";

export async function getPlanForWeek(
  userId: string,
  weekStart: string,
  timezone: string | null,
): Promise<WeeklyPlan | null> {
  const supabase = await createClient();

  const { data: planRow, error: planError } = await supabase
    .from("weekly_plans")
    .select("id, week_start, status, unplaced_fixed_time_warnings")
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

  const tz = timezone ?? "UTC";
  const bounds = weekBounds(weekStart, tz);

  const [blocksRes, commitmentsRes] = await Promise.all([
    supabase
      .from("scheduled_blocks")
      .select("id, activity_id, scheduled_date, start_time, end_time, status, rationale, start_instant, end_instant, time_occurrence, activities(name)")
      .eq("weekly_plan_id", planRow.id)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("commitments")
      .select("id, title, start_time, end_time, timezone, source")
      .eq("user_id", userId)
      .lt("start_time", bounds.end.toISOString())
      .gt("end_time", bounds.start.toISOString()),
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
      startInstant: row.start_instant,
      endInstant: row.end_instant,
      timeOccurrence: row.time_occurrence,
    })),
    commitments: (commitmentsRes.data ?? []).flatMap((row) => {
      const original = commitmentInput(row, tz);
      const wallDuration = (Date.parse(`${original.endDate}T${original.endTime}:00Z`) - Date.parse(`${original.scheduledDate}T${original.startTime}:00Z`)) / 60_000;
      const clockChanged = Math.abs(wallDuration - original.durationMinutes!) >= 1;
      const formatter = clockChanged ? new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", timeZoneName: "shortOffset" }) : null;
      return commitmentSegments(original, weekStart).map((segment) => ({
        id: segment.id, title: segment.title, scheduledDate: segment.scheduledDate,
        startTime: segment.startTime, endTime: segment.endTime, source: segment.source,
        timeRangeLabel: formatter && original.scheduledDate === original.endDate
          ? `${formatter.format(new Date(row.start_time))}–${formatter.format(new Date(row.end_time))}` : undefined,
      }));
    }),
    unplacedFixedTimeWarnings: (planRow.unplaced_fixed_time_warnings as string[] | null) ?? [],
  };
}
