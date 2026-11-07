import { describe, expect, it } from "vitest";
import type { ActivityInput, EngineInput } from "../types";
import { generateWeeklySchedule } from "./engine";
import { validateSchedule } from "./planningValidator";
import { resolveScheduleTimes } from "./scheduleTimes";
import { commitmentInput, commitmentSegments } from "./commitmentSegments";
import { applyPlanningOperations } from "./applyPlanningOperations";

const activity = (extra: Partial<ActivityInput> = {}): ActivityInput => ({
  id: "running", name: "Running", defaultDurationMinutes: 60, preferredFrequency: "Once per week", preferredDays: ["Sun"],
  preferredTimeOfDay: null, minimumDurationMinutes: null, maximumDurationMinutes: null,
  flexible: false, goalIds: [], fixedStartTime: "01:30", oneTimeDate: "2026-11-01", ...extra,
});
const input = (extra: Partial<EngineInput> = {}): EngineInput => ({
  today: new Date(2026, 9, 26), timezone: "America/New_York", goals: [], activities: [activity()], constraints: [], preferences: [], commitments: [],
  availability: { weekdayMorning: { start: "00:00", end: "24:00" }, weekdayAfternoon: null, weekdayEvening: null,
    weekendMorning: { start: "00:00", end: "24:00" }, weekendAfternoon: null, weekendEvening: null, maxDailyPlanningMinutes: null }, ...extra,
});
describe("consistent exact-time and elapsed-time rules", () => {
  it("allows an explicit workout after cutoff in BOTH generation and replanning validation", () => {
    const data = input({ activities: [activity({ fixedStartTime: "20:30" })], constraints: [{ type: "latest_exercise_time", value: "20:00" }] });
    const result = generateWeeklySchedule(data);
    expect(result.blocks[0].startTime).toBe("20:30");
    expect(validateSchedule(result.blocks, data)).toEqual({ valid: true });
    const flexibleData = { ...data, activities: [activity({ fixedStartTime: null })] };
    expect(validateSchedule(result.blocks, flexibleData).valid).toBe(false);
  });
  it("still respects commitments, protected times and the daily cap at exact times", () => {
    const data = input({ activities: [activity({ fixedStartTime: "20:30" })], commitments: [{ id: "meeting", title: "Meeting", scheduledDate: "2026-11-01", startTime: "20:00", endTime: "22:00", timezone: "America/New_York", source: "Manual" }] });
    expect(generateWeeklySchedule(data).blocks).toHaveLength(0);
    expect(generateWeeklySchedule(input({ activities: [activity({ fixedStartTime: "22:30" })], constraints: [{ type: "protected_time", value: "Sleep" }] })).blocks).toHaveLength(0);
    const limited = input(); limited.availability.maxDailyPlanningMinutes = 30;
    expect(generateWeeklySchedule(limited).blocks).toHaveLength(0);
  });
  it("asks for a repeated-time choice, then reuses the activity preference", () => {
    const data = input();
    const result = generateWeeklySchedule(data);
    const unresolved = resolveScheduleTimes(result.blocks, data);
    expect(unresolved.ok).toBe(false);
    if (!unresolved.ok) expect(unresolved.timeChoices?.[0].activityId).toBe("running");
    for (const occurrence of ["earlier", "later"] as const) {
      const chosen = input({ activities: [activity({ timeOccurrence: occurrence })] });
      const blocks = generateWeeklySchedule(chosen).blocks;
      expect(resolveScheduleTimes(blocks, chosen)).toEqual({ ok: true });
      expect(blocks[0].timeOccurrence).toBe(occurrence);
      expect(Date.parse(blocks[0].endInstant!) - Date.parse(blocks[0].startInstant!)).toBe(60 * 60_000);
      expect(validateSchedule(blocks, chosen)).toEqual({ valid: true });
    }
  });
  it("keeps actual elapsed duration across both clock transitions", () => {
    const earlier = generateWeeklySchedule(input({ activities: [activity({ timeOccurrence: "earlier" })] })).blocks[0];
    expect(earlier.startTime).toBe("01:30"); expect(earlier.endTime).toBe("01:30");
    const spring = input({ today: new Date(2026, 2, 2), activities: [activity({ oneTimeDate: "2026-03-08" })] });
    const block = generateWeeklySchedule(spring).blocks[0];
    expect(block.endTime).toBe("03:30");
    expect(Date.parse(block.endInstant!) - Date.parse(block.startInstant!)).toBe(60 * 60_000);
    expect(validateSchedule([block], spring)).toEqual({ valid: true });
  });
  it("never shifts a fixed time that does not exist", () => {
    const data = input({ today: new Date(2026, 2, 2), activities: [activity({ oneTimeDate: "2026-03-08", fixedStartTime: "02:30" })] });
    expect(generateWeeklySchedule(data).blocks).toHaveLength(0);
    expect(generateWeeklySchedule(data).unplacedFixedTimeActivities).toHaveLength(1);
  });
  it("blocks every occupied day of an overnight event", () => {
    const commitment = commitmentInput({ id: "overnight", title: "Travel", source: "Google Calendar", start_time: "2026-10-27T03:00:00Z", end_time: "2026-10-27T11:00:00Z" }, "America/New_York");
    const segments = commitmentSegments(commitment, "2026-10-26");
    expect(segments.map(({ scheduledDate, startTime, endTime }) => ({ scheduledDate, startTime, endTime }))).toEqual([
      { scheduledDate: "2026-10-26", startTime: "23:00", endTime: "24:00" },
      { scheduledDate: "2026-10-27", startTime: "00:00", endTime: "07:00" },
    ]);
    const data = input({ commitments: [commitment], activities: [activity({ preferredDays: ["Mon"], oneTimeDate: "2026-10-26", fixedStartTime: "23:00" }), activity({ id: "second", oneTimeDate: "2026-10-27", fixedStartTime: "06:00" })] });
    expect(generateWeeklySchedule(data).blocks).toHaveLength(0);
    expect(validateSchedule([{ activityId: "running", activityName: "Running", scheduledDate: "2026-10-27", startTime: "06:00", endTime: "07:00", rationale: "test" }], data).valid).toBe(false);
  });
  it("clips events from the prior week and does not add a zero-length midnight segment", () => {
    const event = commitmentInput({ id: "overnight", title: "Travel", source: "Google Calendar", start_time: "2026-10-26T02:00:00Z", end_time: "2026-10-26T06:00:00Z" }, "America/New_York");
    expect(commitmentSegments(event, "2026-10-26").map((s) => [s.scheduledDate, s.startTime, s.endTime])).toEqual([["2026-10-26", "00:00", "02:00"]]);
    expect(commitmentSegments({ ...event, endInstant: "2026-10-26T04:00:00Z" }, "2026-10-26")).toHaveLength(0);
  });
  it("keeps a fall-back commitment with reversed clock endpoints busy", () => {
    const event = commitmentInput({ id: "fold", title: "Meeting", source: "Google Calendar", start_time: "2026-11-01T05:45:00Z", end_time: "2026-11-01T06:15:00Z" }, "America/New_York");
    expect(commitmentSegments(event, "2026-10-26").map((s) => [s.startTime, s.endTime])).toEqual([["01:00", "02:00"]]);
    expect(generateWeeklySchedule(input({ commitments: [event], activities: [activity({ timeOccurrence: "earlier" })] })).blocks).toHaveLength(0);
    const later = input({ commitments: [event], activities: [activity({ timeOccurrence: "later" })] });
    const placed = generateWeeklySchedule(later).blocks;
    expect(placed).toHaveLength(1);
    expect(placed[0].startInstant).toBe("2026-11-01T06:30:00.000Z");
    expect(validateSchedule(placed, later)).toEqual({ valid: true });
  });
  it("can replan an unrelated activity when an existing exact-time workout is after cutoff", () => {
    const data = input({ constraints: [{ type: "latest_exercise_time", value: "20:00" }], activities: [activity({ fixedStartTime: "20:30" }), activity({ id: "guitar", name: "Guitar", fixedStartTime: "10:00", oneTimeDate: null, preferredDays: ["Tue"] })] });
    const blocks = generateWeeklySchedule(data).blocks.map((b, i) => ({ ...b, id: `block-${i}`, status: "scheduled" as const }));
    const result = applyPlanningOperations([{ type: "ADD_ACTIVITY", activityId: "guitar", targetDate: "2026-10-28" }], blocks, data);
    expect(result.ok).toBe(true);
    if (result.ok) expect(validateSchedule(result.resultingBlocks, data)).toEqual({ valid: true });
  });
  it("rejects a block that drifts away from its activity's explicit time", () => {
    const data = input({ activities: [activity({ fixedStartTime: "20:30" })] });
    const result = validateSchedule([{ activityId: "running", activityName: "Running", scheduledDate: "2026-11-01", startTime: "19:30", endTime: "20:30", rationale: "wrong time" }], data);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.violations[0].type).toBe("FIXED_TIME");
  });

});
