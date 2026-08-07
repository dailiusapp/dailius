"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import type { Availability, TimeRange } from "@/features/onboarding/types";
import { updateAvailability } from "../services/updateAvailability";

const MAX_TIME_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
];

type BlockKey = keyof Omit<Availability, "maxDailyPlanningMinutes">;

const DEFAULT_WINDOWS: Record<BlockKey, TimeRange> = {
  weekdayMorning: { start: "06:00", end: "12:00" },
  weekdayAfternoon: { start: "12:00", end: "17:00" },
  weekdayEvening: { start: "17:00", end: "21:00" },
  weekendMorning: { start: "06:00", end: "12:00" },
  weekendAfternoon: { start: "12:00", end: "17:00" },
  weekendEvening: { start: "17:00", end: "21:00" },
};

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
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
  disabled,
  onChange,
}: {
  label: string;
  blockKey: BlockKey;
  range: TimeRange | null;
  disabled: boolean;
  onChange: (range: TimeRange | null) => void;
}) {
  const invalid = range !== null && range.end <= range.start;

  return (
    <div>
      <Toggle
        label={label}
        checked={range !== null}
        onChange={(checked) => !disabled && onChange(checked ? DEFAULT_WINDOWS[blockKey] : null)}
      />
      {range ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block text-xs">
            <span className="text-gray-500">Start</span>
            <input
              type="time"
              value={range.start}
              disabled={disabled}
              onChange={(event) => onChange({ ...range, start: event.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="block text-xs">
            <span className="text-gray-500">End</span>
            <input
              type="time"
              value={range.end}
              disabled={disabled}
              onChange={(event) => onChange({ ...range, end: event.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          {invalid ? <p className="col-span-2 text-xs text-red-600">End time must be after start time.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function AvailabilityForm({ initialAvailability }: { initialAvailability: Availability }) {
  const [value, setValue] = useState<Availability>(initialAvailability);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof Availability>(key: K, next: Availability[K]) {
    setValue((prev) => ({ ...prev, [key]: next }));
  }

  const hasInvalidRange = (
    [value.weekdayMorning, value.weekdayAfternoon, value.weekdayEvening, value.weekendMorning, value.weekendAfternoon, value.weekendEvening] as (TimeRange | null)[]
  ).some((range) => range !== null && range.end <= range.start);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || hasInvalidRange) return;

    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    const result = await updateAvailability(value);
    setIsSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    setSuccessMessage("Availability updated.");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <div>
        <p className="text-sm font-semibold text-navy">Weekdays</p>
        <div className="mt-2 space-y-3">
          <BlockRow label="Morning" blockKey="weekdayMorning" range={value.weekdayMorning} disabled={isSubmitting} onChange={(r) => set("weekdayMorning", r)} />
          <BlockRow label="Afternoon" blockKey="weekdayAfternoon" range={value.weekdayAfternoon} disabled={isSubmitting} onChange={(r) => set("weekdayAfternoon", r)} />
          <BlockRow label="Evening" blockKey="weekdayEvening" range={value.weekdayEvening} disabled={isSubmitting} onChange={(r) => set("weekdayEvening", r)} />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-navy">Weekends</p>
        <div className="mt-2 space-y-3">
          <BlockRow label="Morning" blockKey="weekendMorning" range={value.weekendMorning} disabled={isSubmitting} onChange={(r) => set("weekendMorning", r)} />
          <BlockRow label="Afternoon" blockKey="weekendAfternoon" range={value.weekendAfternoon} disabled={isSubmitting} onChange={(r) => set("weekendAfternoon", r)} />
          <BlockRow label="Evening" blockKey="weekendEvening" range={value.weekendEvening} disabled={isSubmitting} onChange={(r) => set("weekendEvening", r)} />
        </div>
      </div>

      <label className="block text-sm">
        <span className="font-semibold text-navy">Maximum daily planning time</span>
        <select
          value={value.maxDailyPlanningMinutes ?? ""}
          disabled={isSubmitting}
          onChange={(event) => set("maxDailyPlanningMinutes", event.target.value ? Number(event.target.value) : null)}
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to disabled:cursor-not-allowed disabled:opacity-70"
        >
          <option value="">No preference</option>
          {MAX_TIME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || hasInvalidRange}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-brand-from to-brand-to px-6 py-2.5 text-[15px] font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          {isSubmitting ? (
            <>
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Saving...
            </>
          ) : (
            "Save Availability"
          )}
        </button>
        {successMessage ? (
          <p role="status" className="text-sm text-green-700">
            {successMessage}
          </p>
        ) : null}
      </div>
    </form>
  );
}
