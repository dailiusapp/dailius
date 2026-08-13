"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Modal } from "@/components/app/Modal";
import type { CommitmentSource } from "@/features/planning/types";
import { EditRecordModalContext, type ModalState } from "./EditRecordModalContext";
import { EditRecordForm } from "./EditRecordForm";

const MODAL_TITLE_ID = "edit-record-modal-title";

export function EditRecordModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>({ kind: "closed" });

  const openActivity = useCallback((activityId: string) => {
    setState({ kind: "activity", activityId });
  }, []);

  const openCommitment = useCallback((commitmentId: string, sourceHint?: CommitmentSource) => {
    setState({ kind: "commitment", commitmentId, sourceHint });
  }, []);

  const close = useCallback(() => setState({ kind: "closed" }), []);

  return (
    <EditRecordModalContext.Provider value={{ openActivity, openCommitment }}>
      {children}
      <Modal open={state.kind !== "closed"} onClose={close} labelledBy={MODAL_TITLE_ID}>
        <EditRecordForm state={state} titleId={MODAL_TITLE_ID} onDone={close} />
      </Modal>
    </EditRecordModalContext.Provider>
  );
}
