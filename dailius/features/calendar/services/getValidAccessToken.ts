import { createClient } from "@/lib/supabase/server";
import { refreshAccessToken } from "./googleOAuth";

// Refresh a bit before actual expiry so a sync call never races a token
// that's valid when read but expired by the time the Calendar API sees it.
const EXPIRY_BUFFER_MS = 60_000;

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: connection, error } = await supabase
    .from("google_calendar_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load Google Calendar connection:", error);
    return null;
  }
  if (!connection) return null;

  const expiresAt = new Date(connection.token_expires_at).getTime();
  if (expiresAt - Date.now() > EXPIRY_BUFFER_MS) {
    return connection.access_token;
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);

  const { error: updateError } = await supabase
    .from("google_calendar_connections")
    .update({
      access_token: refreshed.accessToken,
      token_expires_at: refreshed.expiresAt.toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to persist refreshed Google access token:", updateError);
  }

  return refreshed.accessToken;
}
