"use client";

import { useState, type FormEvent } from "react";
import { FormField } from "@/features/auth/components/FormField";
import { validateLoginPassword, validatePassword } from "@/features/auth/utils/validation";
import { changePassword } from "../services/changePassword";
import type { PasswordFieldErrors } from "../types";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldError, setFieldError] = useState<Partial<Record<PasswordFieldErrors, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const errors: Partial<Record<PasswordFieldErrors, string>> = {};
    const currentPasswordError = validateLoginPassword(currentPassword);
    if (currentPasswordError) errors.currentPassword = currentPasswordError;
    const newPasswordError = validatePassword(newPassword);
    if (newPasswordError) errors.newPassword = newPasswordError;
    if (!errors.newPassword && confirmPassword !== newPassword) {
      errors.confirmPassword = "Passwords don't match.";
    }

    setFieldError(errors);
    if (Object.keys(errors).length > 0) return;

    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    const result = await changePassword({ currentPassword, newPassword });
    setIsSubmitting(false);

    if (!result.ok) {
      if (result.field) {
        setFieldError({ [result.field]: result.message });
      } else {
        setFormError(result.message);
      }
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccessMessage("Password updated.");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <FormField
        id="current-password"
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        error={fieldError.currentPassword}
        disabled={isSubmitting}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />

      <FormField
        id="new-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        value={newPassword}
        error={fieldError.newPassword}
        disabled={isSubmitting}
        onChange={(event) => setNewPassword(event.target.value)}
      />

      <FormField
        id="confirm-password"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        error={fieldError.confirmPassword}
        disabled={isSubmitting}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />

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
              Saving...
            </>
          ) : (
            "Change Password"
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
