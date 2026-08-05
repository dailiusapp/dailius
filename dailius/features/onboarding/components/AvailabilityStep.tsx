"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Availability, TimeRange } from "../types";
import { PrimaryButton, SecondaryButton } from "./buttons";
import { StepFooter, StepShell } from "./StepShell";

const MAX_TIME_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
];

type BlockKey =
  | "weekdayMorning"
  | "weekdayAfternoon"
  | "weekdayEvening"
  | "weekendMorning"
  | "weekendAfternoon"
  | "weekendEvening";

const DEFAULT_AVAILABILITY_WINDOWS: Record<BlockKey, TimeRange> = {
  weekdayMorning: { start: "06:00", end: "12:00" },
  weekdayAfternoon: { start: "12:00", end: "17:00" },
  weekdayEvening: { start: "17:00", end: "21:00" },
  weekendMorning: { start: "06:00", end: "12:00" },
  weekendAfternoon: { start: "12:00", end: "17:00" },
  weekendEvening: { start: "17:00", end: "21:00" },
};

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

function BlockRow({
  label,
  blockKey,
  range,
  onChange,
}: {
  label: string;
  blockKey: BlockKey;
  range: TimeRange | null;
  onChange: (range: TimeRange | null) => void;
}) {
  const invalid = range !== null && range.end <= range.start;

  return (
    <div>
      <Toggle
        label={label}
        checked={range !== null}
        onChange={(checked) => onChange(checked ? DEFAULT_AVAILABILITY_WINDOWS[blockKey] : null)}
      />
      {range ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block text-xs">
            <span className="text-gray-500">Start</span>
            <input
              type="time"
              value={range.start}
              onChange={(event) => onChange({ ...range, start: event.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
            />
          </label>
          <label className="block text-xs">
            <span className="text-gray-500">End</span>
            <input
              type="time"
              value={range.end}
              onChange={(event) => onChange({ ...range, end: event.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
            />
          </label>
          {invalid ? <p className="col-span-2 text-xs text-red-600">End time must be after start time.</p> : null}
        </div>
      ) : null}
    </div>
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

  const hasInvalidRange = (
    [
      value.weekdayMorning,
      value.weekdayAfternoon,
      value.weekdayEvening,
      value.weekendMorning,
      value.weekendAfternoon,
      value.weekendEvening,
    ] as (TimeRange | null)[]
  ).some((range) => range !== null && range.end <= range.start);

  return (
    <StepShell title="When do you usually have time for flexible activities?">
      <div>
        <p className="text-sm font-semibold text-navy">Weekdays</p>
        <div className="mt-2 space-y-3">
          <BlockRow
            label="Morning"
            blockKey="weekdayMorning"
            range={value.weekdayMorning}
            onChange={(range) => set("weekdayMorning", range)}
          />
          <BlockRow
            label="Afternoon"
            blockKey="weekdayAfternoon"
            range={value.weekdayAfternoon}
            onChange={(range) => set("weekdayAfternoon", range)}
          />
          <BlockRow
            label="Evening"
            blockKey="weekdayEvening"
            range={value.weekdayEvening}
            onChange={(range) => set("weekdayEvening", range)}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-navy">Weekends</p>
        <div className="mt-2 space-y-3">
          <BlockRow
            label="Morning"
            blockKey="weekendMorning"
            range={value.weekendMorning}
            onChange={(range) => set("weekendMorning", range)}
          />
          <BlockRow
            label="Afternoon"
            blockKey="weekendAfternoon"
            range={value.weekendAfternoon}
            onChange={(range) => set("weekendAfternoon", range)}
          />
          <BlockRow
            label="Evening"
            blockKey="weekendEvening"
            range={value.weekendEvening}
            onChange={(range) => set("weekendEvening", range)}
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
        <PrimaryButton onClick={() => onNext(value)} disabled={hasInvalidRange}>
          Continue
        </PrimaryButton>
      </StepFooter>
    </StepShell>
  );
}
