import { createClient } from "@/lib/supabase/server";

export async function isGoogleCalendarConnected(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to check Google Calendar connection status:", error);
    return false;
  }

  return data !== null;
}
