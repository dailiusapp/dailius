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
// time, same simplification as `today: new Date()` elsewhere in the
// engine — no per-user timezone handling exists yet.
export function timeFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// Converts a UTC instant (e.g. a commitment's `start_time`/`end_time`
// timestamptz) into the engine's "YYYY-MM-DD" / "HH:MM" representation,
// using an explicit IANA timezone rather than the server's local clock.
// `timeFromDate` above is server-local and wrong for this — a 5pm Pacific
// event stored as a UTC instant lands on the wrong calendar day entirely
// when read back with server-local getters on a UTC server. `timeZone`
// should be the zone the instant was originally expressed in (Google
// Calendar returns this per-event as `start.timeZone`).
export function instantToLocalDateTime(isoInstant: string, timeZone: string): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(isoInstant));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  // Intl can format midnight as "24:00" with hour12: false — normalize to "00".
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
  };
}

export function formatClockTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteStr} ${period}`;
}
