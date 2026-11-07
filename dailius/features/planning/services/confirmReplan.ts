"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { resolveScheduleTimes, type TimeChoices } from "./scheduleTimes";
import type { PlanningOperation, ScheduleTimeChoice } from "../types";
import { getCurrentPlan } from "./getCurrentPlan";
import { loadEngineInputs } from "./loadEngineInputs";
import { applyPlanningOperations } from "./applyPlanningOperations";
import { validateSchedule } from "./planningValidator";
import { localDateTimeToInstant } from "./dateUtils";

const GENERIC_ERROR_MESSAGE = "Something went wrong applying those changes. Please try again.";
const STALE_MESSAGE = "That plan has changed since I proposed this. Please ask again for updated options.";

export type ConfirmReplanResult = { ok: true; message: string } | { ok: false; message: string; timeChoices?: ScheduleTimeChoice[] };

// Takes the client-echoed operation list from a proposeReplan.ts proposal
// and re-validates everything fresh before writing anything — never trusts
// the client-echoed proposal blindly, same principle confirmReschedule.ts
// already applies to a single operation, generalized here to a batch.
export async function confirmReplan(operations: PlanningOperation[], timeChoices: TimeChoices = {}): Promise<ConfirmReplanResult> {
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

  loaded.input.activities = loaded.input.activities.map((activity) => ({ ...activity, timeOccurrence: timeChoices[activity.id] ?? activity.timeOccurrence }));

  // Full re-check against fresh DB state before any write — all-or-nothing
  // at the check stage (docs/requirements/scheduling refactoring.md §27:
  // "do not partially apply the AI proposal").
  const applied = applyPlanningOperations(operations, plan.blocks, loaded.input, timeChoices);
  if (!applied.ok) {
    return { ok: false, message: STALE_MESSAGE };
  }

  const times = resolveScheduleTimes(applied.newBlocks, loaded.input, timeChoices);
  if (!times.ok) return times;

  const validation = validateSchedule(applied.resultingBlocks, loaded.input);
  if (!validation.valid) {
    return { ok: false, message: STALE_MESSAGE };
  }

  // One RPC is one PostgreSQL transaction: any failed insert, update or
  // delete rolls back the entire accepted batch. Never fall back to separate
  // writes if the migration is missing or the RPC fails.
  const commitmentsById = new Map(loaded.input.commitments.map((commitment) => [commitment.id, commitment]));
  const { error } = await supabase.rpc("confirm_replan", {
    p_plan_id: plan.id,
    p_priority_changes: applied.priorityChanges.map((change) => ({
      goal_id: change.goalId,
      priority: change.newPriority,
    })),
    p_new_blocks: applied.newBlocks.filter((block) => !block.commitmentId).map((block) => ({
      activity_id: block.activityId,
      scheduled_date: block.scheduledDate,
      start_time: block.startTime,
      end_time: block.endTime,
      rationale: block.rationale,
      original_scheduled_date: block.originalScheduledDate ?? null,
      time_occurrence: block.timeOccurrence ?? null,
      start_instant: block.startInstant ?? null,
      end_instant: block.endInstant ?? null,
    })),
    p_commitment_moves: applied.newBlocks.filter((block) => block.commitmentId).map((move) => {
      const timezone = loaded.input.timezone ?? commitmentsById.get(move.commitmentId!)!.timezone;
      return {
        id: move.commitmentId,
        start_time: (move.startInstant ?? localDateTimeToInstant(move.scheduledDate, move.startTime, timezone, move.timeOccurrence).toISOString()),
        end_time: (move.endInstant ?? localDateTimeToInstant(move.scheduledDate, move.endTime, timezone, move.timeOccurrence).toISOString()),
      };
    }),
    p_removed_block_ids: [...new Set(applied.removedBlockIds)],
  });
  if (error) {
    console.error("Failed to commit replan transaction:", error);
    return { ok: false, message: error.code === "P0002" ? STALE_MESSAGE : GENERIC_ERROR_MESSAGE };
  }

  revalidatePath("/weekly-plan");
  revalidatePath("/dashboard");

  return { ok: true, message: "Done — I've updated your schedule." };
}
