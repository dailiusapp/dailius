import { describe, expect, it } from "vitest";
import { generateWeeklySchedule } from "./engine";
import { addDays, getWeekStart, toISODate } from "./dateUtils";
import type { ActivityInput, EngineInput } from "../types";

const MONDAY = getWeekStart(new Date(2026, 7, 10));
const MON_ISO = toISODate(MONDAY);
const TUE_ISO = toISODate(addDays(MONDAY, 1));

function buildInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    today: MONDAY,
    goals: [],
    activities: [],
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

function activity(overrides: Partial<ActivityInput> = {}): ActivityInput {
  return {
    id: "activity-1",
    name: "Strength Training",
    defaultDurationMinutes: 30,
    preferredFrequency: "3 times per week",
    preferredDays: [],
    preferredTimeOfDay: null,
    minimumDurationMinutes: null,
    maximumDurationMinutes: null,
    flexible: true,
    goalIds: [],
    ...overrides,
  };
}

// Regression coverage for the "move an activity, then regenerate" bug:
// generatePlan.ts passes locked blocks (occurrences already placed by a
// confirmReplan.ts move) into generateWeeklySchedule so a full regeneration
// carries them forward instead of re-placing them — see confirmReplan.ts
// and generatePlan.ts for how `locked` / `originalScheduledDate` get set.
describe("generateWeeklySchedule with locked blocks", () => {
  it("does not refill a vacated day for a frequency-only (no preferredDays) activity", () => {
    const input = buildInput({ activities: [activity()] });
    const result = generateWeeklySchedule(input, [
      {
        activityId: "activity-1",
        scheduledDate: TUE_ISO,
        startTime: "09:00",
        endTime: "09:30",
        originalScheduledDate: MON_ISO,
      },
    ]);

    expect(result.blocks).toHaveLength(2);
    expect(result.blocks.every((block) => block.scheduledDate !== MON_ISO)).toBe(true);
    expect(result.unplacedCount).toBe(0);
  });

  it("does not refill a vacated preferred day for a preferredDays activity", () => {
    const input = buildInput({
      activities: [activity({ preferredDays: ["Mon", "Wed", "Fri"], preferredFrequency: null })],
    });
    const result = generateWeeklySchedule(input, [
      {
        activityId: "activity-1",
        scheduledDate: TUE_ISO,
        startTime: "09:00",
        endTime: "09:30",
        originalScheduledDate: MON_ISO,
      },
    ]);

    expect(result.blocks).toHaveLength(2);
    expect(result.blocks.every((block) => block.scheduledDate !== MON_ISO)).toBe(true);
    expect(result.unplacedCount).toBe(0);
  });

  it("does not double-count a locked block toward weeklyCount when it has no originalScheduledDate (e.g. ADD_ACTIVITY)", () => {
    const input = buildInput({ activities: [activity({ preferredFrequency: "Once per week" })] });
    const result = generateWeeklySchedule(input, [
      { activityId: "activity-1", scheduledDate: TUE_ISO, startTime: "09:00", endTime: "09:30" },
    ]);

    expect(result.blocks).toHaveLength(0);
    expect(result.unplacedCount).toBe(0);
  });
});
