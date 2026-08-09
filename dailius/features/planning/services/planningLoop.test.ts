import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCallAIPlanner, mockApplyPlanningOperations, mockValidateSchedule, mockLogPlanningEvent } = vi.hoisted(() => ({
  mockCallAIPlanner: vi.fn(),
  mockApplyPlanningOperations: vi.fn(),
  mockValidateSchedule: vi.fn(),
  mockLogPlanningEvent: vi.fn(),
}));

// Isolates planningLoop.ts's own control flow (attempt counting, retry-with-
// violations, max-attempt cutoff) from its dependencies, each already
// covered by their own unit tests. Also proves the loop never touches the
// database itself — aiUsage's logPlanningEvent is the only Supabase-backed
// dependency in this module, and it's fully mocked here, so a real Supabase
// call happening in these tests would surface as an unrelated failure, not
// a silent pass.
vi.mock("./aiPlanner", () => ({ callAIPlanner: mockCallAIPlanner }));
vi.mock("./applyPlanningOperations", () => ({ applyPlanningOperations: mockApplyPlanningOperations }));
vi.mock("./planningValidator", () => ({ validateSchedule: mockValidateSchedule }));
vi.mock("./aiUsage", () => ({ logPlanningEvent: mockLogPlanningEvent }));

import { runPlanningLoop } from "./planningLoop";
import { MAX_PLANNING_ATTEMPTS } from "../constants";
import type { EngineInput, PlanningTrigger, WeeklyPlan } from "../types";

const PLAN: WeeklyPlan = { id: "plan-1", weekStart: "2026-08-10", status: "active", blocks: [], commitments: [] };

const INPUT: EngineInput = {
  today: new Date(2026, 7, 10),
  goals: [],
  activities: [],
  constraints: [],
  preferences: [],
  availability: {
    weekdayMorning: null,
    weekdayAfternoon: null,
    weekdayEvening: null,
    weekendMorning: null,
    weekendAfternoon: null,
    weekendEvening: null,
    maxDailyPlanningMinutes: null,
  },
  commitments: [],
};

const TRIGGER: PlanningTrigger = { type: "MISSED_ACTIVITY", blockId: "b1" };

const AI_OUTPUT_OK = { ok: true, output: { summary: "s", operations: [] }, inputTokens: 1, outputTokens: 1 } as const;
const APPLIED_OK = { ok: true, resultingBlocks: [], newBlocks: [], removedBlockIds: [], priorityChanges: [] } as const;
const A_VIOLATION = { type: "TIME_CONFLICT" as const, activityName: "x", detail: "d" };

describe("runPlanningLoop", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockLogPlanningEvent.mockResolvedValue(undefined);
  });

  it("returns ok:true on the first valid attempt", async () => {
    mockCallAIPlanner.mockResolvedValueOnce(AI_OUTPUT_OK);
    mockApplyPlanningOperations.mockReturnValueOnce(APPLIED_OK);
    mockValidateSchedule.mockReturnValueOnce({ valid: true });

    const result = await runPlanningLoop("user-1", TRIGGER, "MISSED_ACTIVITY", "msg", INPUT, PLAN);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toBe(1);
    expect(mockCallAIPlanner).toHaveBeenCalledTimes(1);
  });

  it("feeds violations back and succeeds on the second attempt", async () => {
    mockCallAIPlanner.mockResolvedValue(AI_OUTPUT_OK);
    mockApplyPlanningOperations.mockReturnValue(APPLIED_OK);
    mockValidateSchedule
      .mockReturnValueOnce({ valid: false, violations: [A_VIOLATION] })
      .mockReturnValueOnce({ valid: true });

    const result = await runPlanningLoop("user-1", TRIGGER, "MISSED_ACTIVITY", "msg", INPUT, PLAN);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toBe(2);
    expect(mockCallAIPlanner).toHaveBeenCalledTimes(2);
    // second call's context should carry the first attempt's violations
    const secondContextArg = mockCallAIPlanner.mock.calls[1][0];
    expect(secondContextArg.priorViolations).toEqual([A_VIOLATION]);
  });

  it("respects MAX_PLANNING_ATTEMPTS and never exceeds it when every attempt is invalid", async () => {
    mockCallAIPlanner.mockResolvedValue(AI_OUTPUT_OK);
    mockApplyPlanningOperations.mockReturnValue(APPLIED_OK);
    mockValidateSchedule.mockReturnValue({ valid: false, violations: [A_VIOLATION] });

    const result = await runPlanningLoop("user-1", TRIGGER, "MISSED_ACTIVITY", "msg", INPUT, PLAN);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.attempts).toBe(MAX_PLANNING_ATTEMPTS);
      expect(result.lastViolations).toEqual([A_VIOLATION]);
    }
    expect(mockCallAIPlanner).toHaveBeenCalledTimes(MAX_PLANNING_ATTEMPTS);
  });

  it("treats a malformed AI response as an invalid attempt and keeps retrying", async () => {
    mockCallAIPlanner
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce(AI_OUTPUT_OK);
    mockApplyPlanningOperations.mockReturnValueOnce(APPLIED_OK);
    mockValidateSchedule.mockReturnValueOnce({ valid: true });

    const result = await runPlanningLoop("user-1", TRIGGER, "MISSED_ACTIVITY", "msg", INPUT, PLAN);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toBe(2);
  });
});
