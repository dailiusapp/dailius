"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { isGoogleCalendarConnected } from "@/features/calendar/services/getConnectionStatus";
import { syncGoogleCalendarEvents } from "@/features/calendar/services/syncGoogleCalendarEvents";
import { generateWeeklySchedule, type LockedBlock } from "./engine";
import { getWeekStart, toISODate } from "./dateUtils";
import { loadEngineInputs } from "./loadEngineInputs";
import type { GeneratePlanResult } from "../types";

const GENERIC_ERROR_MESSAGE = "Something went wrong generating your plan. Please try again.";

export async function generatePlan(): Promise<GeneratePlanResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Keep commitments fresh right before building off them. A failed sync
  // (e.g. revoked token) shouldn't block plan generation — fall back to
  // whatever commitments are already stored.
  if (await isGoogleCalendarConnected(user.id)) {
    const syncResult = await syncGoogleCalendarEvents(user.id);
    if (!syncResult.ok) {
      console.error("Failed to sync Google Calendar before generating plan:", syncResult.message);
    }
  }

  const loaded = await loadEngineInputs(user.id);
  if (!loaded.ok) {
    return { ok: false, message: loaded.message };
  }

  const weekStart = toISODate(getWeekStart(loaded.input.today));

  // Carry forward blocks the user (or the AI on their behalf, via
  // confirmReplan.ts) deliberately placed — a full regeneration must not
  // silently undo a move the user already accepted. See engine.ts's
  // `LockedBlock` and docs/requirements/scheduling refactoring.md §16.
  const { data: currentPlanRow, error: currentPlanError } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .eq("status", "active")
    .maybeSingle();

  if (currentPlanError) {
    console.error("Failed to load current plan before regenerating:", currentPlanError);
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  let lockedRows: {
    id: string;
    activity_id: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    original_scheduled_date: string | null;
  }[] = [];
  if (currentPlanRow) {
    const { data, error: lockedError } = await supabase
      .from("scheduled_blocks")
      .select("id, activity_id, scheduled_date, start_time, end_time, original_scheduled_date")
      .eq("weekly_plan_id", currentPlanRow.id)
      .eq("locked", true);

    if (lockedError) {
      console.error("Failed to load locked blocks before regenerating:", lockedError);
      return { ok: false, message: GENERIC_ERROR_MESSAGE };
    }
    lockedRows = data ?? [];
  }

  const lockedBlocks: LockedBlock[] = lockedRows.map((row) => ({
    activityId: row.activity_id,
    scheduledDate: row.scheduled_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    originalScheduledDate: row.original_scheduled_date,
  }));

  const result = generateWeeklySchedule(loaded.input, lockedBlocks);

  if (result.unplacedCount > 0) {
    console.error(`generatePlan: ${result.unplacedCount} occurrence(s) could not be placed for user ${user.id}`);
  }

  const { error: archiveError } = await supabase
    .from("weekly_plans")
    .update({ status: "archived" })
    .eq("user_id", user.id)
    .eq("week_start", result.weekStart)
    .eq("status", "active");

  if (archiveError) {
    console.error("Failed to archive previous plan:", archiveError);
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  const { data: planRow, error: planError } = await supabase
    .from("weekly_plans")
    .insert({ user_id: user.id, week_start: result.weekStart, status: "active" })
    .select("id")
    .single();

  if (planError) {
    console.error("Failed to create weekly plan:", planError);
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  if (lockedRows.length > 0) {
    const { error: relinkError } = await supabase
      .from("scheduled_blocks")
      .update({ weekly_plan_id: planRow.id })
      .in(
        "id",
        lockedRows.map((row) => row.id),
      );

    if (relinkError) {
      console.error("Failed to carry locked blocks into the new plan:", relinkError);
      return { ok: false, message: GENERIC_ERROR_MESSAGE };
    }
  }

  if (result.blocks.length > 0) {
    const { error: blocksError } = await supabase.from("scheduled_blocks").insert(
      result.blocks.map((block) => ({
        weekly_plan_id: planRow.id,
        activity_id: block.activityId,
        scheduled_date: block.scheduledDate,
        start_time: block.startTime,
        end_time: block.endTime,
        rationale: block.rationale,
      })),
    );

    if (blocksError) {
      console.error("Failed to insert scheduled blocks:", blocksError);
      return { ok: false, message: GENERIC_ERROR_MESSAGE };
    }
  }

  revalidatePath("/weekly-plan");
  revalidatePath("/dashboard");

  return { ok: true, weeklyPlanId: planRow.id, blocksPlaced: result.blocks.length + lockedRows.length };
}
