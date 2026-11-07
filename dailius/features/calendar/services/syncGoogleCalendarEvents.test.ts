import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ token: vi.fn(), client: vi.fn(), rpc: vi.fn(), fetch: vi.fn() }));
vi.mock("./getValidAccessToken", () => ({ getValidAccessToken: mocks.token }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
import { syncGoogleCalendarEvents } from "./syncGoogleCalendarEvents";
const event = { id: "event", summary: " Meeting ", start: { dateTime: "2026-11-03T10:00:00Z", timeZone: "UTC" }, end: { dateTime: "2026-11-03T11:00:00Z" } };
describe("syncGoogleCalendarEvents", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T12:00:00Z"));
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.token.mockResolvedValue("token");
    mocks.client.mockResolvedValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ items: [event] }) });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it("replaces events and sync timestamp through one RPC", async () => {
    expect(await syncGoogleCalendarEvents("user")).toEqual({ ok: true, imported: 1 });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("replace_google_calendar_events", {
      p_user_id: "user", p_week_start: new Date(2026, 10, 2).toISOString(), p_week_end: new Date(2026, 10, 9).toISOString(),
      p_events: [{ user_id: "user", title: "Meeting", start_time: event.start.dateTime, end_time: event.end.dateTime, timezone: "UTC", source: "Google Calendar", external_event_id: "event" }],
    });
  });
  it("replaces the week with an empty set when Google returns no events", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    expect(await syncGoogleCalendarEvents("user")).toEqual({ ok: true, imported: 0 });
    expect(mocks.rpc.mock.calls[0][1].p_events).toEqual([]);
  });
  it("does not report a successful import or fall back on RPC failure", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "23514" } });
    expect((await syncGoogleCalendarEvents("user")).ok).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("does not touch stored events when Google fails", async () => {
    mocks.fetch.mockRejectedValue(new Error("Google unavailable"));
    expect((await syncGoogleCalendarEvents("user")).ok).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
