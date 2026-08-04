import type { SignUpFieldErrors } from "../types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateFullName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Please enter your full name.";
  if (trimmed.length < 2) return "Full name must be at least 2 characters.";
  if (trimmed.length > 100) return "Full name must be 100 characters or fewer.";
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Please enter your email address.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Please enter a valid email address.";
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return "Please enter a password.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return undefined;
}

export function validateSignUpForm(input: {
  fullName: string;
  email: string;
  password: string;
}): SignUpFieldErrors {
  const errors: SignUpFieldErrors = {};
  const fullNameError = validateFullName(input.fullName);
  const emailError = validateEmail(input.email);
  const passwordError = validatePassword(input.password);
  if (fullNameError) errors.fullName = fullNameError;
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  return errors;
}
