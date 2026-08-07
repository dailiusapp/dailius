import type { GoalPriority } from "@/features/planning/types";
import type { GoalStatus } from "./types";

export const GOAL_STATUS_STYLES: Record<GoalStatus, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-gray-100 text-gray-500",
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

export const GOAL_PRIORITY_STYLES: Record<GoalPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-brand-to/10 text-brand-to",
  high: "bg-red-100 text-red-700",
};

export const GOAL_PRIORITY_LABELS: Record<GoalPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
