import { createClient } from "@/lib/supabase/client";
import type { SignUpInput, SignUpResult } from "../types";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    const message = mapAuthError(error);
    if (message === GENERIC_ERROR_MESSAGE) {
      console.error("Sign up failed:", error);
    }
    return { ok: false, message };
  }

  // Supabase returns a user with no error, but an empty identities array,
  // when the email already belongs to a confirmed account (to avoid leaking
  // which emails are registered via a distinct error).
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return {
      ok: false,
      message: "An account with this email already exists.",
      field: "email",
    };
  }

  return { ok: true };
}

function mapAuthError(error: { code?: string; message: string }): string {
  if (error.code === "user_already_exists" || /already registered/i.test(error.message)) {
    return "An account with this email already exists.";
  }
  if (error.code === "weak_password" || /password/i.test(error.message)) {
    return "Password must be at least 8 characters.";
  }
  return GENERIC_ERROR_MESSAGE;
}
