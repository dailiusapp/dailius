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
