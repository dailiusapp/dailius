"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { GoalSelection, Priority } from "../types";
import { PrimaryButton, SecondaryButton } from "./buttons";
import { StepFooter, StepShell } from "./StepShell";

const GOAL_OPTIONS = [
  "Running",
  "Cycling",
  "Strength Training",
  "Walking",
  "Reading",
  "Learning",
  "Meditation",
  "Guitar",
  "Music Practice",
  "Family Time",
  "Personal Projects",
  "Cooking",
  "Housework",
  "Other",
] as const;

const FREQUENCY_OPTIONS = [
  "Daily",
  "3 times per week",
  "2 times per week",
  "Once per week",
  "Twice per month",
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function keyFor(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

export function GoalsStep({
  goals,
  onBack,
  onNext,
}: {
  goals: GoalSelection[];
  onBack: () => void;
  onNext: (goals: GoalSelection[]) => void;
}) {
  const [selected, setSelected] = useState<GoalSelection[]>(goals);

  function toggle(label: string) {
    const key = keyFor(label);
    setSelected((prev) =>
      prev.some((g) => g.key === key)
        ? prev.filter((g) => g.key !== key)
        : [...prev, { key, label, frequency: FREQUENCY_OPTIONS[1], priority: "medium" }],
    );
  }

  function updateGoal(key: string, patch: Partial<GoalSelection>) {
    setSelected((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  }

  return (
    <StepShell
      title="What would you like to make more time for?"
      description="Select as many as you'd like."
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GOAL_OPTIONS.map((label) => {
          const key = keyFor(label);
          const active = selected.some((g) => g.key === key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(label)}
              aria-pressed={active}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to",
                active
                  ? "border-brand-to bg-brand-to/[0.08] text-navy"
                  : "border-gray-200 bg-white text-gray-700 hover:border-brand-to/40",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {selected.length > 0 ? (
        <div className="mt-6 space-y-3">
          {selected.map((goal) => (
            <div key={goal.key} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-navy">{goal.label}</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-gray-600">Frequency</span>
                  <select
                    value={goal.frequency}
                    onChange={(event) => updateGoal(goal.key, { frequency: event.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
                  >
                    {FREQUENCY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Priority</span>
                  <select
                    value={goal.priority}
                    onChange={(event) =>
                      updateGoal(goal.key, { priority: event.target.value as Priority })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <StepFooter>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={() => onNext(selected)}>Continue</PrimaryButton>
      </StepFooter>
    </StepShell>
  );
}
