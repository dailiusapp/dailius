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

export type Availability = {
  weekdayMorning: boolean;
  weekdayAfternoon: boolean;
  weekdayEvening: boolean;
  weekendMorning: boolean;
  weekendAfternoon: boolean;
  weekendEvening: boolean;
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
    weekdayMorning: false,
    weekdayAfternoon: false,
    weekdayEvening: false,
    weekendMorning: false,
    weekendAfternoon: false,
    weekendEvening: false,
    maxDailyPlanningMinutes: null,
  },
  preferences: {
    avoidSchedulingAfter: null,
    protectedTimes: [],
    preferredWorkoutLengthMinutes: null,
    planningStyle: null,
  },
};
