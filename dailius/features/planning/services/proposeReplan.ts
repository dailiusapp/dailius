"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import type { EngineInput, PlanningOperation, PlanningTrigger, ScheduledBlock, ScheduledBlockDraft } from "../types";
import { getCurrentPlan } from "./getCurrentPlan";
import { loadEngineInputs } from "./loadEngineInputs";
import { runPlanningLoop } from "./planningLoop";
import { checkUsageLimit } from "./aiUsage";
import { dayOfWeekLabel, parseISODate } from "./dateUtils";

export type ProposeReplanResult =
  | {
      ok: true;
      trigger: PlanningTrigger;
      summary: string;
      operations: PlanningOperation[];
      previewBlocks: ScheduledBlockDraft[];
      changeDescriptions: string[];
    }
  | { ok: false; message: string };

// previewBlocks alone can't describe a REMOVE_ACTIVITY (a removed block is
// absent from the resulting week by definition), so this reads names
// straight from the current real blocks/activities/goals instead.
function describeOperations(operations: PlanningOperation[], currentBlocks: ScheduledBlock[], input: EngineInput): string[] {
  const blocksById = new Map(currentBlocks.map((block) => [block.id, block]));
  const activitiesById = new Map(input.activities.map((activity) => [activity.id, activity]));
  const goalsById = new Map(input.goals.map((goal) => [goal.id, goal]));
  const commitmentsById = new Map(input.commitments.map((commitment) => [commitment.id, commitment]));
  const formatDate = (iso: string) => dayOfWeekLabel(parseISODate(iso));

  return operations.map((op) => {
    switch (op.type) {
      case "MOVE_ACTIVITY": {
        const name = blocksById.get(op.blockId)?.activityName ?? "Activity";
        return `Move ${name} → ${formatDate(op.targetDate)}`;
      }
      case "ADD_ACTIVITY": {
        const name = activitiesById.get(op.activityId)?.name ?? "Activity";
        return `Add ${name} → ${formatDate(op.targetDate)}`;
      }
      case "REMOVE_ACTIVITY": {
        const name = blocksById.get(op.blockId)?.activityName ?? "Activity";
        return `Remove ${name}`;
      }
      case "CHANGE_PRIORITY": {
        const title = goalsById.get(op.goalId)?.title ?? "Goal";
        return `Set '${title}' priority to ${op.newPriority}`;
      }
      case "MOVE_COMMITMENT": {
        const title = commitmentsById.get(op.commitmentId)?.title ?? "Commitment";
        return `Move ${title} → ${formatDate(op.targetDate)}`;
      }
    }
  });
}

// Entry point for the AI-assisted replanning pipeline — replaces
// proposeReschedule.ts/proposeFutureReschedule.ts's single-activity
// propose flow. Loads state, checks the per-user usage limit before
// spending anything on AI calls, builds context, runs the bounded
// AI ↔ validator loop, and returns an ephemeral proposal (never writes to
// the database — that only happens in confirmReplan.ts, after user accept).
export async function proposeReplan(trigger: PlanningTrigger, userMessage: string): Promise<ProposeReplanResult> {
  if (trigger.type === "UNKNOWN") {
    return { ok: false, message: "I couldn't tell what you'd like to change." };
  }

  const user = await requireUser();

  const usage = await checkUsageLimit(user.id);
  if (!usage.ok) {
    return { ok: false, message: usage.message };
  }

  const plan = await getCurrentPlan(user.id);
  if (!plan) {
    return { ok: false, message: "You don't have an active weekly plan yet." };
  }

  const loaded = await loadEngineInputs(user.id);
  if (!loaded.ok) {
    return { ok: false, message: loaded.message };
  }

  const result = await runPlanningLoop(user.id, trigger, trigger.type, userMessage, loaded.input, plan);

  if (!result.ok) {
    return {
      ok: false,
      message: "I couldn't find a valid way to reorganize your week. Your current schedule hasn't changed.",
    };
  }

  return {
    ok: true,
    trigger,
    summary: result.summary,
    operations: result.operations,
    previewBlocks: result.previewBlocks,
    changeDescriptions: describeOperations(result.operations, plan.blocks, loaded.input),
  };
}
