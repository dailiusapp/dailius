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
