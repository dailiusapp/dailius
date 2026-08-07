"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { FormField } from "@/features/auth/components/FormField";
import type { GoalPriority } from "@/features/planning/types";
import { createGoal } from "../services/createGoal";
import type { Goal, GoalFieldErrors } from "../types";

const PRIORITY_OPTIONS: { value: GoalPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const DEFAULTS = {
  title: "",
  description: "",
  priority: "medium" as GoalPriority,
};

export function CreateGoalForm({ onCreated }: { onCreated: (goal: Goal) => void }) {
  const [title, setTitle] = useState(DEFAULTS.title);
  const [description, setDescription] = useState(DEFAULTS.description);
  const [priority, setPriority] = useState<GoalPriority>(DEFAULTS.priority);

  const [fieldError, setFieldError] = useState<Partial<Record<GoalFieldErrors, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!title.trim()) {
      setFieldError({ title: "Give this goal a name." });
      return;
    }

    setFieldError({});
    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    const result = await createGoal({ title, description: description || null, priority });
    setIsSubmitting(false);

    if (!result.ok) {
      if (result.field) {
        setFieldError({ [result.field]: result.message });
      } else {
        setFormError(result.message);
      }
      return;
    }

    setTitle(DEFAULTS.title);
    setDescription(DEFAULTS.description);
    setPriority(DEFAULTS.priority);
    setSuccessMessage("Goal added.");
    onCreated(result.goal);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <FormField
        id="goal-title"
        label="Goal"
        type="text"
        placeholder="e.g. Run a 10K"
        value={title}
        error={fieldError.title}
        disabled={isSubmitting}
        onChange={(event) => setTitle(event.target.value)}
      />

      <label className="block text-sm">
        <span className="font-medium text-navy">Description (optional)</span>
        <textarea
          value={description}
          disabled={isSubmitting}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className={cn(
            "mt-1.5 block w-full rounded-xl border px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2",
            fieldError.description
              ? "border-red-400 focus:ring-red-400"
              : "border-gray-300 focus:border-brand-to focus:ring-brand-to",
          )}
        />
        {fieldError.description ? (
          <p role="alert" className="mt-1.5 text-sm text-red-600">
            {fieldError.description}
          </p>
        ) : null}
      </label>

      <div>
        <span className="text-sm font-medium text-navy">Priority</span>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={isSubmitting}
              onClick={() => setPriority(option.value)}
              aria-pressed={priority === option.value}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60",
                priority === option.value
                  ? "border-brand-to bg-brand-to/[0.08] text-navy"
                  : "border-gray-200 bg-white text-gray-700 hover:border-brand-to/40",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

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
            "Add Goal"
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
