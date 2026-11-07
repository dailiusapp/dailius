import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn(), timezone: vi.fn(), queries: [] as { table: string; methods: Record<string, ReturnType<typeof vi.fn>> }[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/features/auth/services/getUserTimezone", () => ({ getUserTimezone: mocks.timezone }));
import { loadEngineInputs } from "./loadEngineInputs";
import { getPlanForWeek } from "./getPlanForWeek";

const rows = [
  { id: "late-sunday", title: "Late Sunday in New York", source: "Google Calendar", timezone: "Asia/Tokyo", start_time: "2026-11-09T04:00:00Z", end_time: "2026-11-09T04:30:00Z" },
  { id: "overnight", title: "Starts last week", source: "Google Calendar", timezone: "Asia/Tokyo", start_time: "2026-11-02T04:00:00Z", end_time: "2026-11-02T07:00:00Z" },
];
const dataFor = (table: string) => {
  if (table === "commitments") return rows;
  if (table === "weekly_plans") return { id: "plan", week_start: "2026-11-02", status: "active" };
  if (table === "availability") return { weekday_morning_start: "06:00", weekday_morning_end: "12:00" };
  if (table === "activities") return [{ id: "activity", name: "Running", flexible: true }];
  return [];
};
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-04T12:00:00Z"));
  mocks.queries.length = 0; mocks.timezone.mockResolvedValue("America/New_York");
  mocks.client.mockResolvedValue({ from: (table: string) => {
    const result = { data: dataFor(table), error: null };
    const q: Record<string, unknown> = {};
    const methods = Object.fromEntries(["select", "eq", "gte", "gt", "lt", "in", "order"].map((name) => [name, vi.fn(() => q)]));
    Object.assign(q, methods, { maybeSingle: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) });
    mocks.queries.push({ table, methods });
    return q;
  } });
});
afterEach(() => vi.useRealTimers());
it("uses the same overlap bounds and profile clock for engine loading and display", async () => {
  const loaded = await loadEngineInputs("user");
  const plan = await getPlanForWeek("user", "2026-11-02", "America/New_York");
  expect(loaded.ok).toBe(true);
  if (loaded.ok) {
    expect(loaded.input.timezone).toBe("America/New_York");
    expect(loaded.input.commitments[0]).toMatchObject({ scheduledDate: "2026-11-08", startTime: "23:00", timezone: "America/New_York" });
  }
  expect(plan?.commitments).toContainEqual(expect.objectContaining({ id: "overnight", scheduledDate: "2026-11-02", startTime: "00:00", endTime: "02:00" }));
  expect(plan?.commitments).toContainEqual(expect.objectContaining({ id: "late-sunday", scheduledDate: "2026-11-08", startTime: "23:00" }));
  const queries = mocks.queries.filter((query) => query.table === "commitments");
  expect(queries).toHaveLength(2);
  for (const query of queries) {
    expect(query.methods.gt).toHaveBeenCalledWith("end_time", "2026-11-02T05:00:00.000Z");
    expect(query.methods.lt).toHaveBeenCalledWith("start_time", "2026-11-09T05:00:00.000Z");
    expect(query.methods.gte).not.toHaveBeenCalled();
  }
});
it("falls back to UTC when the profile timezone is missing", async () => {
  mocks.timezone.mockResolvedValue(null);
  const loaded = await loadEngineInputs("user");
  expect(loaded.ok && loaded.input.timezone).toBe("UTC");
  const query = mocks.queries.find((q) => q.table === "commitments")!;
  expect(query.methods.gt).toHaveBeenCalledWith("end_time", "2026-11-02T00:00:00.000Z");
});
