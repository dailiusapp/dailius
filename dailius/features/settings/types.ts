export type PasswordFieldErrors = "currentPassword" | "newPassword" | "confirmPassword";

export type ChangePasswordInput = { currentPassword: string; newPassword: string };
export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; message: string; field?: PasswordFieldErrors };

export type RequestAccountDeletionResult = { ok: true; requestedAt: string } | { ok: false; message: string };
export type CancelAccountDeletionResult = { ok: true } | { ok: false; message: string };
