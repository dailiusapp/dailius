"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import type { RequestAccountDeletionResult } from "../types";

export async function requestAccountDeletion(): Promise<RequestAccountDeletionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const requestedAt = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ deletion_requested_at: requestedAt })
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: "Something went wrong submitting that request. Please try again." };
  }

  revalidatePath("/settings");

  return { ok: true, requestedAt };
}
