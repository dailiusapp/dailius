import type { Priority } from "./types";

// Plain, directive-free module — deliberately has no "use client"/"use server"
// at the top so both the client step components and the "use server" AI
// extraction services can safely import these as real runtime values. These
// arrays double as validation allowlists for the AI extraction services, not
// just UI data, so a single shared source of truth matters here.

export const GOAL_OPTIONS = [
  "Running",
  "Cycling",
  "Strength Training",
  "Walking",
  "Reading",
  "Learning",
  "Meditation",
  "Guitar",
  "Music Practice",
  "Family Time",
  "Personal Projects",
  "Cooking",
  "Housework",
  "Other",
] as const;

export const FREQUENCY_OPTIONS = [
  "Daily",
  "3 times per week",
  "2 times per week",
  "Once per week",
  "Twice per month",
];

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const ACTIVITY_OPTIONS = [
  "Gym",
  "Soccer",
  "Church",
  "Language Class",
  "Music Lessons",
  "Volunteering",
  "Study",
  "Other",
] as const;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90];
export const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const TIME_OPTIONS = ["Morning", "Afternoon", "Evening"];

export const MAX_TIME_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
];

export const AVOID_AFTER_OPTIONS = [
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "22:00", label: "10:00 PM" },
];

export const PROTECT_OPTIONS = ["Family Dinner", "Sleep", "School Pickup", "Sunday Rest", "Personal Time"];

export const WORKOUT_LENGTH_OPTIONS = [30, 45, 60, 90];
