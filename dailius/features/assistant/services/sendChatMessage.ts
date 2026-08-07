"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { getCurrentPlan } from "@/features/planning/services/getCurrentPlan";
import { proposeReschedule } from "@/features/planning/services/proposeReschedule";
import { proposeFutureReschedule } from "@/features/planning/services/proposeFutureReschedule";
import { toISODate, todayInTimezone } from "@/features/planning/services/dateUtils";
import { getUserTimezone } from "@/features/auth/services/getUserTimezone";
import { extractIntent } from "./extractIntent";
import { extractFutureRescheduleIntent } from "./extractFutureRescheduleIntent";
import type { SendChatMessageResult } from "../types";

const COULD_NOT_UNDERSTAND_REPLY =
  "I couldn't tell which activity you meant. Try naming it and the day, like \"I missed my Tuesday workout\" or \"move Friday's run to Saturday.\"";

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

  if (pastCandidates.length === 0 && futureCandidates.length === 0) {
    return {
      reply: "You don't have any activities scheduled this week yet.",
      block: null,
      options: null,
    };
  }

  if (pastCandidates.length > 0) {
    const { blockId } = await extractIntent(userMessage, todayIso, pastCandidates);
    if (blockId) {
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
  }

  if (futureCandidates.length > 0) {
    const { blockId, targetDayLabel } = await extractFutureRescheduleIntent(userMessage, todayIso, futureCandidates);
    if (blockId) {
      const proposal = await proposeFutureReschedule(blockId, targetDayLabel);
      if (!proposal.ok) {
        return { reply: proposal.message, block: null, options: null };
      }

      return {
        reply: `Let's move ${proposal.activityName} off ${proposal.currentDayLabel} — here are some options:`,
        block: null,
        options: { blockId, drafts: proposal.options },
      };
    }
  }

  return { reply: COULD_NOT_UNDERSTAND_REPLY, block: null, options: null };
}
