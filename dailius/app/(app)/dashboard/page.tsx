import type { Metadata } from "next";
import { requireUser } from "@/features/auth/services/requireUser";
import { getProfile } from "@/features/auth/services/getProfile";
import { WelcomeHeader } from "@/features/dashboard/components/WelcomeHeader";
import { EmptyUserExperience } from "@/features/dashboard/components/EmptyUserExperience";
import { TodaysFocusCard } from "@/features/dashboard/components/TodaysFocusCard";
import { TodaysOverviewCard } from "@/features/dashboard/components/TodaysOverviewCard";
import { TodaysScheduleCard } from "@/features/dashboard/components/TodaysScheduleCard";
import { WeeklyPlanPreviewCard } from "@/features/dashboard/components/WeeklyPlanPreviewCard";
import { AIAssistantCard } from "@/features/dashboard/components/AIAssistantCard";
import { QuickActionsCard } from "@/features/dashboard/components/QuickActionsCard";

export const metadata: Metadata = {
  title: "Dashboard — Dailius",
  description: "Your plan for today.",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const firstName = profile?.fullName.trim().split(" ")[0] || undefined;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8 lg:px-12">
      <WelcomeHeader firstName={firstName} />

      <div className="mt-8">
        <EmptyUserExperience />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <TodaysFocusCard />
          <TodaysOverviewCard />
          <TodaysScheduleCard />
        </div>
        <div className="flex flex-col gap-6">
          <WeeklyPlanPreviewCard />
          <AIAssistantCard />
          <QuickActionsCard />
        </div>
      </div>
    </div>
  );
}
