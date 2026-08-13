"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { formatClockTime } from "@/features/planning/services/dateUtils";
import { updateCommitment } from "@/features/commitments/services/updateCommitment";
import { deleteCommitment } from "@/features/commitments/services/deleteCommitment";
import type { CommitmentFieldErrors, CommitmentForEdit } from "@/features/commitments/types";

const DURATION_OPTIONS = [15, 30, 45, 60, 90];
// Same Safari/Chrome AM-PM ambiguity workaround AddActivityForm uses for
// its own one-time-activity time picker — see that file's TIME_SLOT_OPTIONS
// comment for the full rationale.
const TIME_SLOT_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

export function CommitmentEditForm({
  commitment,
  titleId,
  onDone,
}: {
  commitment: CommitmentForEdit;
  titleId: string;
  onDone: () => void;
}) {
  if (commitment.source !== "Manual") {
    return (
      <div>
        <h2 id={titleId} className="text-lg font-semibold text-navy">
          {commitment.title}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {commitment.scheduledDate} · {formatClockTime(commitment.scheduledTime)}
        </p>
        <p className="mt-4 rounded-xl border border-gray-200 bg-surface px-4 py-3 text-sm text-gray-600">
          Synced from {commitment.source} — edit or delete it there.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onDone}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-brand-to/40"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return <ManualCommitmentEditForm commitment={commitment} titleId={titleId} onDone={onDone} />;
}

function ManualCommitmentEditForm({
  commitment,
  titleId,
  onDone,
}: {
  commitment: CommitmentForEdit;
  titleId: string;
  onDone: () => void;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(commitment.title);
  const [scheduledTime, setScheduledTime] = useState(commitment.scheduledTime);
  const [durationMinutes, setDurationMinutes] = useState(commitment.durationMinutes);
  // Kept uncontrolled for the same Safari reason AddActivityForm's date
  // input is — see that file's dateInputRef comment.
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [fieldError, setFieldError] = useState<Partial<Record<CommitmentFieldErrors, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const durationOptions = DURATION_OPTIONS.includes(commitment.durationMinutes)
    ? DURATION_OPTIONS
    : [...DURATION_OPTIONS, commitment.durationMinutes].sort((a, b) => a - b);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const scheduledDate = dateInputRef.current?.value || "";
    const errors: Partial<Record<CommitmentFieldErrors, string>> = {};
    if (!title.trim()) errors.title = "Give this commitment a name.";
    if (!scheduledDate) errors.scheduledDate = "Pick a date.";
    if (!scheduledTime) errors.scheduledTime = "Pick a time.";
    setFieldError(errors);
    if (Object.keys(errors).length > 0) return;

    setFormError(null);
    setIsSaving(true);
    const result = await updateCommitment({
      id: commitment.id,
      title,
      scheduledDate,
      scheduledTime,
      durationMinutes,
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
    const result = await deleteCommitment(commitment.id);
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
        Edit Commitment
      </h2>

      {formError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <label className="block text-sm">
        <span className="font-medium text-navy">Title</span>
        <input
          type="text"
          value={title}
          disabled={isSaving}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={fieldError.title ? true : undefined}
          className={cn(
            "mt-1.5 block w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2",
            fieldError.title ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:border-brand-to focus:ring-brand-to",
          )}
        />
        {fieldError.title ? (
          <p role="alert" className="mt-1.5 text-sm text-red-600">
            {fieldError.title}
          </p>
        ) : null}
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm" htmlFor="commitment-date">
          <span className="font-medium text-navy">Date</span>
          <input
            id="commitment-date"
            type="date"
            ref={dateInputRef}
            defaultValue={commitment.scheduledDate}
            disabled={isSaving}
            aria-invalid={fieldError.scheduledDate ? true : undefined}
            className={cn(
              "mt-1.5 block w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2",
              fieldError.scheduledDate
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:border-brand-to focus:ring-brand-to",
            )}
          />
          {fieldError.scheduledDate ? (
            <p role="alert" className="mt-1.5 text-sm text-red-600">
              {fieldError.scheduledDate}
            </p>
          ) : null}
        </label>

        <label className="block text-sm" htmlFor="commitment-time">
          <span className="font-medium text-navy">Time</span>
          <select
            id="commitment-time"
            value={scheduledTime}
            disabled={isSaving}
            onChange={(event) => setScheduledTime(event.target.value)}
            aria-invalid={fieldError.scheduledTime ? true : undefined}
            className={cn(
              "mt-1.5 block w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2",
              fieldError.scheduledTime
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:border-brand-to focus:ring-brand-to",
            )}
          >
            {TIME_SLOT_OPTIONS.map((slot) => (
              <option key={slot} value={slot}>
                {formatClockTime(slot)}
              </option>
            ))}
          </select>
          {fieldError.scheduledTime ? (
            <p role="alert" className="mt-1.5 text-sm text-red-600">
              {fieldError.scheduledTime}
            </p>
          ) : null}
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-navy">Duration</span>
        <select
          value={durationMinutes}
          disabled={isSaving}
          onChange={(event) => setDurationMinutes(Number(event.target.value))}
          className="mt-1.5 block w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to"
        >
          {durationOptions.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
        </select>
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
            <span className="text-sm text-gray-600">Delete this commitment?</span>
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
