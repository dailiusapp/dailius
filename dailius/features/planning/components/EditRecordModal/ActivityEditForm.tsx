"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { updateActivity } from "@/features/activities/services/updateActivity";
import { deleteActivity } from "@/features/activities/services/deleteActivity";
import type { ActivityFieldErrors, ActivityForEdit, ActivityFrequencyMode } from "@/features/activities/types";
import type { Goal } from "@/features/goals/types";

const DURATION_OPTIONS = [15, 30, 45, 60, 90];
const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_OPTIONS = ["Morning", "Afternoon", "Evening"];
const FREQUENCY_OPTIONS = ["Daily", "3 times per week", "2 times per week", "Once per week", "Twice per month"];

function chipClasses(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60",
    active
      ? "border-brand-to bg-brand-to/[0.08] text-navy"
      : "border-gray-200 bg-white text-gray-600 hover:border-brand-to/40",
  );
}

export function ActivityEditForm({
  activity,
  goals,
  titleId,
  onDone,
}: {
  activity: ActivityForEdit;
  goals: Goal[];
  titleId: string;
  onDone: () => void;
}) {
  const router = useRouter();

  const [name, setName] = useState(activity.name);
  const [durationMinutes, setDurationMinutes] = useState(activity.durationMinutes);
  const [frequencyMode, setFrequencyMode] = useState<ActivityFrequencyMode>(activity.frequencyMode);
  const [preferredDays, setPreferredDays] = useState<string[]>(activity.preferredDays);
  const [preferredFrequency, setPreferredFrequency] = useState<string | null>(activity.preferredFrequency);
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState<string | null>(activity.preferredTimeOfDay);
  const [flexible, setFlexible] = useState(activity.flexible);
  const [goalIds, setGoalIds] = useState<string[]>(activity.goalIds);

  const [fieldError, setFieldError] = useState<Partial<Record<ActivityFieldErrors, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function toggleDay(day: string) {
    setPreferredDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function toggleGoal(goalId: string) {
    setGoalIds((prev) => (prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]));
  }

  function switchMode(mode: ActivityFrequencyMode) {
    setFrequencyMode(mode);
    setPreferredDays([]);
    setPreferredFrequency(null);
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
    if (isSaving) return;

    const errors = validate();
    setFieldError(errors);
    if (Object.keys(errors).length > 0) return;

    setFormError(null);
    setIsSaving(true);
    const result = await updateActivity({
      id: activity.id,
      name,
      durationMinutes,
      frequencyMode,
      preferredDays,
      preferredFrequency,
      preferredTimeOfDay,
      flexible,
      goalIds,
    });
    setIsSaving(false);

    if (!result.ok) {
      if (result.field) {
        setFieldError({ [result.field]: result.message });
      } else {
        setFormError(result.message);
      }
      return;
    }

    router.refresh();
    onDone();
  }

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteActivity(activity.id);
    setIsDeleting(false);

    if (!result.ok) {
      setFormError(result.message);
      setConfirmingDelete(false);
      return;
    }

    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <h2 id={titleId} className="text-lg font-semibold text-navy">
        Edit Activity
      </h2>
      <p className="-mt-3 text-[13px] leading-5 text-gray-500">
        Changes here apply to all future occurrences of this activity — it won&apos;t change anything that&apos;s
        already happened.
      </p>

      {formError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <label className="block text-sm">
        <span className="font-medium text-navy">Activity name</span>
        <input
          type="text"
          value={name}
          disabled={isSaving}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={fieldError.name ? true : undefined}
          className={cn(
            "mt-1.5 block w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2",
            fieldError.name ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:border-brand-to focus:ring-brand-to",
          )}
        />
        {fieldError.name ? (
          <p role="alert" className="mt-1.5 text-sm text-red-600">
            {fieldError.name}
          </p>
        ) : null}
      </label>

      <label className="block text-sm">
        <span className="font-medium text-navy">Duration</span>
        <select
          value={durationMinutes}
          disabled={isSaving}
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
              disabled={isSaving}
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
                    disabled={isSaving}
                    onClick={() => toggleDay(day)}
                    aria-pressed={on}
                    className={chipClasses(on)}
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
              disabled={isSaving}
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
          disabled={isSaving}
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

      {goals.length > 0 ? (
        <div>
          <span className="text-sm font-medium text-navy">Link to goal(s)</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {goals.map((goal) => {
              const on = goalIds.includes(goal.id);
              return (
                <button
                  key={goal.id}
                  type="button"
                  disabled={isSaving}
                  onClick={() => toggleGoal(goal.id)}
                  aria-pressed={on}
                  className={chipClasses(on)}
                >
                  {goal.title}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={flexible}
          disabled={isSaving}
          onChange={(event) => setFlexible(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-to focus:ring-brand-to"
        />
        Flexible timing — allow the planner to shift this if needed
      </label>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <button
          type="submit"
          disabled={isSaving || isDeleting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-brand-from to-brand-to px-6 py-2.5 text-[15px] font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>

        {confirmingDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Delete this activity?</span>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Confirm"}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setConfirmingDelete(false)}
              className="text-sm font-medium text-gray-500 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => setConfirmingDelete(true)}
            className="text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-red-600"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
