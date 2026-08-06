"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { getCurrentPlan } from "@/features/planning/services/getCurrentPlan";
import { proposeReschedule } from "@/features/planning/services/proposeReschedule";
import { toISODate } from "@/features/planning/services/dateUtils";
import { extractIntent } from "./extractIntent";
import type { SendChatMessageResult } from "../types";

export async function sendChatMessage(userMessage: string): Promise<SendChatMessageResult> {
  const user = await requireUser();
  const plan = await getCurrentPlan(user.id);

  if (!plan) {
    return {
      reply: "You don't have an active weekly plan yet — generate one from your dashboard first.",
      block: null,
      options: null,
    };
  }

  const todayIso = toISODate(new Date());
  const candidates = plan.blocks
    .filter((block) => block.status === "scheduled" && block.scheduledDate <= todayIso)
    .map((block) => ({
      id: block.id,
      activityName: block.activityName,
      dayLabel: block.scheduledDate,
      scheduledDate: block.scheduledDate,
    }));

  if (candidates.length === 0) {
    return {
      reply: "You don't have any activities from earlier this week to report as missed.",
      block: null,
      options: null,
    };
  }

  const { blockId } = await extractIntent(userMessage, todayIso, candidates);
  if (!blockId) {
    return {
      reply:
        "I couldn't tell which activity you meant. Try naming it and the day, like \"I missed my Tuesday workout.\"",
      block: null,
      options: null,
    };
  }

  const proposal = await proposeReschedule(blockId);
  if (!proposal.ok) {
    return { reply: proposal.message, block: null, options: null };
  }

  return {
    reply: `Sorry you missed ${proposal.missedActivityName} on ${proposal.missedDayLabel}. Here are a few times that could work — pick one:`,
    block: null,
    options: { blockId, drafts: proposal.options },
  };
}
