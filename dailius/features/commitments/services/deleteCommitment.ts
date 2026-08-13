"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/features/planning/services/generatePlan";
import type { DeleteCommitmentResult } from "../types";

export async function deleteCommitment(commitmentId: string): Promise<DeleteCommitmentResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("commitments")
    .select("source")
    .eq("id", commitmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, message: "Something went wrong deleting that commitment. Please try again." };
  }
  if (!existing) {
    return { ok: false, message: "That commitment couldn't be found." };
  }
  if (existing.source !== "Manual") {
    return { ok: false, message: "This commitment is synced from an external calendar and can't be deleted here." };
  }

  // Safe to hard-delete — nothing references `commitments` via FK
  // (MOVE_COMMITMENT already just UPDATEs this table in place, no
  // scheduled_blocks row is ever created for a commitment).
  const { error } = await supabase.from("commitments").delete().eq("id", commitmentId).eq("user_id", user.id);

  if (error) {
    return { ok: false, message: "Something went wrong deleting that commitment. Please try again." };
  }

  const planResult = await generatePlan();
  if (!planResult.ok) {
    console.error("Failed to regenerate plan after deleting commitment:", planResult.message);
  }

  return { ok: true };
}
