"use server";

import { createClient } from "@/lib/supabase/server";
import { addDays, getWeekStart, instantToLocalDateTime } from "@/features/planning/services/dateUtils";
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

  const weekStart = getWeekStart(new Date());
  const weekEnd = addDays(weekStart, 7);

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

    // All-day events (`date` instead of `dateTime`) and events spanning
    // more than one calendar day (in the event's own timezone, not the
    // server's) don't fit the engine's single-day MinuteRange model —
    // skipped here as a documented limitation, same as other engine edge
    // cases, rather than teaching the engine multi-day ranges for what's
    // expected to be a rare case.
    const rows = (data.items ?? [])
      .filter((event) => event.status !== "cancelled")
      .filter((event) => event.start?.dateTime && event.end?.dateTime)
      .map((event) => ({
        user_id: userId,
        title: event.summary?.trim() || "Busy",
        start_time: event.start!.dateTime!,
        end_time: event.end!.dateTime!,
        timezone: event.start!.timeZone || event.end!.timeZone || "UTC",
        source: SOURCE,
        external_event_id: event.id,
      }))
      .filter(
        (row) =>
          instantToLocalDateTime(row.start_time, row.timezone).date ===
          instantToLocalDateTime(row.end_time, row.timezone).date,
      );

    const supabase = await createClient();

    const { error: deleteError } = await supabase
      .from("commitments")
      .delete()
      .eq("user_id", userId)
      .eq("source", SOURCE)
      .gte("start_time", weekStart.toISOString())
      .lt("start_time", weekEnd.toISOString());

    if (deleteError) throw deleteError;

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("commitments").insert(rows);
      if (insertError) throw insertError;
    }

    const { error: syncedError } = await supabase
      .from("google_calendar_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (syncedError) console.error("Failed to update last_synced_at:", syncedError);

    return { ok: true, imported: rows.length };
  } catch (error) {
    console.error("Failed to sync Google Calendar events:", error);
    return { ok: false, message: "Something went wrong syncing your Google Calendar." };
  }
}
