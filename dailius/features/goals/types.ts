import type { GoalPriority } from "@/features/planning/types";

export type GoalStatus = "active" | "paused" | "completed";

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  priority: GoalPriority;
  status: GoalStatus;
  linkedActivityCount: number;
};

export type GoalFieldErrors = "title" | "description";

export type CreateGoalInput = { title: string; description: string | null; priority: GoalPriority };
export type CreateGoalResult =
  | { ok: true; goal: Goal }
  | { ok: false; message: string; field?: GoalFieldErrors };

export type UpdateGoalInput = {
  id: string;
  title: string;
  description: string | null;
  priority: GoalPriority;
  status: GoalStatus;
};
export type UpdateGoalResult =
  | { ok: true; goal: Goal }
  | { ok: false; message: string; field?: GoalFieldErrors };

export type DeleteGoalResult = { ok: true } | { ok: false; message: string };
