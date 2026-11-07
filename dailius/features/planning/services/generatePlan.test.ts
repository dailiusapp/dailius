import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), client: vi.fn(), connected: vi.fn(), sync: vi.fn(), load: vi.fn(), generate: vi.fn(), rpc: vi.fn(), from: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/features/auth/services/requireUser", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/features/calendar/services/getConnectionStatus", () => ({ isGoogleCalendarConnected: mocks.connected }));
vi.mock("@/features/calendar/services/syncGoogleCalendarEvents", () => ({ syncGoogleCalendarEvents: mocks.sync }));
vi.mock("./loadEngineInputs", () => ({ loadEngineInputs: mocks.load }));
vi.mock("./engine", () => ({ generateWeeklySchedule: mocks.generate }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { generatePlan } from "./generatePlan";
const locked = { id: "locked", activity_id: "run", scheduled_date: "2026-11-04", start_time: "09:00:00", end_time: "09:30:00", original_scheduled_date: "2026-11-03" };
const block = { activityId: "guitar", scheduledDate: "2026-11-05", startTime: "10:00", endTime: "10:30", rationale: "Practice" };
// Read-only query builders intentionally have no mutation methods.
function query(result: unknown) {
  const q = { select: vi.fn(() => q), eq: vi.fn(() => q), maybeSingle: vi.fn(async () => result), then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  return q;
}
describe("generatePlan", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "user" });
    mocks.client.mockResolvedValue({ from: mocks.from, rpc: mocks.rpc });
    mocks.connected.mockResolvedValue(false);
    mocks.load.mockResolvedValue({ ok: true, input: { activities: [], today: new Date(2026, 10, 2) } });
    mocks.from.mockImplementation((table) => query({ data: table === "weekly_plans" ? { id: "old" } : [locked], error: null }));
    mocks.generate.mockReturnValue({ weekStart: "2026-11-02", blocks: [block], unplacedCount: 0, unplacedFixedTimeActivities: [] });
    mocks.rpc.mockResolvedValue({ data: "new", error: null });
  });
  it("replaces the plan in one transaction with locked block identities", async () => {
    expect(await generatePlan()).toEqual({ ok: true, weeklyPlanId: "new", blocksPlaced: 2 });
    expect(mocks.generate.mock.calls[0][1]).toEqual([{ activityId: "run", scheduledDate: "2026-11-04", startTime: "09:00", endTime: "09:30", originalScheduledDate: "2026-11-03", startInstant: undefined, endInstant: undefined }]);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("replace_weekly_plan", {
      p_week_start: "2026-11-02", p_expected_plan_id: "old", p_locked_block_ids: ["locked"], p_warnings: [],
      p_blocks: [{ activity_id: "guitar", scheduled_date: "2026-11-05", start_time: "10:00", end_time: "10:30", rationale: "Practice", time_occurrence: null, start_instant: null, end_instant: null }],
    });
    expect(mocks.revalidate.mock.calls).toEqual([["/weekly-plan"], ["/dashboard"]]);
  });
  it("supports first generation and an empty schedule", async () => {
    mocks.from.mockReturnValue(query({ data: null, error: null }));
    mocks.generate.mockReturnValue({ weekStart: "2026-11-02", blocks: [], unplacedCount: 0, unplacedFixedTimeActivities: [] });
    expect(await generatePlan()).toMatchObject({ ok: true, blocksPlaced: 0 });
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_expected_plan_id: null, p_locked_block_ids: [], p_blocks: [] });
  });
  it.each(["23514", "P0002", "PGRST202"])("does not refresh or fall back to partial writes on %s", async (code) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await generatePlan()).ok).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("does not write after a read failure", async () => {
    mocks.from.mockReturnValue(query({ data: null, error: { code: "error" } }));
    expect((await generatePlan()).ok).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("can generate from stored commitments after an atomic sync failure", async () => {
    mocks.connected.mockResolvedValue(true);
    mocks.sync.mockResolvedValue({ ok: false, message: "Sync unavailable" });
    expect((await generatePlan()).ok).toBe(true);
    expect(mocks.sync).toHaveBeenCalledWith("user");
  });
  it("does not replace the current plan until a repeated-time choice is supplied", async () => {
    mocks.load.mockResolvedValue({ ok: true, input: { timezone: "America/New_York", activities: [], today: new Date(2026, 9, 26) } });
    mocks.generate.mockReturnValue({ weekStart: "2026-10-26", blocks: [{ ...block, scheduledDate: "2026-11-01", startTime: "01:30", endTime: "02:30" }], unplacedCount: 0, unplacedFixedTimeActivities: [] });
    const result = await generatePlan();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.timeChoices).toEqual([expect.objectContaining({ activityId: "guitar", time: "01:30" })]);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
    expect((await generatePlan({ guitar: "later" })).ok).toBe(true);
    expect(mocks.rpc.mock.calls[0][1].p_blocks[0].time_occurrence).toBe("later");
  });

});
