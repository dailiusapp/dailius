"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import type { CancelAccountDeletionResult } from "../types";

export async function cancelAccountDeletion(): Promise<CancelAccountDeletionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ deletion_requested_at: null }).eq("id", user.id);

  if (error) {
    return { ok: false, message: "Something went wrong cancelling that request. Please try again." };
  }

  revalidatePath("/settings");

  return { ok: true };
}
