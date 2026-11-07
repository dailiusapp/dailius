import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplyOperationsResult } from "./applyPlanningOperations";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(), createClient: vi.fn(), getCurrentPlan: vi.fn(),
  loadEngineInputs: vi.fn(), apply: vi.fn(), validate: vi.fn(),
  rpc: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("@/features/auth/services/requireUser", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("./getCurrentPlan", () => ({ getCurrentPlan: mocks.getCurrentPlan }));
vi.mock("./loadEngineInputs", () => ({ loadEngineInputs: mocks.loadEngineInputs }));
vi.mock("./applyPlanningOperations", () => ({ applyPlanningOperations: mocks.apply }));
vi.mock("./planningValidator", () => ({ validateSchedule: mocks.validate }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { confirmReplan } from "./confirmReplan";

const applied: Extract<ApplyOperationsResult, { ok: true }> = {
  ok: true, resultingBlocks: [],
  priorityChanges: [{ goalId: "goal", newPriority: "high" }],
  removedBlockIds: ["old-block"],
  newBlocks: [
    { activityId: "activity", activityName: "Run", scheduledDate: "2026-08-13", startTime: "09:00", endTime: "09:30", rationale: "Moved", originalScheduledDate: "2026-08-12" },
    { activityId: "commitment", activityName: "Appointment", commitmentId: "commitment", scheduledDate: "2026-08-14", startTime: "10:00", endTime: "11:00", rationale: "Moved" },
  ],
};

describe("confirmReplan", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user" });
    // No .from(): any accidental direct table write fails these tests.
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.getCurrentPlan.mockResolvedValue({ id: "plan", blocks: [] });
    mocks.loadEngineInputs.mockResolvedValue({ ok: true, input: { commitments: [{ id: "commitment", timezone: "America/Vancouver" }] } });
    mocks.apply.mockReturnValue(applied);
    mocks.validate.mockReturnValue({ valid: true });
    mocks.rpc.mockResolvedValue({ error: null });
  });

  it("commits every kind of change in one RPC and refreshes after success", async () => {
    expect(await confirmReplan([])).toMatchObject({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("confirm_replan", {
      p_plan_id: "plan",
      p_priority_changes: [{ goal_id: "goal", priority: "high" }],
      p_new_blocks: [{ activity_id: "activity", scheduled_date: "2026-08-13", start_time: "09:00", end_time: "09:30", rationale: "Moved", original_scheduled_date: "2026-08-12" }],
      p_commitment_moves: [{ id: "commitment", start_time: "2026-08-14T17:00:00.000Z", end_time: "2026-08-14T18:00:00.000Z" }],
      p_removed_block_ids: ["old-block"],
    });
    expect(mocks.revalidate.mock.calls).toEqual([["/weekly-plan"], ["/dashboard"]]);
  });

  it.each(["23514", "PGRST202", "P0002"])("does not retry with partial writes or report success on RPC error %s", async (code) => {
    mocks.rpc.mockResolvedValue({ error: { code } });
    const result = await confirmReplan([]);
    expect(result.ok).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.revalidate).not.toHaveBeenCalled();
    if (code === "P0002") expect(result.message).toContain("plan has changed");
  });

  it("never writes when operations cannot be applied", async () => {
    mocks.apply.mockReturnValue({ ok: false, reason: "stale" });
    expect((await confirmReplan([])).ok).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("never writes an invalid schedule", async () => {
    mocks.validate.mockReturnValue({ valid: false });
    expect((await confirmReplan([])).ok).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("never writes without a plan or planning inputs", async () => {
    mocks.getCurrentPlan.mockResolvedValue(null);
    expect((await confirmReplan([])).ok).toBe(false);
    mocks.getCurrentPlan.mockResolvedValue({ id: "plan", blocks: [] });
    mocks.loadEngineInputs.mockResolvedValue({ ok: false, message: "Unavailable" });
    expect(await confirmReplan([])).toEqual({ ok: false, message: "Unavailable" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
