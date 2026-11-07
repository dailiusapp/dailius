import type { EngineInput, ScheduleTimeChoice, ScheduledBlockDraft } from "../types";
import { possibleInstants, type TimeOccurrence } from "./dateUtils";

export type TimeChoices = Record<string, TimeOccurrence>;

// A client can select earlier/later, never submit an arbitrary timestamp.
// Re-evaluate dates, times, activity ownership and ambiguity on every retry.
export function resolveScheduleTimes(blocks: ScheduledBlockDraft[], input: EngineInput, choices: TimeChoices = {}) {
  const timeChoices: ScheduleTimeChoice[] = [];
  for (const block of blocks) {
    const timezone = input.timezone ?? "UTC";
    const candidates = possibleInstants(block.scheduledDate, block.startTime, timezone);
    if (!candidates.length) return { ok: false as const, message: `${block.activityName}: ${block.startTime} on ${block.scheduledDate} does not exist in ${timezone}. Pick another time.` };
    const key = block.commitmentId ? `commitment:${block.commitmentId}` : block.activityId;
    const saved = input.activities.find((activity) => activity.id === block.activityId)?.timeOccurrence;
    const occurrence = choices[key] ?? block.timeOccurrence ?? saved;
    if (candidates.length > 1) {
      if (occurrence !== "earlier" && occurrence !== "later") {
        if (!timeChoices.some((choice) => choice.activityId === key)) {
          timeChoices.push({ activityId: key, activityName: block.activityName, date: block.scheduledDate, time: block.startTime, timezone });
        }
      } else {
        block.timeOccurrence = occurrence;
      }
    }
  }
  return timeChoices.length
    ? { ok: false as const, message: "The clocks go back during this plan. Choose which occurrence to use.", timeChoices }
    : { ok: true as const };
}
