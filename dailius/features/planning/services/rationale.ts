import { formatClockTime } from "./dateUtils";

export type PlacementReason = "preferred-day" | "balance" | "fallback-from-preferred-day";

export type RationaleContext = {
  activityName: string;
  dayLabel: string;
  placementReason: PlacementReason;
  linkedGoalTitle: string | null;
  cutoffTime: string | null; // "HH:MM", set only when this activity is exercise-classified and a cutoff is enabled
  protectedLabel: string | null; // set only when the slot landed near a protected-time range that day
  shortenedToMinutes: number | null; // set only when the minimum-duration fallback was used
};

// Fixed-order template concatenation so identical inputs always produce
// identical rationale text.
export function buildRationale(context: RationaleContext): string {
  const parts: string[] = [];

  switch (context.placementReason) {
    case "preferred-day":
      parts.push(`Scheduled ${context.dayLabel} because it matches your usual ${context.activityName} time.`);
      break;
    case "fallback-from-preferred-day":
      parts.push(
        `Scheduled ${context.dayLabel} instead of your preferred day because it didn't have enough available time.`,
      );
      break;
    case "balance":
    default:
      parts.push(`Scheduled ${context.dayLabel} because it was your least busy day this week.`);
      break;
  }

  if (context.linkedGoalTitle) {
    parts.push(`This supports your '${context.linkedGoalTitle}' goal.`);
  }
  if (context.cutoffTime) {
    parts.push(`Kept before your ${formatClockTime(context.cutoffTime)} cutoff.`);
  }
  if (context.protectedLabel) {
    parts.push(`Keeps your ${context.protectedLabel} time free.`);
  }
  if (context.shortenedToMinutes) {
    parts.push(`Shortened to ${context.shortenedToMinutes} minutes to fit your available time.`);
  }

  return parts.join(" ");
}
