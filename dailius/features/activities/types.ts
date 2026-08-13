import type { Goal } from "@/features/goals/types";

export type FrequencyMode = "days" | "timesPerWeek" | "oneTime";

export type CreateActivityInput = {
  name: string;
  durationMinutes: number;
  frequencyMode: FrequencyMode;
  preferredDays: string[]; // used when frequencyMode === "days"
  preferredFrequency: string | null; // used when frequencyMode === "timesPerWeek"
  preferredTimeOfDay: string | null;
  flexible: boolean;
  goalIds: string[];
  scheduledDate: string | null; // "YYYY-MM-DD", used when frequencyMode === "oneTime"
  scheduledTime: string | null; // "HH:MM", used when frequencyMode === "oneTime"
};

export type ActivityFieldErrors = "name" | "preferredDays" | "preferredFrequency" | "scheduledDate" | "scheduledTime";

export type CreateActivityResult =
  | { ok: true; activityId: string }
  | { ok: false; message: string; field?: ActivityFieldErrors };

// No "oneTime" here — a one-off entry is structurally a Manual commitment,
// not an `activities` row (see createActivity.ts's oneTime branch). Editing
// an existing activity only ever deals with its two recurring shapes.
export type ActivityFrequencyMode = Exclude<FrequencyMode, "oneTime">;

export type ActivityForEdit = {
  id: string;
  name: string;
  durationMinutes: number;
  frequencyMode: ActivityFrequencyMode;
  preferredDays: string[];
  preferredFrequency: string | null;
  preferredTimeOfDay: string | null;
  flexible: boolean;
  goalIds: string[];
};

export type GetActivityForEditResult =
  // `goals` (the user's active goals, for the goal-picker chips) is bundled
  // in here rather than fetched separately — the modal that renders this
  // form is opened client-side from a card click with no server-rendered
  // props to seed it from, unlike AddActivityForm's initialGoals.
  | { ok: true; activity: ActivityForEdit; goals: Goal[] }
  | { ok: false; message: string };

export type UpdateActivityInput = {
  id: string;
  name: string;
  durationMinutes: number;
  frequencyMode: ActivityFrequencyMode;
  preferredDays: string[];
  preferredFrequency: string | null;
  preferredTimeOfDay: string | null;
  flexible: boolean;
  goalIds: string[];
};

export type UpdateActivityResult =
  | { ok: true }
  | { ok: false; message: string; field?: ActivityFieldErrors };

export type DeleteActivityResult = { ok: true } | { ok: false; message: string };
