"use client";

import { useId, useState, type FormEvent } from "react";
import { joinWaitlist } from "@/features/waitlist/services/actions";
import { validateEmail } from "@/features/waitlist/utils/validation";
import { ArrowRightIcon } from "./icons";

export function WaitlistForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputId = useId();
  const honeypotId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const result = await joinWaitlist({ email, honeypot });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

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
          You&apos;re on the list. We&apos;ll email you as soon as Dailius is ready for you.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <div className="relative flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm sm:flex-row">
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
            disabled={isSubmitting}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full flex-1 rounded-xl px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-70"
          />

          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor={honeypotId}>Company</label>
            <input
              id={honeypotId}
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-from to-brand-to px-5 py-3 text-[15px] font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
          >
            {isSubmitting ? (
              "Joining..."
            ) : (
              <>
                Join the Waitlist
                <ArrowRightIcon className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
      <p className="mt-3 text-sm text-gray-500">
        No spam. One email when Dailius is ready for you.
      </p>
    </div>
  );
}
