import { describe, expect, it } from "vitest";
import { applyPlanningOperations } from "./applyPlanningOperations";
import { addDays, getWeekStart, toISODate } from "./dateUtils";
import type { ActivityInput, EngineInput, GoalInput, ScheduledBlock } from "../types";

const MONDAY = getWeekStart(new Date(2026, 7, 10));
const MON_ISO = toISODate(MONDAY);
const WED_ISO = toISODate(addDays(MONDAY, 2));
const THU_ISO = toISODate(addDays(MONDAY, 3));

const RUNNING: ActivityInput = {
  id: "activity-1",
  name: "Running",
  defaultDurationMinutes: 30,
  preferredFrequency: null,
  preferredDays: [],
  preferredTimeOfDay: null,
  minimumDurationMinutes: null,
  maximumDurationMinutes: null,
  flexible: true,
  goalIds: [],
};

const YOGA: ActivityInput = { ...RUNNING, id: "activity-2", name: "Yoga" };

const GOAL: GoalInput = { id: "goal-1", title: "Run a 10k", priority: "medium" };

function buildInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    today: MONDAY,
    goals: [GOAL],
    activities: [RUNNING, YOGA],
    constraints: [],
    preferences: [],
    availability: {
      weekdayMorning: { start: "09:00", end: "12:00" },
      weekdayAfternoon: { start: "13:00", end: "17:00" },
      weekdayEvening: null,
      weekendMorning: null,
      weekendAfternoon: null,
      weekendEvening: null,
      maxDailyPlanningMinutes: null,
    },
    commitments: [],
    ...overrides,
  };
}

function scheduledBlock(overrides: Partial<ScheduledBlock> = {}): ScheduledBlock {
  return {
    id: "block-1",
    activityId: "activity-1",
    activityName: "Running",
    scheduledDate: MON_ISO,
    startTime: "09:00",
    endTime: "09:30",
    status: "scheduled",
    rationale: "test",
    ...overrides,
  };
}

describe("applyPlanningOperations", () => {
  it("moves an existing block to the target day", () => {
    const result = applyPlanningOperations([{ type: "MOVE_ACTIVITY", blockId: "block-1", targetDate: WED_ISO }], [scheduledBlock()], buildInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.removedBlockIds).toEqual(["block-1"]);
      expect(result.newBlocks).toHaveLength(1);
      expect(result.newBlocks[0].scheduledDate).toBe(WED_ISO);
      expect(result.newBlocks[0].activityId).toBe("activity-1");
      expect(result.resultingBlocks.some((b) => b.scheduledDate === MON_ISO)).toBe(false);
    }
  });

  it("adds a new occurrence of an activity with no existing block", () => {
    const result = applyPlanningOperations([{ type: "ADD_ACTIVITY", activityId: "activity-2", targetDate: THU_ISO }], [], buildInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.removedBlockIds).toEqual([]);
      expect(result.newBlocks).toHaveLength(1);
      expect(result.newBlocks[0].activityId).toBe("activity-2");
      expect(result.newBlocks[0].scheduledDate).toBe(THU_ISO);
    }
  });

  it("removes an existing block", () => {
    const result = applyPlanningOperations([{ type: "REMOVE_ACTIVITY", blockId: "block-1" }], [scheduledBlock()], buildInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.removedBlockIds).toEqual(["block-1"]);
      expect(result.newBlocks).toEqual([]);
      expect(result.resultingBlocks).toEqual([]);
    }
  });

  it("records a priority change without touching any blocks", () => {
    const result = applyPlanningOperations(
      [{ type: "CHANGE_PRIORITY", goalId: "goal-1", newPriority: "high" }],
      [scheduledBlock()],
      buildInput(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.priorityChanges).toEqual([{ goalId: "goal-1", newPriority: "high" }]);
      expect(result.newBlocks).toEqual([]);
      expect(result.removedBlockIds).toEqual([]);
      expect(result.resultingBlocks).toHaveLength(1);
    }
  });

  it("rejects an operation referencing a blockId that doesn't exist", () => {
    const result = applyPlanningOperations([{ type: "MOVE_ACTIVITY", blockId: "nonexistent", targetDate: WED_ISO }], [scheduledBlock()], buildInput());
    expect(result.ok).toBe(false);
  });

  it("rejects an operation referencing an activityId that doesn't exist", () => {
    const result = applyPlanningOperations([{ type: "ADD_ACTIVITY", activityId: "nonexistent", targetDate: THU_ISO }], [], buildInput());
    expect(result.ok).toBe(false);
  });

  it("rejects an operation referencing a goalId that doesn't exist", () => {
    const result = applyPlanningOperations(
      [{ type: "CHANGE_PRIORITY", goalId: "nonexistent", newPriority: "high" }],
      [],
      buildInput(),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a MOVE_ACTIVITY targeting a block that isn't currently scheduled", () => {
    const result = applyPlanningOperations(
      [{ type: "MOVE_ACTIVITY", blockId: "block-1", targetDate: WED_ISO }],
      [scheduledBlock({ status: "completed" })],
      buildInput(),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects the whole batch if any single operation is invalid, even alongside valid ones", () => {
    const result = applyPlanningOperations(
      [
        { type: "MOVE_ACTIVITY", blockId: "block-1", targetDate: WED_ISO },
        { type: "REMOVE_ACTIVITY", blockId: "nonexistent" },
      ],
      [scheduledBlock()],
      buildInput(),
    );
    expect(result.ok).toBe(false);
  });
});
