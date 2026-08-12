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

// Matches the `source` check constraint on the `commitments` table (see
// 20260807000000_create_calendar_integration_schema.sql). Only "Manual" and
// "Google Calendar" are ever actually written today; the other two are
// reserved schema values.
export type CommitmentSource = "Manual" | "Google Calendar" | "Apple Calendar" | "Outlook";

// Display shape for a commitment on the weekly plan — read-only from the
// planner's perspective (imported from Google Calendar, or eventually
// entered manually), distinct from a ScheduledBlock which the engine placed.
export type CommitmentBlock = {
  id: string;
  title: string;
  scheduledDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  source: CommitmentSource;
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
// must never schedule over — UNLESS source is "Manual" and a MOVE_COMMITMENT
// op explicitly targets this id, in which case applyPlanningOperations.ts
// treats it as a placeable occurrence instead. Same-day only — see
// syncGoogleCalendarEvents.ts for why multi-day/all-day events are excluded
// before they ever reach here. `timezone` is needed to re-encode a moved
// commitment's new local date/time back to an instant on write (see
// confirmReplan.ts) — it's never itself changed by a move.
export type CommitmentInput = {
  id: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  source: CommitmentSource;
  timezone: string;
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
  // Set only when this draft results from a MOVE_ACTIVITY op — the date the
  // activity moved FROM, so a later full regeneration knows which preferred
  // day is already satisfied by this placement. See engine.ts's `LockedBlock`.
  originalScheduledDate?: string | null;
  // Set only when this draft represents a moved commitment (MOVE_COMMITMENT),
  // not an activity occurrence — activityId/activityName above are still
  // populated (the commitment's own id/title) purely so this draft can
  // travel through the same resultingBlocks/validateSchedule machinery
  // activity blocks already use. confirmReplan.ts uses this marker to route
  // the write to `commitments` (UPDATE) instead of `scheduled_blocks`
  // (INSERT).
  commitmentId?: string;
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
  | { type: "CHANGE_PRIORITY"; goalId: string; newPriority: GoalPriority }
  // Day-only, same as MOVE_ACTIVITY — only ever valid for a commitment whose
  // source is "Manual" (enforced in applyPlanningOperations.ts, and the AI
  // can never even see a non-Manual commitment's id — see
  // buildPlanningContext.ts).
  | { type: "MOVE_COMMITMENT"; commitmentId: string; targetDate: string };

export type PlanningTrigger =
  | { type: "MISSED_ACTIVITY"; blockId: string }
  | { type: "FUTURE_MOVE"; blockId: string; targetDayLabel: string | null }
  | { type: "PRIORITY_CHANGE"; goalId: string; newPriority: GoalPriority }
  | { type: "COMMITMENT_MOVE"; commitmentId: string; targetDayLabel: string | null }
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

// `id` is null for any commitment the AI must never reference in an
// operation (i.e. anything not source === "Manual") — mirrors the "never
// invent an id" guarantee blockId/activityId/goalId already have, but
// enforced structurally instead of just by instruction. See
// buildPlanningContext.ts.
export type PlanningContextCommitment = {
  id: string | null;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
};

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
