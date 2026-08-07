import { createClient } from "@/lib/supabase/server";
import type { Goal, GoalStatus } from "../types";

export async function getGoalsForUser(userId: string, options?: { status?: GoalStatus }): Promise<Goal[]> {
  const supabase = await createClient();

  let query = supabase
    .from("goals")
    .select("id, title, description, priority, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data: goalRows } = await query;
  const goals = goalRows ?? [];

  const goalIds = goals.map((goal) => goal.id);
  const { data: linkRows } =
    goalIds.length > 0
      ? await supabase.from("activity_goals").select("goal_id").in("goal_id", goalIds)
      : { data: [] };

  const countByGoal = new Map<string, number>();
  for (const link of linkRows ?? []) {
    countByGoal.set(link.goal_id, (countByGoal.get(link.goal_id) ?? 0) + 1);
  }

  return goals.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    linkedActivityCount: countByGoal.get(row.id) ?? 0,
  }));
}
