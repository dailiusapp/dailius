"use server";

import { confirmReplan } from "@/features/planning/services/confirmReplan";
import type { PlanningOperation } from "@/features/planning/types";

export async function confirmChatReplan(operations: PlanningOperation[]): Promise<{ ok: boolean; reply: string }> {
  const result = await confirmReplan(operations);
  return { ok: result.ok, reply: result.message };
}
