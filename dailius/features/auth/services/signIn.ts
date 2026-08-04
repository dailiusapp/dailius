import { createClient } from "@/lib/supabase/client";
import type { SignInInput, SignInResult } from "../types";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export async function signIn(input: SignInInput): Promise<SignInResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message = mapAuthError(error);
    if (message === GENERIC_ERROR_MESSAGE) {
      console.error("Sign in failed:", error);
    }
    return { ok: false, message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", data.user.id)
    .maybeSingle();

  return { ok: true, redirectTo: profile?.onboarding_completed ? "/dashboard" : "/onboarding" };
}

function mapAuthError(error: { code?: string; message: string }): string {
  if (error.code === "invalid_credentials" || /invalid login credentials/i.test(error.message)) {
    return "Incorrect email or password.";
  }
  if (error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message)) {
    return "Please verify your email before signing in.";
  }
  return GENERIC_ERROR_MESSAGE;
}
