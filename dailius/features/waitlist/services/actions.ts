"use server";

import { createClient } from "@/lib/supabase/server";
import type { JoinWaitlistInput, JoinWaitlistResult } from "../types";
import { validateEmail } from "../utils/validation";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
const UNIQUE_VIOLATION = "23505";

export async function joinWaitlist(input: JoinWaitlistInput): Promise<JoinWaitlistResult> {
  // Bots that fill every field (including ones hidden from sighted users)
  // trip the honeypot. Report success without writing a row so they don't
  // learn to leave it blank next time.
  if (input.honeypot) {
    return { ok: true };
  }

  const email = input.email.trim().toLowerCase();
  const validationError = validateEmail(email);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist_signups").insert({ email });

  // A unique-violation means this email already signed up — treated as
  // success, not a distinct error, so we don't leak who's already on the list.
  if (error && error.code !== UNIQUE_VIOLATION) {
    console.error("Waitlist signup failed:", error);
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  return { ok: true };
}
