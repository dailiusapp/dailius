"use client";

import { useState } from "react";
import { CalendarIcon } from "@/components/landing/icons";
import { PrimaryButton, SecondaryButton } from "./buttons";
import { StepFooter, StepShell } from "./StepShell";

export function CalendarStep({ onNext }: { onNext: () => void }) {
  const [skipped, setSkipped] = useState(false);

  return (
    <StepShell
      title="Connect your calendar"
      description="Understand your existing commitments so Dailius can plan around them."
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 opacity-60">
          <div className="flex items-start gap-3">
            <CalendarIcon className="mt-0.5 h-5 w-5 text-gray-400" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-navy">Connect Google Calendar</span>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-gray-500">
                  Recommended
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">Coming soon</p>
            </div>
          </div>
          <SecondaryButton disabled className="shrink-0 px-4 py-2 text-sm">
            Connect
          </SecondaryButton>
        </div>

        {!skipped ? (
          <button
            type="button"
            onClick={() => setSkipped(true)}
            className="w-full rounded-xl border border-dashed border-gray-300 px-5 py-4 text-center text-sm font-medium text-gray-600 hover:border-navy/30 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to"
          >
            I&apos;ll add events later
          </button>
        ) : (
          <p className="rounded-xl border border-gray-200 bg-surface px-5 py-4 text-sm text-gray-600">
            No problem. We&apos;ll create your first plan without your calendar.
          </p>
        )}
      </div>

      <StepFooter>
        <span />
        <PrimaryButton onClick={onNext} disabled={!skipped}>
          Continue
        </PrimaryButton>
      </StepFooter>
    </StepShell>
  );
}
