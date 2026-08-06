"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import type { ScheduledBlock, ScheduledBlockDraft } from "../types";
import { addDays, instantToLocalDateTime, parseISODate, timeToMinutes } from "./dateUtils";
import { getCurrentPlan } from "./getCurrentPlan";

const GENERIC_ERROR_MESSAGE = "Something went wrong rescheduling that activity. Please try again.";

export type ConfirmRescheduleResult =
  | { ok: true; newBlock: ScheduledBlock }
  | { ok: false; message: string };

export async function confirmReschedule(
  blockId: string,
  chosenOption: ScheduledBlockDraft,
): Promise<ConfirmRescheduleResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const plan = await getCurrentPlan(user.id);
  if (!plan) {
    return { ok: false, message: "You don't have an active weekly plan yet." };
  }

  const missedBlock = plan.blocks.find((block) => block.id === blockId);
  if (!missedBlock) {
    return { ok: false, message: "That activity has already been rescheduled or is no longer on your schedule." };
  }
  if (missedBlock.status !== "scheduled") {
    return { ok: false, message: "That activity has already been rescheduled or is no longer on your schedule." };
  }
  if (chosenOption.activityId !== missedBlock.activityId) {
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  // Never trust a client-echoed schedule proposal blindly — the same
  // principle already applied to the AI's output in extractIntent.ts.
  // Re-check the chosen slot is still free before committing to it, since
  // time may have passed (or other blocks changed) between propose and
  // confirm.
  const chosenStart = timeToMinutes(chosenOption.startTime);
  const chosenEnd = timeToMinutes(chosenOption.endTime);
  const conflict = plan.blocks.some((block) => {
    if (block.id === blockId) return false;
    if (block.status !== "scheduled" && block.status !== "completed") return false;
    if (block.scheduledDate !== chosenOption.scheduledDate) return false;
    const existingStart = timeToMinutes(block.startTime);
    const existingEnd = timeToMinutes(block.endTime);
    return existingStart < chosenEnd && chosenStart < existingEnd;
  });

  if (conflict) {
    return { ok: false, message: "That time is no longer available. Please ask again for updated options." };
  }

  // Same "never trust the client-echoed proposal" principle applied above
  // against other scheduled blocks — also re-check against commitments
  // (e.g. a Google Calendar event synced in between propose and confirm).
  // Query window is padded a day on each side and then filtered precisely
  // by each row's own timezone (see instantToLocalDateTime) — a commitment
  // stored as a UTC instant can fall on `scheduledDate` in its own
  // timezone while landing just outside a naive UTC day boundary.
  const dayStart = addDays(parseISODate(chosenOption.scheduledDate), -1);
  const dayEnd = addDays(parseISODate(chosenOption.scheduledDate), 2);
  const { data: commitmentRows, error: commitmentsError } = await supabase
    .from("commitments")
    .select("start_time, end_time, timezone")
    .eq("user_id", user.id)
    .gte("start_time", dayStart.toISOString())
    .lt("start_time", dayEnd.toISOString());

  if (commitmentsError) {
    console.error("Failed to check commitments before confirming reschedule:", commitmentsError);
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  const commitmentConflict = (commitmentRows ?? [])
    .map((row) => ({
      start: instantToLocalDateTime(row.start_time, row.timezone),
      end: instantToLocalDateTime(row.end_time, row.timezone),
    }))
    .filter((row) => row.start.date === chosenOption.scheduledDate)
    .some((row) => {
      const existingStart = timeToMinutes(row.start.time);
      const existingEnd = timeToMinutes(row.end.time);
      return existingStart < chosenEnd && chosenStart < existingEnd;
    });

  if (commitmentConflict) {
    return { ok: false, message: "That time is no longer available. Please ask again for updated options." };
  }

  const { error: deleteError } = await supabase.from("scheduled_blocks").delete().eq("id", blockId);
  if (deleteError) {
    console.error("Failed to delete missed activity:", deleteError);
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  const { data: newBlockRow, error: insertError } = await supabase
    .from("scheduled_blocks")
    .insert({
      weekly_plan_id: plan.id,
      activity_id: chosenOption.activityId,
      scheduled_date: chosenOption.scheduledDate,
      start_time: chosenOption.startTime,
      end_time: chosenOption.endTime,
      rationale: chosenOption.rationale,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Failed to insert rescheduled block:", insertError);
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  return {
    ok: true,
    newBlock: {
      id: newBlockRow.id,
      activityId: chosenOption.activityId,
      activityName: chosenOption.activityName,
      scheduledDate: chosenOption.scheduledDate,
      startTime: chosenOption.startTime,
      endTime: chosenOption.endTime,
      status: "scheduled",
      rationale: chosenOption.rationale,
    },
  };
}
