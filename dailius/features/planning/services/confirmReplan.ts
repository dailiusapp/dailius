"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import type { PlanningOperation } from "../types";
import { getCurrentPlan } from "./getCurrentPlan";
import { loadEngineInputs } from "./loadEngineInputs";
import { applyPlanningOperations } from "./applyPlanningOperations";
import { validateSchedule } from "./planningValidator";

const GENERIC_ERROR_MESSAGE = "Something went wrong applying those changes. Please try again.";
const STALE_MESSAGE = "That plan has changed since I proposed this. Please ask again for updated options.";

export type ConfirmReplanResult = { ok: true; message: string } | { ok: false; message: string };

// Takes the client-echoed operation list from a proposeReplan.ts proposal
// and re-validates everything fresh before writing anything — never trusts
// the client-echoed proposal blindly, same principle confirmReschedule.ts
// already applies to a single operation, generalized here to a batch.
export async function confirmReplan(operations: PlanningOperation[]): Promise<ConfirmReplanResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const plan = await getCurrentPlan(user.id);
  if (!plan) {
    return { ok: false, message: "You don't have an active weekly plan yet." };
  }

  const loaded = await loadEngineInputs(user.id);
  if (!loaded.ok) {
    return { ok: false, message: loaded.message };
  }

  // Full re-check against fresh DB state before any write — all-or-nothing
  // at the check stage (docs/requirements/scheduling refactoring.md §27:
  // "do not partially apply the AI proposal").
  const applied = applyPlanningOperations(operations, plan.blocks, loaded.input);
  if (!applied.ok) {
    return { ok: false, message: STALE_MESSAGE };
  }

  const validation = validateSchedule(applied.resultingBlocks, loaded.input);
  if (!validation.valid) {
    return { ok: false, message: STALE_MESSAGE };
  }

  // Priority updates first (independent of block writes), then insert new/
  // moved-to blocks before deleting removed/moved-from ones — if the delete
  // then fails, the visible failure is harmless-looking duplicates, not
  // activities vanishing from the user's week.
  for (const change of applied.priorityChanges) {
    const { error } = await supabase
      .from("goals")
      .update({ priority: change.newPriority })
      .eq("id", change.goalId)
      .eq("user_id", user.id);
    if (error) {
      console.error("Failed to update goal priority during confirmReplan:", error);
      return { ok: false, message: GENERIC_ERROR_MESSAGE };
    }
  }

  if (applied.newBlocks.length > 0) {
    const { error: insertError } = await supabase.from("scheduled_blocks").insert(
      applied.newBlocks.map((block) => ({
        weekly_plan_id: plan.id,
        activity_id: block.activityId,
        scheduled_date: block.scheduledDate,
        start_time: block.startTime,
        end_time: block.endTime,
        rationale: block.rationale,
      })),
    );
    if (insertError) {
      console.error("Failed to insert new blocks during confirmReplan:", insertError);
      return { ok: false, message: GENERIC_ERROR_MESSAGE };
    }
  }

  if (applied.removedBlockIds.length > 0) {
    const { error: deleteError } = await supabase.from("scheduled_blocks").delete().in("id", applied.removedBlockIds);
    if (deleteError) {
      console.error("Failed to delete superseded blocks during confirmReplan:", deleteError);
      return { ok: false, message: GENERIC_ERROR_MESSAGE };
    }
  }

  return { ok: true, message: "Done — I've updated your schedule." };
}
