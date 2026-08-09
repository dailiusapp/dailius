"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { getCurrentPlan } from "@/features/planning/services/getCurrentPlan";
import { proposeReplan } from "@/features/planning/services/proposeReplan";
import { toISODate, todayInTimezone } from "@/features/planning/services/dateUtils";
import { getUserTimezone } from "@/features/auth/services/getUserTimezone";
import { getGoalsForUser } from "@/features/goals/services/getGoalsForUser";
import { classifyIntent } from "./classifyIntent";
import type { SendChatMessageResult } from "../types";

const COULD_NOT_UNDERSTAND_REPLY =
  "I couldn't tell what you meant. Try something like \"I missed my Tuesday workout,\" \"move Friday's run to Saturday,\" or \"prioritize running.\"";

export async function sendChatMessage(userMessage: string): Promise<SendChatMessageResult> {
  const user = await requireUser();
  const plan = await getCurrentPlan(user.id);

  if (!plan) {
    return {
      reply: "You don't have an active weekly plan yet — generate one from your dashboard first.",
      proposal: null,
    };
  }

  const timezone = await getUserTimezone(user.id);
  const todayIso = toISODate(todayInTimezone(timezone));
  const scheduledBlocks = plan.blocks.filter((block) => block.status === "scheduled");
  const pastCandidates = scheduledBlocks
    .filter((block) => block.scheduledDate <= todayIso)
    .map((block) => ({
      id: block.id,
      activityName: block.activityName,
      dayLabel: block.scheduledDate,
      scheduledDate: block.scheduledDate,
    }));
  const futureCandidates = scheduledBlocks
    .filter((block) => block.scheduledDate > todayIso)
    .map((block) => ({
      id: block.id,
      activityName: block.activityName,
      dayLabel: block.scheduledDate,
      scheduledDate: block.scheduledDate,
    }));

  const goals = await getGoalsForUser(user.id, { status: "active" });
  const goalCandidates = goals.map((goal) => ({ id: goal.id, title: goal.title, priority: goal.priority }));

  if (pastCandidates.length === 0 && futureCandidates.length === 0 && goalCandidates.length === 0) {
    return {
      reply: "You don't have any activities scheduled or goals set up this week yet.",
      proposal: null,
    };
  }

  const trigger = await classifyIntent(userMessage, todayIso, pastCandidates, futureCandidates, goalCandidates);

  if (trigger.type === "UNKNOWN") {
    return { reply: COULD_NOT_UNDERSTAND_REPLY, proposal: null };
  }

  const proposal = await proposeReplan(trigger, userMessage);
  if (!proposal.ok) {
    return { reply: proposal.message, proposal: null };
  }

  return {
    reply: proposal.summary,
    proposal: {
      operations: proposal.operations,
      previewBlocks: proposal.previewBlocks,
      changeDescriptions: proposal.changeDescriptions,
    },
  };
}
