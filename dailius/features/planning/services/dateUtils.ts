const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function getWeekStart(date: Date): Date {
  const stripped = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = stripped.getDay(); // 0 = Sun .. 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  stripped.setDate(stripped.getDate() + diffToMonday);
  return stripped;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dayOfWeekLabel(date: Date): (typeof DAY_LABELS)[number] {
  return DAY_LABELS[date.getDay()];
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function timeToMinutes(time: string): number {
  const [hourStr, minuteStr] = time.split(":");
  return Number(hourStr) * 60 + Number(minuteStr);
}

export function minutesToTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Extracts "HH:MM" from a Date's local hours/minutes — used to turn a
// commitment's timestamptz start/end into the same clock-time
// representation the engine already uses everywhere else. Server-local
// time; planning callers must use `currentTimeInTimezone`, with UTC as
// the explicit fallback when no profile timezone has been captured.
export function timeFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// Converts a UTC instant (e.g. a commitment's `start_time`/`end_time`
// timestamptz) into the engine's "YYYY-MM-DD" / "HH:MM" representation,
// using an explicit IANA timezone rather than the server's local clock.
// `timeFromDate` above is server-local and wrong for this — a 5pm Pacific
// event stored as a UTC instant lands on the wrong calendar day entirely
// when read back with server-local getters on a UTC server. `timeZone`
// is the user's planning timezone; the original event zone is metadata.
const zoneFormatters = new Map<string, Intl.DateTimeFormat>();

export function instantToLocalDateTime(isoInstant: string, timeZone: string): { date: string; time: string } {
  let formatter = zoneFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    zoneFormatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(new Date(isoInstant));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  // Intl can format midnight as "24:00" with hour12: false — normalize to "00".
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
  };
}

export type TimeOccurrence = "earlier" | "later";

export class LocalTimeError extends Error {
  constructor(public readonly kind: "nonexistent" | "ambiguous", date: string, time: string, timezone: string) {
    super(kind === "nonexistent"
      ? `${time} on ${date} does not exist in ${timezone} because the clocks change. Pick another time.`
      : `${time} on ${date} occurs twice in ${timezone}. Choose the earlier or later occurrence.`);
  }
}

function getTimezoneOffsetMinutes(timeZone: string, date: Date): number {
  const local = instantToLocalDateTime(date.toISOString(), timeZone);
  const [year, month, day] = local.date.split("-").map(Number);
  const [hour, minute] = local.time.split(":").map(Number);
  return (Date.UTC(year, month - 1, day, hour, minute) - date.getTime()) / 60_000;
}

// Try the offsets on both sides of any nearby transition, then round-trip
// every candidate. A gap has no candidate; a fold has two. Never normalize
// a nonexistent time or silently pick one occurrence of a repeated time.
const offsetCache = new Map<string, number[]>();

export function possibleInstants(date: string, time: string, timezone: string): Date[] {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    || !Number.isFinite(naive) || new Date(naive).toISOString().slice(0, 10) !== date) {
    return [];
  }
  const cacheKey = `${date}:${timezone}`;
  let offsets = offsetCache.get(cacheKey);
  if (!offsets) {
    const noon = Date.UTC(year, month - 1, day, 12);
    offsets = [...new Set([-48, -24, 0, 24, 48].map((hours) =>
      getTimezoneOffsetMinutes(timezone, new Date(noon + hours * 3_600_000))))];
    if (offsetCache.size > 512) offsetCache.clear();
    offsetCache.set(cacheKey, offsets);
  }
  return offsets.map((offset) => new Date(naive - offset * 60_000))
    .filter((candidate) => {
      const local = instantToLocalDateTime(candidate.toISOString(), timezone);
      return local.date === date && local.time === time;
    }).sort((a, b) => a.getTime() - b.getTime());
}

export function localDateTimeToInstant(date: string, time: string, timezone: string, occurrence?: TimeOccurrence | null): Date {
  const candidates = possibleInstants(date, time, timezone);
  if (!candidates.length) throw new LocalTimeError("nonexistent", date, time, timezone);
  if (candidates.length > 1 && occurrence !== "earlier" && occurrence !== "later") {
    throw new LocalTimeError("ambiguous", date, time, timezone);
  }
  return occurrence === "later" ? candidates[candidates.length - 1] : candidates[0];
}

// Calendar boundaries use the first instant of the local day. Midnight can
// itself be skipped or repeated in some zones; this is a boundary, not an
// ambiguous user appointment, so use the first existing minute of that day.
export function localDayStart(date: string, timezone: string): Date {
  for (let minute = 0; minute < 1440; minute++) {
    const candidates = possibleInstants(date, minutesToTime(minute), timezone);
    if (candidates.length) return candidates[0];
  }
  throw new Error(`The date ${date} does not exist in ${timezone}.`);
}

export function weekBounds(weekStart: string, timezone: string) {
  const weekEnd = toISODate(addDays(parseISODate(weekStart), 7));
  return { start: localDayStart(weekStart, timezone), end: localDayStart(weekEnd, timezone) };
}

// Returns a Date whose local-getter-read calendar date (year/month/day)
// matches "today" in the given IANA timezone — a drop-in replacement for
// `new Date()` at every call site that only ever reads the date portion
// (toISODate, getWeekStart, EngineInput.today) but previously got the
// server's own timezone instead of the user's. Falls back explicitly to
// UTC when no timezone has been captured yet for this user.
export function todayInTimezone(timezone: string | null): Date {
  const { date } = instantToLocalDateTime(new Date().toISOString(), timezone ?? "UTC");
  return parseISODate(date);
}

// Same idea as `todayInTimezone`, for call sites that need the current
// wall-clock time ("HH:MM") rather than the date.
export function currentTimeInTimezone(timezone: string | null): string {
  return instantToLocalDateTime(new Date().toISOString(), timezone ?? "UTC").time;
}

export function formatClockTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr) % 24;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteStr} ${period}`;
}
