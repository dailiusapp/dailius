import type { Metadata } from "next";
import { requireUser } from "@/features/auth/services/requireUser";
import { DashboardCard } from "@/features/dashboard/components/DashboardCard";
import { AddActivityForm } from "@/features/activities/components/AddActivityForm";

export const metadata: Metadata = { title: "Add Activity — Dailius" };

export default async function AddActivityPage() {
  await requireUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8 lg:px-12">
      <h1 className="text-2xl font-semibold text-navy">Add an Activity</h1>
      <p className="mt-1 text-sm text-gray-500">
        Add a recurring activity and the planner will find time for it in your weekly schedule.
      </p>

      <div className="mt-8">
        <DashboardCard title="New Activity">
          <AddActivityForm />
        </DashboardCard>
      </div>
    </div>
  );
}
