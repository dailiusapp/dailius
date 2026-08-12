import { describe, expect, it } from "vitest";
import { validateSchedule } from "./planningValidator";
import { addDays, getWeekStart, toISODate } from "./dateUtils";
import type { EngineInput, ScheduledBlockDraft } from "../types";

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

function block(overrides: Partial<ScheduledBlockDraft> = {}): ScheduledBlockDraft {
  return {
    activityId: "activity-1",
    activityName: "Deep Work",
    scheduledDate: MON_ISO,
    startTime: "09:00",
    endTime: "09:30",
    rationale: "test",
    ...overrides,
  };
}

describe("validateSchedule", () => {
  it("accepts a schedule with no violations", () => {
    const result = validateSchedule([block()], buildInput());
    expect(result).toEqual({ valid: true });
  });

  it("flags two blocks overlapping each other as TIME_CONFLICT", () => {
    const result = validateSchedule(
      [block({ startTime: "09:00", endTime: "10:00" }), block({ activityId: "activity-2", startTime: "09:30", endTime: "10:30" })],
      buildInput(),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations.some((v) => v.type === "TIME_CONFLICT")).toBe(true);
    }
  });

  it("flags a block overlapping protected time as PROTECTED_TIME", () => {
    const input = buildInput({
      availability: {
        weekdayMorning: { start: "09:00", end: "12:00" },
        weekdayAfternoon: { start: "13:00", end: "17:00" },
        weekdayEvening: { start: "17:00", end: "20:00" },
        weekendMorning: null,
        weekendAfternoon: null,
        weekendEvening: null,
        maxDailyPlanningMinutes: null,
      },
      constraints: [{ type: "protected_time", value: "Family Dinner" }],
    });
    const result = validateSchedule([block({ startTime: "18:00", endTime: "19:00" })], input);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations[0].type).toBe("PROTECTED_TIME");
    }
  });

  it("flags a block outside any available window as AVAILABILITY", () => {
    const result = validateSchedule([block({ startTime: "20:00", endTime: "20:30" })], buildInput());
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations[0].type).toBe("AVAILABILITY");
    }
  });

  it("flags an exercise block ending after the cutoff as EXERCISE_CUTOFF", () => {
    const input = buildInput({
      availability: {
        weekdayMorning: { start: "09:00", end: "12:00" },
        weekdayAfternoon: { start: "13:00", end: "17:00" },
        weekdayEvening: { start: "17:00", end: "20:00" },
        weekendMorning: null,
        weekendAfternoon: null,
        weekendEvening: null,
        maxDailyPlanningMinutes: null,
      },
      constraints: [{ type: "latest_exercise_time", value: "18:00" }],
    });
    const result = validateSchedule(
      [block({ activityName: "Running", startTime: "17:45", endTime: "18:15" })],
      input,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations[0].type).toBe("EXERCISE_CUTOFF");
    }
  });

  it("flags a block pushing the day over maxDailyPlanningMinutes as MAX_DAILY_DURATION", () => {
    const input = buildInput({
      availability: {
        weekdayMorning: { start: "06:00", end: "23:00" },
        weekdayAfternoon: null,
        weekdayEvening: null,
        weekendMorning: null,
        weekendAfternoon: null,
        weekendEvening: null,
        maxDailyPlanningMinutes: 30,
      },
    });
    const result = validateSchedule(
      [
        block({ startTime: "09:00", endTime: "09:30" }),
        block({ activityId: "activity-2", startTime: "10:00", endTime: "10:30" }),
      ],
      input,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations[0].type).toBe("MAX_DAILY_DURATION");
    }
  });

  it("catches a commitment conflict across the whole week, not just one day", () => {
    const input = buildInput({
      commitments: [
        {
          id: "commitment-1",
          title: "Meeting",
          scheduledDate: TUE_ISO,
          startTime: "09:00",
          endTime: "10:00",
          source: "Google Calendar",
          timezone: "UTC",
        },
      ],
    });
    const result = validateSchedule([block({ scheduledDate: TUE_ISO, startTime: "09:15", endTime: "09:45" })], input);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations[0].type).toBe("TIME_CONFLICT");
    }
  });

  it("does not reject a commitment moving into a slot overlapping its own vacated original time", () => {
    const input = buildInput({
      commitments: [
        {
          id: "commitment-1",
          title: "Dentist",
          scheduledDate: MON_ISO,
          startTime: "09:00",
          endTime: "09:30",
          source: "Manual",
          timezone: "UTC",
        },
      ],
    });
    // Same day, same time as the commitment's own (still-present) `input.commitments`
    // entry — proves the draft isn't rejected as conflicting with itself.
    const movedDraft = block({
      activityId: "commitment-1",
      activityName: "Dentist",
      scheduledDate: MON_ISO,
      startTime: "09:00",
      endTime: "09:30",
      commitmentId: "commitment-1",
    });
    const result = validateSchedule([movedDraft], input);
    expect(result).toEqual({ valid: true });
  });
});
