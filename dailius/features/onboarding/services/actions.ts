"use server";

import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_ONBOARDING_DATA, type OnboardingData } from "../types";

export async function saveOnboardingProgress(step: number, data: OnboardingData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("onboarding_progress").upsert({
    user_id: user.id,
    current_step: step,
    data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function getOnboardingProgress(): Promise<{ step: number; data: OnboardingData }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("onboarding_progress")
    .select("current_step, data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { step: 0, data: EMPTY_ONBOARDING_DATA };
  }

  return {
    step: data.current_step,
    data: { ...EMPTY_ONBOARDING_DATA, ...(data.data as Partial<OnboardingData>) },
  };
}

export async function completeOnboarding(data: OnboardingData): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("complete_onboarding", { p_data: data });
  if (error) throw error;
}
