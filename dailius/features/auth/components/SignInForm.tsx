"use client";

import { useRef, useState, type FocusEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "../services/signIn";
import type { SignInFieldErrors, SignInInput } from "../types";
import { validateEmail, validateLoginPassword } from "../utils/validation";
import { FormField } from "./FormField";

const validators: Record<keyof SignInInput, (value: string) => string | undefined> = {
  email: validateEmail,
  password: validateLoginPassword,
};

const initialValues: SignInInput = { email: "", password: "" };

export function SignInForm() {
  const router = useRouter();
  const [values, setValues] = useState<SignInInput>(initialValues);
  const [errors, setErrors] = useState<SignInFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldRefs = useRef<Record<keyof SignInInput, HTMLInputElement | null>>({
    email: null,
    password: null,
  });

  function handleChange(field: keyof SignInInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: validators[field](value) } : prev));
  }

  function handleBlur(field: keyof SignInInput) {
    return (event: FocusEvent<HTMLInputElement>) => {
      setErrors((prev) => ({ ...prev, [field]: validators[field](event.target.value) }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors: SignInFieldErrors = {
      email: validators.email(values.email),
      password: validators.password(values.password),
    };
    setErrors(nextErrors);

    const firstInvalidField = (Object.keys(nextErrors) as (keyof SignInFieldErrors)[]).find(
      (field) => nextErrors[field],
    );
    if (firstInvalidField) {
      fieldRefs.current[firstInvalidField]?.focus();
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    const result = await signIn(values);

    if (!result.ok) {
      setIsSubmitting(false);
      if (result.field) {
        setErrors((prev) => ({ ...prev, [result.field!]: result.message }));
        fieldRefs.current[result.field]?.focus();
      } else {
        setFormError(result.message);
      }
      return;
    }

    router.push("/");
    router.refresh();
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
          autoComplete="current-password"
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
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-navy underline underline-offset-2">
          Create one
        </Link>
      </p>
    </div>
  );
}
