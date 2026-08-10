"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { FormField } from "@/features/auth/components/FormField";
import type { Goal } from "@/features/goals/types";
import { formatClockTime } from "@/features/planning/services/dateUtils";
import { createActivity } from "../services/createActivity";
import type { ActivityFieldErrors, FrequencyMode } from "../types";

const DURATION_OPTIONS = [15, 30, 45, 60, 90];
const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_OPTIONS = ["Morning", "Afternoon", "Evening"];
const FREQUENCY_OPTIONS = ["Daily", "3 times per week", "2 times per week", "Once per week", "Twice per month"];
// Explicit slots rather than a native <input type="time"> — browsers disagree
// on whether that widget honors a forced 12h/24h format (the `lang` trick
// works in Chrome but not Safari), so a picked "10:00" can silently mean
// 10 AM or 10 PM depending on the browser. A labeled dropdown removes that
// ambiguity: the displayed label and the stored "HH:MM" value can't diverge.
const TIME_SLOT_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

const DEFAULTS = {
  name: "",
  durationMinutes: 60,
  frequencyMode: "days" as FrequencyMode,
  preferredDays: [] as string[],
  preferredFrequency: null as string | null,
  preferredTimeOfDay: null as string | null,
  flexible: true,
  scheduledDate: null as string | null,
  scheduledTime: null as string | null,
};

