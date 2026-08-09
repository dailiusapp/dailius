"use server";

import { confirmReplan } from "@/features/planning/services/confirmReplan";
import type { PlanningOperation } from "@/features/planning/types";

export async function confirmChatReplan(operations: PlanningOperation[]): Promise<{ reply: string }> {
  const result = await confirmReplan(operations);
  return { reply: result.message };
}
