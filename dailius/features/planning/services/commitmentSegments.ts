import { occupiedSegments } from "./elapsedTime";
import type { CommitmentInput, CommitmentSource } from "../types";
import { addDays, instantToLocalDateTime, parseISODate, toISODate } from "./dateUtils";

export type CommitmentRow = {
  id: string; title: string; source: string; start_time: string; end_time: string;
};

// Keep the original record identity for editing/moving, but represent its
// occupied time in the ONE planning timezone used by availability/activities.
export function commitmentInput(row: CommitmentRow, timezone: string): CommitmentInput {
  const start = instantToLocalDateTime(row.start_time, timezone);
  const end = instantToLocalDateTime(row.end_time, timezone);
  return {
    id: row.id, title: row.title, source: row.source as CommitmentSource, timezone,
    scheduledDate: start.date, startTime: start.time, endTime: end.time,
    endDate: end.date, startInstant: row.start_time, endInstant: row.end_time,
    durationMinutes: (Date.parse(row.end_time) - Date.parse(row.start_time)) / 60_000,
  };
}

export function commitmentSegments(commitment: CommitmentInput, weekStart?: string) {
  if (commitment.startInstant && commitment.endInstant) {
    return occupiedSegments(commitment.startInstant, commitment.endInstant, commitment.timezone, weekStart)
      .map((segment) => ({ ...commitment, ...segment, segment: commitment.endDate !== commitment.scheduledDate }));
  }
  const endDate = commitment.endDate ?? commitment.scheduledDate;
  const weekEnd = weekStart ? toISODate(addDays(parseISODate(weekStart), 7)) : null;
  // Clip before looping: an event spanning months costs at most 7 segments
  // when loading a week. End instants are exclusive; midnight adds no block.
  const first = weekStart && commitment.scheduledDate < weekStart ? weekStart : commitment.scheduledDate;
  const last = weekEnd && endDate >= weekEnd ? weekEnd : endDate;
  const segments: (CommitmentInput & { segment: boolean })[] = [];
  for (let date = first; date <= last && (!weekEnd || date < weekEnd); date = toISODate(addDays(parseISODate(date), 1))) {
    const startTime = date === commitment.scheduledDate ? commitment.startTime : "00:00";
    const endTime = date === endDate ? commitment.endTime : "24:00";
    // On a fall-back fold an interval may end at an earlier wall time.
    // Conservatively reserve the repeated-hour envelope, rather than let
    // a reversed range make the commitment disappear from free/busy time.
    if (date === endDate && date === commitment.scheduledDate && endTime <= startTime && (commitment.durationMinutes ?? 0) > 0) {
      segments.push({ ...commitment, scheduledDate: date, startTime: endTime, endTime: startTime, segment: false });
    } else if (endTime > startTime) {
      segments.push({ ...commitment, scheduledDate: date, startTime, endTime, segment: endDate !== commitment.scheduledDate });
    }
  }
  return segments;
}
