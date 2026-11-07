"use server";

import { createClient } from "@/lib/supabase/server";
import { getWeekStart, toISODate, todayInTimezone, weekBounds } from "@/features/planning/services/dateUtils";
import { getUserTimezone } from "@/features/auth/services/getUserTimezone";
import { getValidAccessToken } from "./getValidAccessToken";

const CALENDAR_EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const SOURCE = "Google Calendar";

type GoogleEvent = {
  id: string;
  summary?: string;
  // `timeZone` is the IANA zone the event's dateTime was expressed in
  // (Google defaults it to the calendar's own timezone when not
  // explicitly overridden on the event) — the only reliable timezone
  // signal available without building a settings UI of our own.
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  status?: string;
};

type GoogleEventsResponse = {
  items?: GoogleEvent[];
  error?: { message?: string };
};

export type SyncGoogleCalendarResult = { ok: true; imported: number } | { ok: false; message: string };

export async function syncGoogleCalendarEvents(userId: string): Promise<SyncGoogleCalendarResult> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return { ok: false, message: "Google Calendar is not connected." };
  }

  const timezone = (await getUserTimezone(userId)) ?? "UTC";
  const { start: weekStart, end: weekEnd } = weekBounds(toISODate(getWeekStart(todayInTimezone(timezone))), timezone);

  try {
    const url = new URL(CALENDAR_EVENTS_ENDPOINT);
    url.searchParams.set("timeMin", weekStart.toISOString());
    url.searchParams.set("timeMax", weekEnd.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json()) as GoogleEventsResponse;

    if (!response.ok) {
      throw new Error(data.error?.message ?? "Failed to fetch Google Calendar events");
    }

    // All-day events remain excluded. Timed overnight/multi-day events
    // retain their real instants and are split into daily planning segments.
    const rows = (data.items ?? [])
      .filter((event) => event.status !== "cancelled")
      .filter((event) => event.start?.dateTime && event.end?.dateTime)
      .map((event) => ({
        user_id: userId,
        title: event.summary?.trim() || "Busy",
        start_time: event.start!.dateTime!,
        end_time: event.end!.dateTime!,
        timezone: event.start!.timeZone || event.end!.timeZone || timezone,
        source: SOURCE,
        external_event_id: event.id,
      }));

    const supabase = await createClient();

    const { error } = await supabase.rpc("replace_google_calendar_events", {
      p_user_id: userId,
      p_week_start: weekStart.toISOString(),
      p_week_end: weekEnd.toISOString(),
      p_events: rows,
    });
    if (error) throw error;

    return { ok: true, imported: rows.length };
  } catch (error) {
    console.error("Failed to sync Google Calendar events:", error);
    return { ok: false, message: "Something went wrong syncing your Google Calendar." };
  }
}