function todayISODate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Builds the Date from explicit numeric components rather than parsing
// "${date}T${time}" as a string — engines don't agree on whether a
// timezone-less ISO date-time string parses as local time or UTC, which
// made a same-day pick look already in the past while a next-day pick
// (shifted by the same offset but still landing in the future) did not.
// The numeric-argument Date constructor has no such ambiguity: it's always
// local time.
function parseLocalDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export function AddActivityForm({ initialGoals }: { initialGoals: Goal[] }) {
  const [name, setName] = useState(DEFAULTS.name);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULTS.durationMinutes);
  const [frequencyMode, setFrequencyMode] = useState<FrequencyMode>(DEFAULTS.frequencyMode);
  const [preferredDays, setPreferredDays] = useState<string[]>(DEFAULTS.preferredDays);
  const [preferredFrequency, setPreferredFrequency] = useState<string | null>(DEFAULTS.preferredFrequency);
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState<string | null>(DEFAULTS.preferredTimeOfDay);
  const [flexible, setFlexible] = useState(DEFAULTS.flexible);
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string | null>(DEFAULTS.scheduledDate);
  const [scheduledTime, setScheduledTime] = useState<string | null>(DEFAULTS.scheduledTime);
  // Safari doesn't reliably fire onChange/input for a native <input
  // type="date"> when a value is picked via the OS-level picker UI, so React
  // state can silently go stale even though the field still shows the
  // picked value. It's kept uncontrolled (defaultValue, not value) and read
  // directly from the DOM at submit time as the source of truth.
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [fieldError, setFieldError] = useState<Partial<Record<ActivityFieldErrors, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleDay(day: string) {
    setPreferredDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function toggleGoal(goalId: string) {
    setGoalIds((prev) => (prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]));
  }

  function switchMode(mode: FrequencyMode) {
    setFrequencyMode(mode);
    setPreferredDays([]);
    setPreferredFrequency(null);
    setScheduledDate(null);
    setScheduledTime(null);
  }

  function resetForm() {
    setName(DEFAULTS.name);
    setDurationMinutes(DEFAULTS.durationMinutes);
    setFrequencyMode(DEFAULTS.frequencyMode);
    setPreferredDays(DEFAULTS.preferredDays);
    setPreferredFrequency(DEFAULTS.preferredFrequency);
    setPreferredTimeOfDay(DEFAULTS.preferredTimeOfDay);
    setFlexible(DEFAULTS.flexible);
    setGoalIds([]);
    setScheduledDate(DEFAULTS.scheduledDate);
    setScheduledTime(DEFAULTS.scheduledTime);
  }

  function validate(dateValue: string | null, timeValue: string | null): Partial<Record<ActivityFieldErrors, string>> {
    const errors: Partial<Record<ActivityFieldErrors, string>> = {};
    if (!name.trim()) {
      errors.name = "Give this activity a name.";
    }
    if (frequencyMode === "days" && preferredDays.length === 0) {
      errors.preferredDays = "Pick at least one day.";
    }
    if (frequencyMode === "timesPerWeek" && !preferredFrequency) {
      errors.preferredFrequency = "Pick how often this happens.";
    }
    if (frequencyMode === "oneTime") {
      if (!dateValue) {
        errors.scheduledDate = "Pick a date.";
      }
      if (!timeValue) {
        errors.scheduledTime = "Pick a time.";
      }
      if (dateValue && timeValue && parseLocalDateTime(dateValue, timeValue) < new Date()) {
        errors.scheduledTime = "Pick a date and time in the future.";
      }
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const dateValue = frequencyMode === "oneTime" ? dateInputRef.current?.value || null : scheduledDate;
    const timeValue = scheduledTime;

    const errors = validate(dateValue, timeValue);
    setFieldError(errors);
    if (Object.keys(errors).length > 0) return;

    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    const result = await createActivity({
      name,
      durationMinutes,
      frequencyMode,
      preferredDays,
      preferredFrequency,
      preferredTimeOfDay,
      flexible,
      goalIds,
      scheduledDate: dateValue,
      scheduledTime: timeValue,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      if (result.field) {
        setFieldError({ [result.field]: result.message });
      } else {
        setFormError(result.message);
      }
      return;
    }

    if (dateInputRef.current) dateInputRef.current.value = "";
    resetForm();
    setSuccessMessage("Added! You can add another activity below.");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <FormField
        id="activity-name"
        label="Activity name"
        type="text"
        placeholder="e.g. Morning Run"
        value={name}
        error={fieldError.name}
        disabled={isSubmitting}
        onChange={(event) => setName(event.target.value)}
      />

      <label className="block text-sm">
        <span className="font-medium text-navy">Duration</span>
        <select
          value={durationMinutes}
          disabled={isSubmitting}
          onChange={(event) => setDurationMinutes(Number(event.target.value))}
          className="mt-1.5 block w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
        >
          {DURATION_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="text-sm font-medium text-navy">How often</span>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(["days", "timesPerWeek", "oneTime"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={isSubmitting}
              onClick={() => switchMode(mode)}
              aria-pressed={frequencyMode === mode}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60",
                frequencyMode === mode
                  ? "border-brand-to bg-brand-to/[0.08] text-navy"
                  : "border-gray-200 bg-white text-gray-700 hover:border-brand-to/40",
              )}
            >
              {mode === "days" ? "Specific days" : mode === "timesPerWeek" ? "Times per week" : "One time"}
            </button>
          ))}
        </div>

        {frequencyMode === "oneTime" ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <FormField
              id="activity-date"
              label="Date"
              type="date"
              min={todayISODate()}
              ref={dateInputRef}
              defaultValue={scheduledDate ?? ""}
              error={fieldError.scheduledDate}
              disabled={isSubmitting}
              onChange={(event) => setScheduledDate(event.target.value || null)}
            />
            <label className="block text-sm" htmlFor="activity-time">
              <span className="font-medium text-navy">Time</span>
              <select
                id="activity-time"
                value={scheduledTime ?? ""}
                disabled={isSubmitting}
                onChange={(event) => setScheduledTime(event.target.value || null)}
                aria-invalid={fieldError.scheduledTime ? true : undefined}
                aria-describedby={fieldError.scheduledTime ? "activity-time-error" : undefined}
                className={cn(
                  "mt-1.5 block w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2",
                  fieldError.scheduledTime
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 focus:border-brand-to focus:ring-brand-to",
                )}
              >
                <option value="">Select time</option>
                {TIME_SLOT_OPTIONS.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatClockTime(slot)}
                  </option>
                ))}
              </select>
              {fieldError.scheduledTime ? (
                <p id="activity-time-error" role="alert" className="mt-1.5 text-sm text-red-600">
                  {fieldError.scheduledTime}
                </p>
              ) : null}
            </label>
          </div>
        ) : frequencyMode === "days" ? (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1.5">
              {DAY_OPTIONS.map((day) => {
                const on = preferredDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => toggleDay(day)}
                    aria-pressed={on}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60",
                      on
                        ? "border-brand-to bg-brand-to/[0.08] text-navy"
                        : "border-gray-200 bg-white text-gray-600 hover:border-brand-to/40",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {fieldError.preferredDays ? (
              <p role="alert" className="mt-1.5 text-sm text-red-600">
                {fieldError.preferredDays}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-3">
            <select
              value={preferredFrequency ?? ""}
              disabled={isSubmitting}
              onChange={(event) => setPreferredFrequency(event.target.value || null)}
              className={cn(
                "block w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2",
                fieldError.preferredFrequency
                  ? "border-red-400 focus:ring-red-400"
                  : "border-gray-300 focus:border-brand-to focus:ring-brand-to",
              )}
            >
              <option value="">Select frequency</option>
              {FREQUENCY_OPTIONS.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {frequency}
                </option>
              ))}
            </select>
            {fieldError.preferredFrequency ? (
              <p role="alert" className="mt-1.5 text-sm text-red-600">
                {fieldError.preferredFrequency}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {frequencyMode !== "oneTime" ? (
        <label className="block text-sm">
          <span className="font-medium text-navy">Preferred time</span>
          <select
            value={preferredTimeOfDay ?? ""}
            disabled={isSubmitting}
            onChange={(event) => setPreferredTimeOfDay(event.target.value || null)}
            className="mt-1.5 block w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
          >
            <option value="">No preference</option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {frequencyMode !== "oneTime" ? (
        <div>
          <span className="text-sm font-medium text-navy">Link to goal(s)</span>
          {initialGoals.length === 0 ? (
            <p className="mt-1.5 text-sm text-gray-500">
              You don&apos;t have any goals yet —{" "}
              <Link href="/goals" className="font-medium text-navy underline underline-offset-2">
                create one on the Goals page
              </Link>{" "}
              to link it here.
            </p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {initialGoals.map((goal) => {
                const on = goalIds.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => toggleGoal(goal.id)}
                    aria-pressed={on}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60",
                      on
                        ? "border-brand-to bg-brand-to/[0.08] text-navy"
                        : "border-gray-200 bg-white text-gray-600 hover:border-brand-to/40",
                    )}
                  >
                    {goal.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {frequencyMode !== "oneTime" ? (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={flexible}
            disabled={isSubmitting}
            onChange={(event) => setFlexible(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-to focus:ring-brand-to"
          />
          Flexible timing — allow the planner to shift this if needed
        </label>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-brand-from to-brand-to px-6 py-2.5 text-[15px] font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          {isSubmitting ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Adding...
            </>
          ) : (
            "Add Activity"
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
