"use client";

import { useId, useState, type FormEvent } from "react";
import { CONTACT_EMAIL } from "@/lib/constants";
import { ArrowRightIcon } from "./icons";

/**
 * There is no waitlist backend yet (no API route / Supabase table wired up —
 * see CLAUDE.md follow-ups). Submitting opens a pre-filled email to
 * CONTACT_EMAIL so no signup is silently dropped, and a visible mailto
 * fallback stays on screen for anyone whose browser has no mail client
 * registered.
 */
export function WaitlistForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = encodeURIComponent("Dailius waitlist");
    const body = encodeURIComponent(
      `Add me to the Dailius waitlist.\n\nMy email: ${email}`,
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        role="status"
        className={`rounded-2xl border border-gray-200 bg-surface p-5 text-left ${className ?? ""}`}
      >
        <p className="font-medium text-navy">You&apos;re on your way.</p>
        <p className="mt-1 text-sm text-gray-600">
          We opened an email to confirm your spot. If nothing happened, reach
          us directly at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-navy underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm sm:flex-row"
      >
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full flex-1 rounded-xl px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-from to-brand-to px-5 py-3 text-[15px] font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          Join the Waitlist
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-3 text-sm text-gray-500">
        No spam. One email when Dailius is ready for you.
      </p>
    </div>
  );
}
