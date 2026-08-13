"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/features/planning/services/generatePlan";
import type { DeleteActivityResult } from "../types";

export async function deleteActivity(activityId: string): Promise<DeleteActivityResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Soft-delete (enabled: false), not a real DELETE — scheduled_blocks.activity_id
  // has ON DELETE CASCADE, so a hard delete would silently wipe every
  // historical block for this activity (including past completed/missed
  // ones across every week), not just future ones. The engine already skips
  // disabled activities (loadEngineInputs.ts filters .eq("enabled", true)),
  // so future occurrences simply stop generating.
  const { error } = await supabase
    .from("activities")
    .update({ enabled: false })
    .eq("id", activityId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: "Something went wrong deleting that activity. Please try again." };
  }

  const { error: unlinkError } = await supabase.from("activity_goals").delete().eq("activity_id", activityId);
  if (unlinkError) {
    console.error("Failed to unlink deleted activity from goals:", unlinkError);
  }
  revalidatePath("/goals");

  const planResult = await generatePlan();
  if (!planResult.ok) {
    console.error("Failed to regenerate plan after deleting activity:", planResult.message);
  }

  return { ok: true };
}
