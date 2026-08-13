"use client";

import { useEffect, useState } from "react";
import { getActivityForEdit } from "@/features/activities/services/getActivityForEdit";
import type { ActivityForEdit } from "@/features/activities/types";
import { getCommitmentForEdit } from "@/features/commitments/services/getCommitmentForEdit";
import type { CommitmentForEdit } from "@/features/commitments/types";
import type { Goal } from "@/features/goals/types";
import { ActivityEditForm } from "./ActivityEditForm";
import { CommitmentEditForm } from "./CommitmentEditForm";
import type { ModalState } from "./EditRecordModalContext";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "activity"; activity: ActivityForEdit; goals: Goal[] }
  | { status: "commitment"; commitment: CommitmentForEdit };

export function EditRecordForm({
  state,
  titleId,
  onDone,
}: {
  state: ModalState;
  titleId: string;
  onDone: () => void;
}) {
  if (state.kind === "closed") return null;

  // Keying on the record identity forces a remount (and therefore a fresh
  // "loading" initial state) whenever a different record is opened, instead
  // of setState-ing back to "loading" synchronously inside the effect body
  // below (which react-hooks/set-state-in-effect flags as a cascading-render
  // risk).
  const key = state.kind === "activity" ? `activity:${state.activityId}` : `commitment:${state.commitmentId}`;

  return <EditRecordFormBody key={key} state={state} titleId={titleId} onDone={onDone} />;
}

function EditRecordFormBody({
  state,
  titleId,
  onDone,
}: {
  state: Exclude<ModalState, { kind: "closed" }>;
  titleId: string;
  onDone: () => void;
}) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    if (state.kind === "activity") {
      getActivityForEdit(state.activityId).then((result) => {
        if (cancelled) return;
        setLoadState(
          result.ok
            ? { status: "activity", activity: result.activity, goals: result.goals }
            : { status: "error", message: result.message },
        );
      });
    } else {
      getCommitmentForEdit(state.commitmentId).then((result) => {
        if (cancelled) return;
        setLoadState(
          result.ok
            ? { status: "commitment", commitment: result.commitment }
            : { status: "error", message: result.message },
        );
      });
    }

    return () => {
      cancelled = true;
    };
  }, [state]);

  if (loadState.status === "loading") {
    return <p className="py-8 text-center text-sm text-gray-500">Loading...</p>;
  }

  if (loadState.status === "error") {
    return (
      <div>
        <h2 id={titleId} className="text-lg font-semibold text-navy">
          Something went wrong
        </h2>
        <p role="alert" className="mt-3 text-sm text-red-600">
          {loadState.message}
        </p>
      </div>
    );
  }

  if (loadState.status === "activity") {
    return (
      <ActivityEditForm activity={loadState.activity} goals={loadState.goals} titleId={titleId} onDone={onDone} />
    );
  }

  return <CommitmentEditForm commitment={loadState.commitment} titleId={titleId} onDone={onDone} />;
}
