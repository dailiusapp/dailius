"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Availability } from "../types";
import { PrimaryButton, SecondaryButton } from "./buttons";
import { StepFooter, StepShell } from "./StepShell";

const MAX_TIME_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
];

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={cn(
        "rounded-xl border px-4 py-3 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to",
        checked
          ? "border-brand-to bg-brand-to/[0.08] text-navy"
          : "border-gray-200 bg-white text-gray-700 hover:border-brand-to/40",
      )}
    >
      {label}
    </button>
  );
}

export function AvailabilityStep({
  availability,
  onBack,
  onNext,
}: {
  availability: Availability;
  onBack: () => void;
  onNext: (availability: Availability) => void;
}) {
  const [value, setValue] = useState<Availability>(availability);

  function set<K extends keyof Availability>(key: K, next: Availability[K]) {
    setValue((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <StepShell title="When do you usually have time for flexible activities?">
      <div>
        <p className="text-sm font-semibold text-navy">Weekdays</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Toggle
            label="Morning"
            checked={value.weekdayMorning}
            onChange={(v) => set("weekdayMorning", v)}
          />
          <Toggle
            label="Afternoon"
            checked={value.weekdayAfternoon}
            onChange={(v) => set("weekdayAfternoon", v)}
          />
          <Toggle
            label="Evening"
            checked={value.weekdayEvening}
            onChange={(v) => set("weekdayEvening", v)}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-navy">Weekends</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Toggle
            label="Morning"
            checked={value.weekendMorning}
            onChange={(v) => set("weekendMorning", v)}
          />
          <Toggle
            label="Afternoon"
            checked={value.weekendAfternoon}
            onChange={(v) => set("weekendAfternoon", v)}
          />
          <Toggle
            label="Evening"
            checked={value.weekendEvening}
            onChange={(v) => set("weekendEvening", v)}
          />
        </div>
      </div>

      <label className="mt-5 block text-sm">
        <span className="font-semibold text-navy">Maximum daily planning time</span>
        <select
          value={value.maxDailyPlanningMinutes ?? ""}
          onChange={(event) =>
            set("maxDailyPlanningMinutes", event.target.value ? Number(event.target.value) : null)
          }
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
        >
          <option value="">No preference</option>
          {MAX_TIME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <StepFooter>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={() => onNext(value)}>Continue</PrimaryButton>
      </StepFooter>
    </StepShell>
  );
}
