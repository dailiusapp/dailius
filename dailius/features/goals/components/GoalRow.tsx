"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { GoalPriority } from "@/features/planning/types";
import { GOAL_PRIORITY_LABELS, GOAL_PRIORITY_STYLES, GOAL_STATUS_LABELS, GOAL_STATUS_STYLES } from "../constants";
import { updateGoal } from "../services/updateGoal";
import { deleteGoal } from "../services/deleteGoal";
import type { Goal, GoalStatus } from "../types";

const PRIORITY_OPTIONS: { value: GoalPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

function chipClasses(active: boolean) {
  return cn(
    "rounded-xl border px-3 py-2 text-center text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60",
    active
      ? "border-brand-to bg-brand-to/[0.08] text-navy"
      : "border-gray-200 bg-white text-gray-700 hover:border-brand-to/40",
  );
}

export function GoalRow({
  goal,
  onUpdated,
  onDeleted,
}: {
  goal: Goal;
  onUpdated: (goal: Goal) => void;
  onDeleted: (goalId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [priority, setPriority] = useState<GoalPriority>(goal.priority);
  const [status, setStatus] = useState<GoalStatus>(goal.status);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function cancelEdit() {
    setTitle(goal.title);
    setDescription(goal.description ?? "");
    setPriority(goal.priority);
    setStatus(goal.status);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Give this goal a name.");
      return;
    }

    setError(null);
    setIsSaving(true);
    const result = await updateGoal({ id: goal.id, title, description: description || null, priority, status });
    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onUpdated(result.goal);
    setIsEditing(false);
  }

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteGoal(goal.id);
    setIsDeleting(false);

    if (!result.ok) {
      setError(result.message);
      setConfirmingDelete(false);
      return;
    }

    onDeleted(goal.id);
  }

  if (isEditing) {
    return (
      <li className="rounded-xl border border-gray-200 px-4 py-4 text-sm">
        <div className="space-y-3">
          {error ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <input
            type="text"
            value={title}
            disabled={isSaving}
            onChange={(event) => setTitle(event.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-navy focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
          />
          <textarea
            value={description}
            disabled={isSaving}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="Description (optional)"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
          />

          <div>
            <span className="text-xs text-gray-500">Priority</span>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isSaving}
                  onClick={() => setPriority(option.value)}
                  aria-pressed={priority === option.value}
                  className={chipClasses(priority === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-500">Status</span>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isSaving}
                  onClick={() => setStatus(option.value)}
                  aria-pressed={status === option.value}
                  className={chipClasses(status === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="rounded-full bg-gradient-to-b from-brand-from to-brand-to px-4 py-2 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={cancelEdit}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-brand-to/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
      {error ? (
        <p role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-navy">{goal.title}</p>
          {goal.description ? <p className="mt-0.5 text-gray-500">{goal.description}</p> : null}
          <p className="mt-1 text-[13px] text-gray-500">
            {goal.linkedActivityCount > 0
              ? `${goal.linkedActivityCount} activit${goal.linkedActivityCount === 1 ? "y" : "ies"} linked`
              : "No activities linked yet — link one from Add Activity"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", GOAL_PRIORITY_STYLES[goal.priority])}>
            {GOAL_PRIORITY_LABELS[goal.priority]}
          </span>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", GOAL_STATUS_STYLES[goal.status])}>
            {GOAL_STATUS_LABELS[goal.status]}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {confirmingDelete ? (
          <>
            <span className="text-sm text-gray-600">Delete this goal?</span>
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
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium text-navy underline underline-offset-2"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-red-600"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}
