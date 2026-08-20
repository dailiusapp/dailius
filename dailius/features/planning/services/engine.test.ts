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
    fixedStartTime: null,
    oneTimeDate: null,
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

describe("fixed-time placement", () => {
  it("places at the exact fixed time on the preferred day", () => {
    const input = buildInput({
      activities: [activity({ preferredDays: ["Mon"], preferredFrequency: null, fixedStartTime: "09:30" })],
    });
    const result = generateWeeklySchedule(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].scheduledDate).toBe(MON_ISO);
    expect(result.blocks[0].startTime).toBe("09:30");
    expect(result.blocks[0].endTime).toBe("10:00");
    expect(result.unplacedCount).toBe(0);
  });

  it("goes unplaced with no fallback when a commitment already occupies the fixed slot", () => {
    const input = buildInput({
      activities: [
        activity({ preferredDays: ["Mon"], preferredFrequency: null, fixedStartTime: "09:30", flexible: false }),
      ],
      commitments: [
        { id: "c1", title: "Standup", scheduledDate: MON_ISO, startTime: "09:00", endTime: "10:00", source: "Manual", timezone: "UTC" },
      ],
    });
    const result = generateWeeklySchedule(input);

    expect(result.blocks).toHaveLength(0);
    expect(result.unplacedCount).toBe(1);
    expect(result.unplacedFixedTimeActivities).toEqual([{ activityId: "activity-1", activityName: "Strength Training" }]);
  });

  it("does not shrink to fit even with minimumDurationMinutes set", () => {
    const input = buildInput({
      activities: [
        activity({
          preferredDays: ["Mon"],
          preferredFrequency: null,
          fixedStartTime: "11:45",
          defaultDurationMinutes: 30,
          minimumDurationMinutes: 15,
          flexible: false,
        }),
      ],
    });
    const result = generateWeeklySchedule(input);

    expect(result.blocks).toHaveLength(0);
    expect(result.unplacedCount).toBe(1);
  });

  it("keeps its fixed slot even against a higher-priority flexible activity", () => {
    const input = buildInput({
      goals: [{ id: "g-high", title: "High Priority Goal", priority: "high" }],
      activities: [
        activity({
          id: "fixed-1",
          name: "Fixed Meeting",
          preferredDays: ["Mon"],
          preferredFrequency: null,
          fixedStartTime: "09:00",
          flexible: false,
        }),
        activity({
          id: "flex-1",
          name: "Important Habit",
          preferredDays: [],
          preferredFrequency: "Once per week",
          flexible: true,
          goalIds: ["g-high"],
        }),
      ],
    });
    const result = generateWeeklySchedule(input);

    const fixedBlock = result.blocks.find((block) => block.activityId === "fixed-1");
    expect(fixedBlock?.scheduledDate).toBe(MON_ISO);
    expect(fixedBlock?.startTime).toBe("09:00");

    const flexBlock = result.blocks.find((block) => block.activityId === "flex-1");
    expect(flexBlock).toBeDefined();
    expect(flexBlock?.scheduledDate === MON_ISO && flexBlock?.startTime === "09:00").toBe(false);
    expect(result.unplacedCount).toBe(0);
  });

  it("places a oneTimeDate + fixedStartTime activity on exactly that date and time", () => {
    const input = buildInput({
      activities: [
        activity({ preferredDays: [], preferredFrequency: null, oneTimeDate: TUE_ISO, fixedStartTime: "14:00" }),
      ],
    });
    const result = generateWeeklySchedule(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].scheduledDate).toBe(TUE_ISO);
    expect(result.blocks[0].startTime).toBe("14:00");
  });

  it("produces no occurrence for a oneTimeDate outside the current week, and does not count it as unplaced", () => {
    const farFuture = toISODate(addDays(MONDAY, 30));
    const input = buildInput({
      activities: [activity({ preferredDays: [], preferredFrequency: null, oneTimeDate: farFuture })],
    });
    const result = generateWeeklySchedule(input);

    expect(result.blocks).toHaveLength(0);
    expect(result.unplacedCount).toBe(0);
  });

  it("with no fixedStartTime, behaves as a flexible single occurrence restricted to its date", () => {
    const input = buildInput({
      activities: [
        activity({ preferredDays: [], preferredFrequency: null, oneTimeDate: TUE_ISO, preferredTimeOfDay: "Afternoon" }),
      ],
    });
    const result = generateWeeklySchedule(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].scheduledDate).toBe(TUE_ISO);
    expect(result.blocks[0].startTime).toBe("13:00");
  });

  it("timesPerWeek + fixedStartTime lands on the balance-chosen day at the exact time", () => {
    const input = buildInput({
      activities: [activity({ preferredDays: [], preferredFrequency: "Once per week", fixedStartTime: "10:00" })],
    });
    const result = generateWeeklySchedule(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].startTime).toBe("10:00");
    expect(result.blocks[0].scheduledDate).toBe(MON_ISO);
  });
});
