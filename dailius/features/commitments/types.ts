import type { CommitmentSource } from "@/features/planning/types";

export type CommitmentFieldErrors = "title" | "scheduledDate" | "scheduledTime";

export type CommitmentForEdit = {
  id: string;
  title: string;
  scheduledDate: string; // "YYYY-MM-DD"
  scheduledTime: string; // "HH:MM"
  durationMinutes: number;
  source: CommitmentSource;
};

export type GetCommitmentForEditResult =
  | { ok: true; commitment: CommitmentForEdit }
  | { ok: false; message: string };

export type UpdateCommitmentInput = {
  id: string;
  title: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
};

export type UpdateCommitmentResult =
  | { ok: true }
  | { ok: false; message: string; field?: CommitmentFieldErrors };

export type DeleteCommitmentResult = { ok: true } | { ok: false; message: string };
