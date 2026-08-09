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

// Display shape for a commitment on the weekly plan — read-only from the
// planner's perspective (imported from Google Calendar, or eventually
// entered manually), distinct from a ScheduledBlock which the engine placed.
export type CommitmentBlock = {
  id: string;
  title: string;
  scheduledDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  source: string;
};

export type WeeklyPlan = {
  id: string;
  weekStart: string; // "YYYY-MM-DD", a Monday
  status: WeeklyPlanStatus;
  blocks: ScheduledBlock[];
  commitments: CommitmentBlock[];
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

// Fixed external events (e.g. imported from Google Calendar) the engine
// must never schedule over. Same-day only — see syncGoogleCalendarEvents.ts
// for why multi-day/all-day events are excluded before they ever reach here.
export type CommitmentInput = {
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
};

export type EngineInput = {
  today: Date;
  goals: GoalInput[];
  activities: ActivityInput[];
  constraints: ConstraintInput[];
  preferences: PreferenceInput[];
  availability: AvailabilityInput;
  commitments: CommitmentInput[];
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

// --- AI-assisted planning: operations, triggers, validation (docs/requirements/scheduling refactoring.md) ---

// Day-granularity only (no exact time) — the AI proposes WHAT should move
// and roughly WHEN, the deterministic engine's existing slot search
// (placeOccurrenceCandidates) always decides the exact time. Keyed by real
// scheduled_blocks ids (blockId) rather than activityId+occurrence-index,
// since a block row is this schema's actual unit of identity and an
// activity can have multiple blocks in one week.
export type PlanningOperation =
  | { type: "MOVE_ACTIVITY"; blockId: string; targetDate: string }
  | { type: "ADD_ACTIVITY"; activityId: string; targetDate: string }
  | { type: "REMOVE_ACTIVITY"; blockId: string }
  | { type: "CHANGE_PRIORITY"; goalId: string; newPriority: GoalPriority };

export type PlanningTrigger =
  | { type: "MISSED_ACTIVITY"; blockId: string }
  | { type: "FUTURE_MOVE"; blockId: string; targetDayLabel: string | null }
  | { type: "PRIORITY_CHANGE"; goalId: string; newPriority: GoalPriority }
  | { type: "UNKNOWN" };

export type ViolationType =
  | "TIME_CONFLICT"
  | "PROTECTED_TIME"
  | "AVAILABILITY"
  | "MAX_DAILY_DURATION"
  | "EXERCISE_CUTOFF";

export type Violation = {
  type: ViolationType;
  activityName: string;
  detail: string;
  date?: string;
};

// Compact, purpose-built AI-facing context (docs §7-8) — deliberately not
// the full EngineInput: no historical data, no unrelated user data, no
// database internals.
export type PlanningContextGoal = { id: string; title: string; priority: GoalPriority };

export type PlanningContextActivity = {
  id: string;
  name: string;
  durationMinutes: number;
  flexible: boolean;
  preferredDays: string[];
  preferredTimeOfDay: string | null;
  goalTitles: string[];
};

export type PlanningContextConstraint = { type: string; value: string };

export type PlanningContextBlock = {
  blockId: string;
  activityId: string;
  activityName: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: ScheduledBlockStatus;
};

export type PlanningContextCommitment = { title: string; scheduledDate: string; startTime: string; endTime: string };

export type PlanningContext = {
  today: string; // "YYYY-MM-DD"
  trigger: PlanningTrigger;
  userMessage: string;
  goals: PlanningContextGoal[];
  activities: PlanningContextActivity[];
  constraints: PlanningContextConstraint[];
  scheduledBlocks: PlanningContextBlock[];
  commitments: PlanningContextCommitment[];
  priorViolations?: Violation[];
};

export type PlanningLoopResult =
  | { ok: true; summary: string; operations: PlanningOperation[]; previewBlocks: ScheduledBlockDraft[]; attempts: number }
  | { ok: false; reason: string; attempts: number; lastViolations: Violation[] };
