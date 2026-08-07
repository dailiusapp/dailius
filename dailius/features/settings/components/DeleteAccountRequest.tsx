"use client";

import { useState } from "react";
import { requestAccountDeletion } from "../services/requestAccountDeletion";
import { cancelAccountDeletion } from "../services/cancelAccountDeletion";

export function DeleteAccountRequest({ initialRequestedAt }: { initialRequestedAt: string | null }) {
  const [requestedAt, setRequestedAt] = useState(initialRequestedAt);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequest() {
    setIsSubmitting(true);
    setError(null);
    const result = await requestAccountDeletion();
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setRequestedAt(result.requestedAt);
    setConfirming(false);
  }

  async function handleCancel() {
    setIsSubmitting(true);
    setError(null);
    const result = await cancelAccountDeletion();
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setRequestedAt(null);
  }

  if (requestedAt) {
    const formatted = new Date(requestedAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return (
      <div className="space-y-3">
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <p className="text-sm text-gray-600">
          Deletion requested on {formatted}. We&apos;ll be in touch before anything is removed.
        </p>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleCancel}
          className="text-sm font-medium text-navy underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Cancelling..." : "Cancel request"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-gray-600">
        This permanently deletes your account and all its data — plans, goals, activities, and calendar
        connections. We&apos;ll process the request; this isn&apos;t instant.
      </p>
      {confirming ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-red-700">Are you sure?</span>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleRequest}
            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Confirm"}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setConfirming(false)}
            className="text-sm font-medium text-gray-500 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-100"
        >
          Request Account Deletion
        </button>
      )}
    </div>
  );
}
