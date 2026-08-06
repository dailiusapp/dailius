"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/services/requireUser";
import { validateFullName } from "@/features/auth/utils/validation";
import { createClient } from "@/lib/supabase/server";
import type { UpdateProfileInput, UpdateProfileResult } from "../types";

export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  const fullName = input.fullName.trim();

  const fullNameError = validateFullName(fullName);
  if (fullNameError) {
    return { ok: false, message: fullNameError, field: "fullName" };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return {
      ok: false,
      message: "Something went wrong updating your name. Please try again.",
    };
  }

  revalidatePath("/", "layout");

  return { ok: true, fullName };
}
