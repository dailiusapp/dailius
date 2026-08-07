import type { Metadata } from "next";
import { requireUser } from "@/features/auth/services/requireUser";
import { getGoalsForUser } from "@/features/goals/services/getGoalsForUser";
import { GoalsList } from "@/features/goals/components/GoalsList";

export const metadata: Metadata = { title: "Goals — Dailius" };

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await getGoalsForUser(user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8 lg:px-12">
      <h1 className="text-2xl font-semibold text-navy">Goals</h1>
      <p className="mt-1 text-sm text-gray-500">
        Manage what you&apos;re working toward — link activities to a goal from Add Activity.
      </p>

      <div className="mt-8">
        <GoalsList initialGoals={goals} />
      </div>
    </div>
  );
}
