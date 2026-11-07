import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalTimeError, currentTimeInTimezone, instantToLocalDateTime, localDateTimeToInstant, possibleInstants, toISODate, todayInTimezone, weekBounds } from "./dateUtils";

afterEach(() => vi.useRealTimers());
describe("planning timezone conversions", () => {
  it("round-trips a normal time on the day clocks change", () => {
    const instant = localDateTimeToInstant("2026-03-08", "09:00", "America/New_York");
    expect(instant.toISOString()).toBe("2026-03-08T13:00:00.000Z");
    expect(instantToLocalDateTime(instant.toISOString(), "America/New_York")).toEqual({ date: "2026-03-08", time: "09:00" });
  });
  it("rejects the spring gap instead of shifting 02:30 to another time", () => {
    expect(possibleInstants("2026-03-08", "02:30", "America/New_York")).toEqual([]);
    expect(() => localDateTimeToInstant("2026-03-08", "02:30", "America/New_York")).toThrow(LocalTimeError);
    expect(() => localDateTimeToInstant("2026-03-08", "02:30", "America/New_York", "later")).toThrow(/does not exist/);
  });
  it("requires a choice for a fall fold and resolves each occurrence exactly", () => {
    expect(() => localDateTimeToInstant("2026-11-01", "01:30", "America/New_York")).toThrow(/occurs twice/);
    expect(localDateTimeToInstant("2026-11-01", "01:30", "America/New_York", "earlier").toISOString()).toBe("2026-11-01T05:30:00.000Z");
    expect(localDateTimeToInstant("2026-11-01", "01:30", "America/New_York", "later").toISOString()).toBe("2026-11-01T06:30:00.000Z");
  });
  it("handles a half-hour daylight-saving transition", () => {
    const candidates = possibleInstants("2026-04-05", "01:45", "Australia/Lord_Howe");
    expect(candidates).toHaveLength(2);
    expect(candidates[1].getTime() - candidates[0].getTime()).toBe(30 * 60_000);
    expect(possibleInstants("2026-10-04", "02:15", "Australia/Lord_Howe")).toHaveLength(0);
  });
  it("uses local Monday boundaries with a 167/169-hour DST week", () => {
    const spring = weekBounds("2026-03-02", "America/New_York");
    expect(spring.start.toISOString()).toBe("2026-03-02T05:00:00.000Z");
    expect(spring.end.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect((spring.end.getTime() - spring.start.getTime()) / 3_600_000).toBe(167);
    const fall = weekBounds("2026-10-26", "America/New_York");
    expect((fall.end.getTime() - fall.start.getTime()) / 3_600_000).toBe(169);
  });
  it("uses the user's date at the UTC Sunday/Monday boundary and UTC for missing profiles", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-09T01:00:00Z"));
    expect(toISODate(todayInTimezone("America/Los_Angeles"))).toBe("2026-11-08");
    expect(toISODate(todayInTimezone("Asia/Tokyo"))).toBe("2026-11-09");
    expect(toISODate(todayInTimezone(null))).toBe("2026-11-09");
    expect(currentTimeInTimezone(null)).toBe("01:00");
  });
  it("rejects malformed or impossible local dates", () => {
    expect(possibleInstants("2026-02-30", "09:00", "UTC")).toHaveLength(0);
    expect(possibleInstants("2026-03-08", "25:00", "UTC")).toHaveLength(0);
  });
});
