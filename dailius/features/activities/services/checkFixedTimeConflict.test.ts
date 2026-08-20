import { describe, expect, it, vi } from "vitest";

const { mockLoadEngineInputs } = vi.hoisted(() => ({ mockLoadEngineInputs: vi.fn() }));

// Isolates checkFixedTimeConflict.ts's own logic (the oneTimeDate window
// guard, the "did the engine place it at exactly this time" check) from
// Supabase — loadEngineInputs is the only DB-backed dependency this module
// has, and it's fully mocked here. generateWeeklySchedule itself is left
// real (not mocked): the whole point of this service is reusing the real
// engine as its own conflict validator, so the test should exercise that
// integration for real, same spirit as engine.test.ts.
vi.mock("@/features/planning/services/loadEngineInputs", () => ({ loadEngineInputs: mockLoadEngineInputs }));

import { checkFixedTimeConflict } from "./checkFixedTimeConflict";
import { addDays, getWeekStart, toISODate } from "@/features/planning/services/dateUtils";
import type { ActivityInput, EngineInput } from "@/features/planning/types";

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

function candidate(overrides: Partial<ActivityInput> = {}): ActivityInput {
  return {
    id: "new-activity",
    name: "Strength Training",
    defaultDurationMinutes: 30,
    preferredFrequency: null,
    preferredDays: ["Mon"],
    preferredTimeOfDay: null,
    minimumDurationMinutes: null,
    maximumDurationMinutes: null,
    flexible: false,
    goalIds: [],
    fixedStartTime: "09:00",
    oneTimeDate: null,
    ...overrides,
  };
}

describe("checkFixedTimeConflict", () => {
  it("returns ok without loading engine inputs when the candidate has no fixed time", async () => {
    const result = await checkFixedTimeConflict("user-1", candidate({ fixedStartTime: null }));
    expect(result.ok).toBe(true);
    expect(mockLoadEngineInputs).not.toHaveBeenCalled();
  });

  it("returns ok when the exact time is free", async () => {
    mockLoadEngineInputs.mockResolvedValue({ ok: true, input: buildInput({ activities: [] }) });
    const result = await checkFixedTimeConflict("user-1", candidate());
    expect(result.ok).toBe(true);
  });

  it("rejects when the exact time is already occupied by a commitment and there's no other day to fall back to", async () => {
    mockLoadEngineInputs.mockResolvedValue({
      ok: true,
      input: buildInput({
        commitments: [
          { id: "c1", title: "Standup", scheduledDate: MON_ISO, startTime: "09:00", endTime: "09:30", source: "Manual", timezone: "UTC" },
        ],
      }),
    });
    const result = await checkFixedTimeConflict("user-1", candidate());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/conflicts/);
    }
  });

  it("rejects when another fixed-time activity already holds the exact slot", async () => {
    mockLoadEngineInputs.mockResolvedValue({
      ok: true,
      input: buildInput({
        activities: [
          {
            id: "existing",
            name: "Existing Fixed Thing",
            defaultDurationMinutes: 30,
            preferredFrequency: null,
            preferredDays: ["Mon"],
            preferredTimeOfDay: null,
            minimumDurationMinutes: null,
            maximumDurationMinutes: null,
            flexible: false,
            goalIds: [],
            fixedStartTime: "09:00",
            oneTimeDate: null,
          },
        ],
      }),
    });
    const result = await checkFixedTimeConflict("user-1", candidate());
    expect(result.ok).toBe(false);
  });

  it("excludes the candidate's own prior version when updating (matched by id)", async () => {
    mockLoadEngineInputs.mockResolvedValue({
      ok: true,
      input: buildInput({
        activities: [
          {
            id: "new-activity",
            name: "Strength Training",
            defaultDurationMinutes: 30,
            preferredFrequency: null,
            preferredDays: ["Mon"],
            preferredTimeOfDay: null,
            minimumDurationMinutes: null,
            maximumDurationMinutes: null,
            flexible: false,
            goalIds: [],
            fixedStartTime: "08:00", // the activity's OLD time, being edited to 09:00
            oneTimeDate: null,
          },
        ],
      }),
    });
    const result = await checkFixedTimeConflict("user-1", candidate({ id: "new-activity", fixedStartTime: "09:00" }));
    expect(result.ok).toBe(true);
  });

  it("skips the check for a oneTimeDate outside the current week's window", async () => {
    mockLoadEngineInputs.mockResolvedValue({ ok: true, input: buildInput() });
    const result = await checkFixedTimeConflict(
      "user-1",
      candidate({ preferredDays: [], oneTimeDate: toISODate(addDays(MONDAY, 30)) }),
    );
    expect(result.ok).toBe(true);
  });

  it("checks a oneTimeDate inside the current week's window", async () => {
    mockLoadEngineInputs.mockResolvedValue({
      ok: true,
      input: buildInput({
        commitments: [
          { id: "c1", title: "Standup", scheduledDate: TUE_ISO, startTime: "09:00", endTime: "09:30", source: "Manual", timezone: "UTC" },
        ],
      }),
    });
    const result = await checkFixedTimeConflict("user-1", candidate({ preferredDays: [], oneTimeDate: TUE_ISO }));
    expect(result.ok).toBe(false);
  });

  it("propagates a loadEngineInputs failure", async () => {
    mockLoadEngineInputs.mockResolvedValue({ ok: false, message: "boom" });
    const result = await checkFixedTimeConflict("user-1", candidate());
    expect(result).toEqual({ ok: false, message: "boom" });
  });
});
