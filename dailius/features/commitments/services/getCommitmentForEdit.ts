"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { instantToLocalDateTime } from "@/features/planning/services/dateUtils";
import type { CommitmentSource } from "@/features/planning/types";
import type { GetCommitmentForEditResult } from "../types";

export async function getCommitmentForEdit(commitmentId: string): Promise<GetCommitmentForEditResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: commitment, error } = await supabase
    .from("commitments")
    .select("id, title, start_time, end_time, timezone, source")
    .eq("id", commitmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Something went wrong loading that commitment. Please try again." };
  }
  if (!commitment) {
    return { ok: false, message: "That commitment couldn't be found." };
  }

  const start = instantToLocalDateTime(commitment.start_time, commitment.timezone);
  const durationMinutes = Math.round(
    (new Date(commitment.end_time).getTime() - new Date(commitment.start_time).getTime()) / 60_000,
  );

  return {
    ok: true,
    commitment: {
      id: commitment.id,
      title: commitment.title,
      scheduledDate: start.date,
      scheduledTime: start.time,
      durationMinutes,
      source: commitment.source as CommitmentSource,
    },
  };
}
