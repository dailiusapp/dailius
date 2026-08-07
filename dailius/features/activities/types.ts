export type FrequencyMode = "days" | "timesPerWeek";

export type CreateActivityInput = {
  name: string;
  durationMinutes: number;
  frequencyMode: FrequencyMode;
  preferredDays: string[]; // used when frequencyMode === "days"
  preferredFrequency: string | null; // used when frequencyMode === "timesPerWeek"
  preferredTimeOfDay: string | null;
  flexible: boolean;
};

export type ActivityFieldErrors = "name" | "preferredDays" | "preferredFrequency";

export type CreateActivityResult =
  | { ok: true; activityId: string }
  | { ok: false; message: string; field?: ActivityFieldErrors };
