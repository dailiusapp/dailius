"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import type { CreateGoalInput, CreateGoalResult } from "../types";

const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 280;

export async function createGoal(input: CreateGoalInput): Promise<CreateGoalResult> {
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

  const { data, error } = await supabase
    .from("goals")
    .insert({ user_id: user.id, title, description, priority: input.priority })
    .select("id, title, description, priority, status")
    .single();

  if (error) {
    return { ok: false, message: "Something went wrong adding that goal. Please try again." };
  }

  revalidatePath("/goals");

  return { ok: true, goal: { ...data, linkedActivityCount: 0 } };
}
