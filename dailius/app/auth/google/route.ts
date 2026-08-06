import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/services/requireUser";
import { buildGoogleAuthUrl } from "@/features/calendar/services/googleOAuth";
import { getAppUrl } from "@/lib/env";

export const STATE_COOKIE = "google_oauth_state";

export async function GET() {
  await requireUser();

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${getAppUrl()}/auth/google/callback`;

  const response = NextResponse.redirect(buildGoogleAuthUrl(redirectUri, state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
