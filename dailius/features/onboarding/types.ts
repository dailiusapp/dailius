export type Priority = "low" | "medium" | "high";
export type PlanningStyle = "relaxed" | "balanced" | "productive";

export type GoalSelection = {
  key: string;
  label: string;
  frequency: string;
  priority: Priority;
};

export type RecurringActivitySelection = {
  key: string;
  label: string;
  name: string;
  durationMinutes: number | null;
  preferredDays: string[];
  preferredTimeOfDay: string | null;
  flexible: boolean;
};

export type TimeRange = { start: string; end: string }; // "HH:MM", 24h

export type Availability = {
  weekdayMorning: TimeRange | null;
  weekdayAfternoon: TimeRange | null;
  weekdayEvening: TimeRange | null;
  weekendMorning: TimeRange | null;
  weekendAfternoon: TimeRange | null;
  weekendEvening: TimeRange | null;
  maxDailyPlanningMinutes: number | null;
};

export type Preferences = {
  avoidSchedulingAfter: string | null;
  protectedTimes: string[];
  preferredWorkoutLengthMinutes: number | null;
  planningStyle: PlanningStyle | null;
};

export type OnboardingData = {
  calendarSkipped: boolean;
  goals: GoalSelection[];
  activities: RecurringActivitySelection[];
  availability: Availability;
  preferences: Preferences;
};

export const TOTAL_STEPS = 6;

export const EMPTY_ONBOARDING_DATA: OnboardingData = {
  calendarSkipped: false,
  goals: [],
  activities: [],
  availability: {
    weekdayMorning: null,
    weekdayAfternoon: null,
    weekdayEvening: null,
    weekendMorning: null,
    weekendAfternoon: null,
    weekendEvening: null,
    maxDailyPlanningMinutes: null,
  },
  preferences: {
    avoidSchedulingAfter: null,
    protectedTimes: [],
    preferredWorkoutLengthMinutes: null,
    planningStyle: null,
  },
};
