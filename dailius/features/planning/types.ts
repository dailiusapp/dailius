export type GoalPriority = "low" | "medium" | "high";
export type ScheduledBlockStatus = "scheduled" | "completed" | "missed" | "cancelled";
export type WeeklyPlanStatus = "draft" | "active" | "archived";

export type ScheduledBlock = {
  id: string;
  activityId: string;
  activityName: string;
  scheduledDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  status: ScheduledBlockStatus;
  rationale: string;
};

export type WeeklyPlan = {
  id: string;
  weekStart: string; // "YYYY-MM-DD", a Monday
  status: WeeklyPlanStatus;
  blocks: ScheduledBlock[];
};

export type GeneratePlanResult =
  | { ok: true; weeklyPlanId: string; blocksPlaced: number }
  | { ok: false; message: string };

// --- Pure engine input/output types (no Supabase shapes leak in here) ---

export type TimeRange = { start: string; end: string }; // "HH:MM"

export type AvailabilityInput = {
  weekdayMorning: TimeRange | null;
  weekdayAfternoon: TimeRange | null;
  weekdayEvening: TimeRange | null;
  weekendMorning: TimeRange | null;
  weekendAfternoon: TimeRange | null;
  weekendEvening: TimeRange | null;
  maxDailyPlanningMinutes: number | null;
};

export type GoalInput = {
  id: string;
  title: string;
  priority: GoalPriority;
};

export type ActivityInput = {
  id: string;
  name: string;
  defaultDurationMinutes: number | null;
  preferredFrequency: string | null;
  preferredDays: string[]; // e.g. ["Tue", "Thu"]
  preferredTimeOfDay: string | null; // "Morning" | "Afternoon" | "Evening" | null
  minimumDurationMinutes: number | null;
  maximumDurationMinutes: number | null;
  flexible: boolean;
  goalIds: string[];
};

export type ConstraintInput = {
  type: string;
  value: string;
};

export type PreferenceInput = {
  type: string;
  value: string;
};

export type EngineInput = {
  today: Date;
  goals: GoalInput[];
  activities: ActivityInput[];
  constraints: ConstraintInput[];
  preferences: PreferenceInput[];
  availability: AvailabilityInput;
};

export type ScheduledBlockDraft = {
  activityId: string;
  activityName: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  rationale: string;
};

export type EngineResult = {
  weekStart: string;
  blocks: ScheduledBlockDraft[];
  unplacedCount: number;
};
