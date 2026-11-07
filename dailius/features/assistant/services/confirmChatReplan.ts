"use server";

import { confirmReplan } from "@/features/planning/services/confirmReplan";
import type { TimeChoices } from "@/features/planning/services/scheduleTimes";
import type { PlanningOperation } from "@/features/planning/types";

export async function confirmChatReplan(operations: PlanningOperation[], choices: TimeChoices = {}) {
  const result = await confirmReplan(operations, choices);
  return { ok: result.ok, reply: result.message, timeChoices: result.ok ? undefined : result.timeChoices };
}
