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
  oneTimeDate: string | null; // "YYYY-MM-DD", required iff frequencyMode === "oneTime"
  // "HH:MM" — optional exact time, available for ANY frequencyMode. A hard
  // constraint: the engine places this activity at exactly this time or
  // not at all. When null, placement falls back to preferredTimeOfDay as
  // before.
  fixedStartTime: string | null;
};

export type ActivityFieldErrors =
  | "name"
  | "preferredDays"
  | "preferredFrequency"
  | "oneTimeDate"
  | "fixedStartTime";

export type CreateActivityResult =
  | { ok: true; activityId: string }
  | { ok: false; message: string; field?: ActivityFieldErrors };

// "oneTime" is now a real activities row (see createActivity.ts) — no
// exclusion needed.
export type ActivityFrequencyMode = FrequencyMode;

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
  oneTimeDate: string | null;
  fixedStartTime: string | null;
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
  oneTimeDate: string | null;
  fixedStartTime: string | null;
};

export type UpdateActivityResult =
  | { ok: true }
  | { ok: false; message: string; field?: ActivityFieldErrors };

export type DeleteActivityResult = { ok: true } | { ok: false; message: string };
