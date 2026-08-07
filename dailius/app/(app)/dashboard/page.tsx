import type { Metadata } from "next";
import { requireUser } from "@/features/auth/services/requireUser";
import { getProfile } from "@/features/auth/services/getProfile";
import { getCurrentPlan } from "@/features/planning/services/getCurrentPlan";
import { currentTimeInTimezone, toISODate, todayInTimezone } from "@/features/planning/services/dateUtils";
import { WelcomeHeader } from "@/features/dashboard/components/WelcomeHeader";
import { EmptyUserExperience } from "@/features/dashboard/components/EmptyUserExperience";
import { TodaysFocusCard } from "@/features/dashboard/components/TodaysFocusCard";
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
  const onboardingCompleted = profile?.onboardingCompleted ?? false;

  const timezone = profile?.timezone ?? null;
  const plan = onboardingCompleted ? await getCurrentPlan(user.id) : null;
  const today = toISODate(todayInTimezone(timezone));
  const currentTime = currentTimeInTimezone(timezone);
  const todaysBlocks = plan?.blocks.filter((block) => block.scheduledDate === today) ?? [];
  const todaysCommitments = plan?.commitments.filter((commitment) => commitment.scheduledDate === today) ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8 lg:px-12">
      <WelcomeHeader firstName={firstName} />

      {!onboardingCompleted ? (
        <div className="mt-8">
          <EmptyUserExperience />
        </div>
      ) : null}

      <div className="mt-8">
        <TodaysFocusCard
          onboardingCompleted={onboardingCompleted}
          plan={plan}
          todaysBlocks={todaysBlocks}
          todaysCommitments={todaysCommitments}
          currentTime={currentTime}
        />
      </div>

      <div className="mt-6">
        <AIAssistantCard />
      </div>

      <div className="mt-6">
        <WeeklyPlanPreviewCard plan={plan} timezone={timezone} />
      </div>

      <div className="mt-6">
        <QuickActionsCard />
      </div>
    </div>
  );
}
