import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/services/requireUser";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/features/calendar/services/googleOAuth";
import { syncGoogleCalendarEvents } from "@/features/calendar/services/syncGoogleCalendarEvents";
import { getAppUrl } from "@/lib/env";
import { STATE_COOKIE } from "../route";

export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const origin = getAppUrl();

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${origin}/onboarding?googleCalendarError=1`);
  }

  try {
    const redirectUri = `${origin}/auth/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refreshToken) {
      // Shouldn't happen since /auth/google always requests prompt=consent,
      // but without a refresh_token we can't keep the connection alive past
      // the initial hour, so treat it as a failed connect rather than
      // silently storing something useless.
      throw new Error("Google did not return a refresh token");
    }

    const supabase = await createClient();
    const { error } = await supabase.from("google_calendar_connections").upsert({
      user_id: user.id,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_expires_at: tokens.expiresAt.toISOString(),
    });
    if (error) throw error;

    await syncGoogleCalendarEvents(user.id);
  } catch (error) {
    console.error("Failed to complete Google Calendar connection:", error);
    return NextResponse.redirect(`${origin}/onboarding?googleCalendarError=1`);
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}
