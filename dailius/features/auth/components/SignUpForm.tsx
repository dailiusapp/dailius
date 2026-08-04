"use client";

import { useRef, useState, type FocusEvent, type FormEvent } from "react";
import Link from "next/link";
import { signUp } from "../services/signUp";
import type { SignUpFieldErrors, SignUpInput } from "../types";
import { validateEmail, validateFullName, validatePassword } from "../utils/validation";
import { FormField } from "./FormField";
import { ConfirmationScreen } from "./ConfirmationScreen";

const validators: Record<keyof SignUpInput, (value: string) => string | undefined> = {
  fullName: validateFullName,
  email: validateEmail,
  password: validatePassword,
};

const initialValues: SignUpInput = { fullName: "", email: "", password: "" };

export function SignUpForm() {
  const [values, setValues] = useState<SignUpInput>(initialValues);
  const [errors, setErrors] = useState<SignUpFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);

  const fieldRefs = useRef<Record<keyof SignUpInput, HTMLInputElement | null>>({
    fullName: null,
    email: null,
    password: null,
  });

  if (confirmedEmail) {
    return <ConfirmationScreen email={confirmedEmail} />;
  }

  function handleChange(field: keyof SignUpInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: validators[field](value) } : prev));
  }

  function handleBlur(field: keyof SignUpInput) {
    return (event: FocusEvent<HTMLInputElement>) => {
      setErrors((prev) => ({ ...prev, [field]: validators[field](event.target.value) }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors: SignUpFieldErrors = {
      fullName: validators.fullName(values.fullName),
      email: validators.email(values.email),
      password: validators.password(values.password),
    };
    setErrors(nextErrors);

    const firstInvalidField = (Object.keys(nextErrors) as (keyof SignUpFieldErrors)[]).find(
      (field) => nextErrors[field],
    );
    if (firstInvalidField) {
      fieldRefs.current[firstInvalidField]?.focus();
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    const result = await signUp(values);
    setIsSubmitting(false);

    if (!result.ok) {
      if (result.field) {
        setErrors((prev) => ({ ...prev, [result.field!]: result.message }));
        fieldRefs.current[result.field]?.focus();
      } else {
        setFormError(result.message);
      }
      return;
    }

    setConfirmedEmail(values.email.trim().toLowerCase());
  }

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
          value={values.fullName}
          error={errors.fullName}
          disabled={isSubmitting}
          ref={(el) => {
            fieldRefs.current.fullName = el;
          }}
          onChange={(event) => handleChange("fullName", event.target.value)}
          onBlur={handleBlur("fullName")}
        />

        <FormField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          disabled={isSubmitting}
          ref={(el) => {
            fieldRefs.current.email = el;
          }}
          onChange={(event) => handleChange("email", event.target.value)}
          onBlur={handleBlur("email")}
        />

        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          disabled={isSubmitting}
          ref={(el) => {
            fieldRefs.current.password = el;
          }}
          onChange={(event) => handleChange("password", event.target.value)}
          onBlur={handleBlur("password")}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-brand-from to-brand-to px-6 py-3 text-[15px] font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
        >
          {isSubmitting ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-navy underline underline-offset-2">
          Sign In
        </Link>
      </p>
    </div>
  );
}
