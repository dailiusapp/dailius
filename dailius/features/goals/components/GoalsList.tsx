"use client";

import { useState } from "react";
import { DashboardCard } from "@/features/dashboard/components/DashboardCard";
import { CreateGoalForm } from "./CreateGoalForm";
import { GoalRow } from "./GoalRow";
import type { Goal } from "../types";

export function GoalsList({ initialGoals }: { initialGoals: Goal[] }) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);

  function handleCreated(goal: Goal) {
    setGoals((prev) => [goal, ...prev]);
  }

  function handleUpdated(goal: Goal) {
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
  }

  function handleDeleted(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  }

  return (
    <div className="space-y-6">
      <DashboardCard title="New Goal">
        <CreateGoalForm onCreated={handleCreated} />
      </DashboardCard>

      <DashboardCard title="Your Goals">
        {goals.length === 0 ? (
          <p className="text-sm text-gray-500">You haven&apos;t added any goals yet.</p>
        ) : (
          <ul className="space-y-3">
            {goals.map((goal) => (
              <GoalRow key={goal.id} goal={goal} onUpdated={handleUpdated} onDeleted={handleDeleted} />
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
