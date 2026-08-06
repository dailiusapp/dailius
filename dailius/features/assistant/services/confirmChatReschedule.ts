"use server";

import { confirmReschedule } from "@/features/planning/services/confirmReschedule";
import { dayOfWeekLabel, formatClockTime, parseISODate } from "@/features/planning/services/dateUtils";
import type { ScheduledBlock, ScheduledBlockDraft } from "@/features/planning/types";

export async function confirmChatReschedule(
  blockId: string,
  chosenOption: ScheduledBlockDraft,
): Promise<{ reply: string; block: ScheduledBlock | null }> {
  const result = await confirmReschedule(blockId, chosenOption);
  if (!result.ok) {
    return { reply: result.message, block: null };
  }

  const dayLabel = dayOfWeekLabel(parseISODate(result.newBlock.scheduledDate));
  const time = formatClockTime(result.newBlock.startTime);

  return {
    reply: `Great — I've rescheduled it for ${dayLabel} at ${time}.`,
    block: result.newBlock,
  };
}
