"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import type { DeleteGoalResult } from "../types";

export async function deleteGoal(goalId: string): Promise<DeleteGoalResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("user_id", user.id);

  if (error) {
    return { ok: false, message: "Something went wrong deleting that goal. Please try again." };
  }

  revalidatePath("/goals");

  return { ok: true };
}
