import { describe, expect, it } from "vitest";
import { applyPlanningOperations } from "./applyPlanningOperations";
import { addDays, getWeekStart, toISODate } from "./dateUtils";
import type { ActivityInput, CommitmentInput, EngineInput, GoalInput, ScheduledBlock } from "../types";

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

const MANUAL_COMMITMENT: CommitmentInput = {
  id: "commitment-1",
  title: "Dentist",
  scheduledDate: MON_ISO,
  startTime: "09:00",
  endTime: "09:30",
  source: "Manual",
  timezone: "UTC",
};

const GOOGLE_COMMITMENT: CommitmentInput = { ...MANUAL_COMMITMENT, id: "commitment-2", source: "Google Calendar" };

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

  it("moves a manual commitment to its target day", () => {
    const result = applyPlanningOperations(
      [{ type: "MOVE_COMMITMENT", commitmentId: "commitment-1", targetDate: WED_ISO }],
      [],
      buildInput({ commitments: [MANUAL_COMMITMENT] }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newBlocks).toHaveLength(1);
      expect(result.newBlocks[0].commitmentId).toBe("commitment-1");
      expect(result.newBlocks[0].scheduledDate).toBe(WED_ISO);
      // A commitment move updates one stable row — it never adds to
      // removedBlockIds the way a MOVE_ACTIVITY source block does.
      expect(result.removedBlockIds).toEqual([]);
    }
  });

  it("rejects a MOVE_COMMITMENT referencing a Google-sourced commitment", () => {
    const result = applyPlanningOperations(
      [{ type: "MOVE_COMMITMENT", commitmentId: "commitment-2", targetDate: WED_ISO }],
      [],
      buildInput({ commitments: [GOOGLE_COMMITMENT] }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a MOVE_COMMITMENT referencing a commitmentId that doesn't exist", () => {
    const result = applyPlanningOperations(
      [{ type: "MOVE_COMMITMENT", commitmentId: "nonexistent", targetDate: WED_ISO }],
      [],
      buildInput(),
    );
    expect(result.ok).toBe(false);
  });

  it("fails rather than falling back to another day when the target day has no room", () => {
    const result = applyPlanningOperations(
      [{ type: "MOVE_COMMITMENT", commitmentId: "commitment-1", targetDate: WED_ISO }],
      [],
      buildInput({
        commitments: [MANUAL_COMMITMENT],
        availability: {
          weekdayMorning: null,
          weekdayAfternoon: null,
          weekdayEvening: null,
          weekendMorning: null,
          weekendAfternoon: null,
          weekendEvening: null,
          maxDailyPlanningMinutes: null,
        },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("does not shrink a commitment's duration to fit a smaller window", () => {
    const result = applyPlanningOperations(
      [{ type: "MOVE_COMMITMENT", commitmentId: "commitment-1", targetDate: WED_ISO }],
      [],
      buildInput({
        commitments: [MANUAL_COMMITMENT], // 30-minute duration
        availability: {
          weekdayMorning: { start: "09:00", end: "09:20" }, // only 20 minutes free
          weekdayAfternoon: null,
          weekdayEvening: null,
          weekendMorning: null,
          weekendAfternoon: null,
          weekendEvening: null,
          maxDailyPlanningMinutes: null,
        },
      }),
    );
    expect(result.ok).toBe(false);
  });
});
