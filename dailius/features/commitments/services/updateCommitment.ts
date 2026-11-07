"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/features/planning/services/generatePlan";
import { getUserTimezone } from "@/features/auth/services/getUserTimezone";
import { LocalTimeError, localDateTimeToInstant } from "@/features/planning/services/dateUtils";
import type { UpdateCommitmentInput, UpdateCommitmentResult } from "../types";

const MAX_TITLE_LENGTH = 60;

export async function updateCommitment(input: UpdateCommitmentInput): Promise<UpdateCommitmentResult> {
  const title = input.title.trim();
  if (!title) {
    return { ok: false, message: "Give this commitment a name.", field: "title" };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, message: `Keep the name under ${MAX_TITLE_LENGTH} characters.`, field: "title" };
  }
  if (!input.scheduledDate) {
    return { ok: false, message: "Pick a date.", field: "scheduledDate" };
  }
  if (!input.scheduledTime) {
    return { ok: false, message: "Pick a time.", field: "scheduledTime" };
  }

  const user = await requireUser();
  const supabase = await createClient();

  // Re-verify ownership/source, and interpret edits in the planning timezone.
  const { data: existing, error: fetchError } = await supabase
    .from("commitments")
    .select("timezone, source")
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, message: "Something went wrong updating that commitment. Please try again." };
  }
  if (!existing) {
    return { ok: false, message: "That commitment couldn't be found." };
  }
  if (existing.source !== "Manual") {
    return { ok: false, message: "This commitment is synced from an external calendar and can't be edited here." };
  }

  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    return { ok: false, message: "Choose a positive duration." };
  }
  const timezone = (await getUserTimezone(user.id)) ?? "UTC";
  let start: Date;
  try {
    start = localDateTimeToInstant(input.scheduledDate, input.scheduledTime, timezone, input.timeOccurrence);
  } catch (error) {
    if (error instanceof LocalTimeError) return { ok: false, message: error.message, field: "scheduledTime", needsTimeChoice: error.kind === "ambiguous" };
    throw error;
  }
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);

  const { error } = await supabase
    .from("commitments")
    .update({ title, start_time: start.toISOString(), end_time: end.toISOString(), timezone })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: "Something went wrong updating that commitment. Please try again." };
  }

  // A moved/resized commitment can free up or newly occupy time the engine
  // should reconsider — same rationale createActivity.ts's oneTime branch
  // already applies when a commitment is first created.
  // generatePlan() already revalidates /weekly-plan and /dashboard.
  const planResult = await generatePlan();
  if (!planResult.ok) {
    console.error("Failed to regenerate plan after updating commitment:", planResult.message);
  }

  return { ok: true };
}
