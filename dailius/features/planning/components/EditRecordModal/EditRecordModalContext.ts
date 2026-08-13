"use client";

import { createContext, useContext } from "react";
import type { CommitmentSource } from "@/features/planning/types";

export type ModalState =
  | { kind: "closed" }
  | { kind: "activity"; activityId: string }
  | { kind: "commitment"; commitmentId: string; sourceHint?: CommitmentSource };

export type EditRecordModalContextValue = {
  openActivity: (activityId: string) => void;
  openCommitment: (commitmentId: string, sourceHint?: CommitmentSource) => void;
};

export const EditRecordModalContext = createContext<EditRecordModalContextValue | null>(null);

export function useEditRecordModal(): EditRecordModalContextValue {
  const value = useContext(EditRecordModalContext);
  if (!value) {
    throw new Error("useEditRecordModal must be used within an EditRecordModalProvider");
  }
  return value;
}
