"use client";

import { useState, type FormEvent } from "react";
import { FormField } from "@/features/auth/components/FormField";
import { validateFullName } from "@/features/auth/utils/validation";
import { updateProfile } from "../services/updateProfile";

export function ProfileForm({ initialFullName }: { initialFullName: string }) {
  const [savedFullName, setSavedFullName] = useState(initialFullName);
  const [fullName, setFullName] = useState(initialFullName);
  const [error, setError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUnchanged = fullName.trim() === savedFullName.trim();

  function handleChange(value: string) {
    setFullName(value);
    setSuccessMessage(null);
    if (error) {
      setError(validateFullName(value));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isUnchanged) return;

    const validationError = validateFullName(fullName);
    setError(validationError);
    if (validationError) return;

    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    const result = await updateProfile({ fullName });
    setIsSubmitting(false);

    if (!result.ok) {
      if (result.field === "fullName") {
        setError(result.message);
      } else {
        setFormError(result.message);
      }
      return;
    }

    setSavedFullName(result.fullName);
    setFullName(result.fullName);
    setSuccessMessage("Your name has been updated.");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {formError}
        </p>
      ) : null}

      <FormField
        id="fullName"
        label="Full name"
        type="text"
        autoComplete="name"
        value={fullName}
        error={error}
        disabled={isSubmitting}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={(event) => setError(validateFullName(event.target.value))}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || isUnchanged}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-brand-from to-brand-to px-6 py-2.5 text-[15px] font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          {isSubmitting ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Saving...
            </>
          ) : (
            "Save Changes"
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
