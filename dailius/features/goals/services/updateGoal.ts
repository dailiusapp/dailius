"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import type { UpdateGoalInput, UpdateGoalResult } from "../types";

const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 280;

export async function updateGoal(input: UpdateGoalInput): Promise<UpdateGoalResult> {
  const title = input.title.trim();
  if (!title) {
    return { ok: false, message: "Give this goal a name.", field: "title" };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, message: `Keep the title under ${MAX_TITLE_LENGTH} characters.`, field: "title" };
  }

  const description = input.description?.trim() || null;
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      message: `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`,
      field: "description",
    };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data: goalRows, error: linkCountError } = await supabase
    .from("activity_goals")
    .select("goal_id")
    .eq("goal_id", input.id);

  if (linkCountError) {
    return { ok: false, message: "Something went wrong updating that goal. Please try again." };
  }

  const { data, error } = await supabase
    .from("goals")
    .update({ title, description, priority: input.priority, status: input.status })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select("id, title, description, priority, status")
    .single();

  if (error) {
    return { ok: false, message: "Something went wrong updating that goal. Please try again." };
  }

  revalidatePath("/goals");

  return { ok: true, goal: { ...data, linkedActivityCount: goalRows?.length ?? 0 } };
}
