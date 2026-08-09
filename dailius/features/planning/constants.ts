import type { ScheduledBlockStatus } from "./types";

export const STATUS_STYLES: Record<ScheduledBlockStatus, string> = {
  scheduled: "bg-brand-to/10 text-brand-to",
  completed: "bg-green-100 text-green-700",
  missed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export const STATUS_LABELS: Record<ScheduledBlockStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
};

// docs/requirements/scheduling refactoring.md §18: "Default: 3 AI planning
// attempts per planning operation. Never allow an infinite AI retry loop."
export const MAX_PLANNING_ATTEMPTS = 3;

// §19: "Design architecture that supports different AI models for
// different levels of complexity... the model should be configurable."
export const AI_PLANNER_MODEL = process.env.AI_PLANNER_MODEL ?? "gpt-4o-mini";
