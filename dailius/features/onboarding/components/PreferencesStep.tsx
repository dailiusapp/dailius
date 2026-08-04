"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { PlanningStyle, Preferences } from "../types";
import { PrimaryButton, SecondaryButton } from "./buttons";
import { StepFooter, StepShell } from "./StepShell";

const AVOID_AFTER_OPTIONS = [
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "22:00", label: "10:00 PM" },
];

const PROTECT_OPTIONS = ["Family Dinner", "Sleep", "School Pickup", "Sunday Rest", "Personal Time"];

const WORKOUT_LENGTH_OPTIONS = [30, 45, 60, 90];

const PLANNING_STYLE_OPTIONS: { value: PlanningStyle; label: string }[] = [
  { value: "relaxed", label: "Keep my schedule relaxed" },
  { value: "balanced", label: "Balanced" },
  { value: "productive", label: "Maximize productivity" },
];

export function PreferencesStep({
  preferences,
  onBack,
  onNext,
}: {
  preferences: Preferences;
  onBack: () => void;
  onNext: (preferences: Preferences) => void;
}) {
  const [value, setValue] = useState<Preferences>(preferences);

  function set<K extends keyof Preferences>(key: K, next: Preferences[K]) {
    setValue((prev) => ({ ...prev, [key]: next }));
  }

  function toggleProtected(label: string) {
    setValue((prev) => ({
      ...prev,
      protectedTimes: prev.protectedTimes.includes(label)
        ? prev.protectedTimes.filter((p) => p !== label)
        : [...prev.protectedTimes, label],
    }));
  }

  return (
    <StepShell
      title="Scheduling preferences"
      description="Fine-tune how Dailius should plan around your life."
    >
      <label className="block text-sm">
        <span className="font-semibold text-navy">Avoid scheduling after</span>
        <select
          value={value.avoidSchedulingAfter ?? ""}
          onChange={(event) => set("avoidSchedulingAfter", event.target.value || null)}
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
        >
          <option value="">No preference</option>
          {AVOID_AFTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-5">
        <p className="text-sm font-semibold text-navy">Protect time for</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROTECT_OPTIONS.map((label) => {
            const on = value.protectedTimes.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleProtected(label)}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to",
                  on
                    ? "border-brand-to bg-brand-to/[0.08] text-navy"
                    : "border-gray-200 bg-white text-gray-600 hover:border-brand-to/40",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="mt-5 block text-sm">
        <span className="font-semibold text-navy">Preferred workout length</span>
        <select
          value={value.preferredWorkoutLengthMinutes ?? ""}
          onChange={(event) =>
            set(
              "preferredWorkoutLengthMinutes",
              event.target.value ? Number(event.target.value) : null,
            )
          }
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
        >
          <option value="">No preference</option>
          {WORKOUT_LENGTH_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
        </select>
      </label>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-navy">Planning style</legend>
        <div className="mt-2 space-y-2">
          {PLANNING_STYLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                value.planningStyle === option.value
                  ? "border-brand-to bg-brand-to/[0.08]"
                  : "border-gray-200 bg-white hover:border-brand-to/40",
              )}
            >
              <input
                type="radio"
                name="planning-style"
                checked={value.planningStyle === option.value}
                onChange={() => set("planningStyle", option.value)}
                className="h-4 w-4 border-gray-300 text-brand-to focus:ring-brand-to"
              />
              <span className="text-navy">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <StepFooter>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={() => onNext(value)}>Continue</PrimaryButton>
      </StepFooter>
    </StepShell>
  );
}
