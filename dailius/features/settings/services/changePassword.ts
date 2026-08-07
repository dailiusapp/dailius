"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { validatePassword } from "@/features/auth/utils/validation";
import { createClient } from "@/lib/supabase/server";
import type { ChangePasswordInput, ChangePasswordResult } from "../types";

const GENERIC_ERROR_MESSAGE = "Something went wrong changing your password. Please try again.";

export async function changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
  const newPasswordError = validatePassword(input.newPassword);
  if (newPasswordError) {
    return { ok: false, message: newPasswordError, field: "newPassword" };
  }

  const user = await requireUser();
  const supabase = await createClient();

  // Re-authenticate with the current password before allowing the change —
  // not required by Supabase's API itself, but prevents a hijacked/left-open
  // session from silently taking over the account without knowing the
  // existing password.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: input.currentPassword,
  });

  if (reauthError) {
    return { ok: false, message: "Current password is incorrect.", field: "currentPassword" };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: input.newPassword });

  if (updateError) {
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  return { ok: true };
}
