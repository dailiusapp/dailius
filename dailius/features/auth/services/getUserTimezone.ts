import { createClient } from "@/lib/supabase/server";

// Lightweight single-column lookup for server actions that only need the
// timezone (not the full Profile) — e.g. planning services keyed on userId.
export async function getUserTimezone(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle();
  return data?.timezone ?? null;
}
