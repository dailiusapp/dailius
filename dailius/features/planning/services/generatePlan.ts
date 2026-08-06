"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { generateWeeklySchedule } from "./engine";
import { loadEngineInputs } from "./loadEngineInputs";
import type { GeneratePlanResult } from "../types";

const GENERIC_ERROR_MESSAGE = "Something went wrong generating your plan. Please try again.";

export async function generatePlan(): Promise<GeneratePlanResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const loaded = await loadEngineInputs(user.id);
  if (!loaded.ok) {
    return { ok: false, message: loaded.message };
  }

  const result = generateWeeklySchedule(loaded.input);

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

  return { ok: true, weeklyPlanId: planRow.id, blocksPlaced: result.blocks.length };
}
