import { addDays, instantToLocalDateTime, parseISODate, timeToMinutes, toISODate, weekBounds } from "./dateUtils";

// Convert an absolute interval into conservative daily wall-clock occupancy.
// Availability is expressed in wall minutes, so compute their union.
// Separate absolute overlap checks distinguish the two repeated occurrences.
export function occupiedSegments(startInstant: string, endInstant: string, timezone: string, weekStart?: string) {
  let startMs = Date.parse(startInstant);
  let endMs = Date.parse(endInstant);
  if (weekStart) {
    const bounds = weekBounds(weekStart, timezone);
    startMs = Math.max(startMs, bounds.start.getTime());
    endMs = Math.min(endMs, bounds.end.getTime());
  }
  if (!(endMs > startMs)) return [];
  const first = instantToLocalDateTime(new Date(startMs).toISOString(), timezone);
  const last = instantToLocalDateTime(new Date(endMs).toISOString(), timezone);
  const wallMinutes = (Date.parse(`${last.date}T${last.time}:00Z`) - Date.parse(`${first.date}T${first.time}:00Z`)) / 60_000;
  const elapsed = (endMs - startMs) / 60_000;
  const ranges = new Map<string, { scheduledDate: string; startTime: string; endTime: string }>();
  for (let date = first.date; date <= last.date; date = toISODate(addDays(parseISODate(date), 1))) {
    const startTime = date === first.date ? first.time : "00:00";
    const endTime = date === last.date ? last.time : "24:00";
    if (endTime > startTime) ranges.set(date, { scheduledDate: date, startTime, endTime });
  }
  // Only a backwards transition can create an inverted/understated envelope.
  if (elapsed > wallMinutes + 0.99) {
    for (let instant = startMs; instant < endMs; instant += 60_000) {
      const local = instantToLocalDateTime(new Date(instant).toISOString(), timezone);
      const endMinute = Math.min(1440, timeToMinutes(local.time) + 1);
      const endTime = `${String(Math.floor(endMinute / 60)).padStart(2, "0")}:${String(endMinute % 60).padStart(2, "0")}`;
      const existing = ranges.get(local.date);
      ranges.set(local.date, {
        scheduledDate: local.date,
        startTime: existing && existing.startTime < local.time ? existing.startTime : local.time,
        endTime: existing && existing.endTime > endTime ? existing.endTime : endTime,
      });
    }
  }
  return [...ranges.values()];
}
