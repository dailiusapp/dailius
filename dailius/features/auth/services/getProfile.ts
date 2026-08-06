import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  onboardingCompleted: boolean;
  createdAt: string;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, onboarding_completed, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    onboardingCompleted: data.onboarding_completed,
    createdAt: data.created_at,
  };
}
