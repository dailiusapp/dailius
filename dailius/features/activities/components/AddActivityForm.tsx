"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { FormField } from "@/features/auth/components/FormField";
import { createActivity } from "../services/createActivity";
import type { ActivityFieldErrors, FrequencyMode } from "../types";

const DURATION_OPTIONS = [15, 30, 45, 60, 90];
const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_OPTIONS = ["Morning", "Afternoon", "Evening"];
const FREQUENCY_OPTIONS = ["Daily", "3 times per week", "2 times per week", "Once per week", "Twice per month"];

const DEFAULTS = {
  name: "",
  durationMinutes: 60,
  frequencyMode: "days" as FrequencyMode,
  preferredDays: [] as string[],
  preferredFrequency: null as string | null,
  preferredTimeOfDay: null as string | null,
  flexible: true,
};

export function AddActivityForm() {
  const [name, setName] = useState(DEFAULTS.name);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULTS.durationMinutes);
  const [frequencyMode, setFrequencyMode] = useState<FrequencyMode>(DEFAULTS.frequencyMode);
  const [preferredDays, setPreferredDays] = useState<string[]>(DEFAULTS.preferredDays);
  const [preferredFrequency, setPreferredFrequency] = useState<string | null>(DEFAULTS.preferredFrequency);
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState<string | null>(DEFAULTS.preferredTimeOfDay);
  const [flexible, setFlexible] = useState(DEFAULTS.flexible);

  const [fieldError, setFieldError] = useState<Partial<Record<ActivityFieldErrors, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleDay(day: string) {
    setPreferredDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function switchMode(mode: FrequencyMode) {
    setFrequencyMode(mode);
    setPreferredDays([]);
    setPreferredFrequency(null);
  }

  function resetForm() {
    setName(DEFAULTS.name);
    setDurationMinutes(DEFAULTS.durationMinutes);
    setFrequencyMode(DEFAULTS.frequencyMode);
    setPreferredDays(DEFAULTS.preferredDays);
    setPreferredFrequency(DEFAULTS.preferredFrequency);
    setPreferredTimeOfDay(DEFAULTS.preferredTimeOfDay);
    setFlexible(DEFAULTS.flexible);
  }

  function validate(): Partial<Record<ActivityFieldErrors, string>> {
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
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const errors = validate();
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
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(["days", "timesPerWeek"] as const).map((mode) => (
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
              {mode === "days" ? "Specific days" : "Times per week"}
            </button>
          ))}
        </div>

        {frequencyMode === "days" ? (
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
