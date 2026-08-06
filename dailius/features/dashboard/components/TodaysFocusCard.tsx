import { TargetIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";
import { formatClockTime } from "@/features/planning/services/dateUtils";
import type { CommitmentBlock, ScheduledBlock, WeeklyPlan } from "@/features/planning/types";

function getFocusMessage(
  onboardingCompleted: boolean,
  plan: WeeklyPlan | null,
  todaysBlocks: ScheduledBlock[],
  todaysCommitments: CommitmentBlock[],
): string {
  if (!onboardingCompleted) {
    return "Complete onboarding to receive personalized daily recommendations.";
  }
  if (!plan) {
    return "No personalized recommendation yet — check back once your plan is ready.";
  }
  if (todaysBlocks.length === 0) {
    return todaysCommitments.length === 0
      ? "Today is a rest day — no activities are scheduled. Enjoy the break."
      : "No activities are scheduled today — just what's on your calendar.";
  }
  const next = [...todaysBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  return `Next up: ${next.activityName} at ${formatClockTime(next.startTime)}.`;
}

export function TodaysFocusCard({
  onboardingCompleted,
  plan,
  todaysBlocks,
  todaysCommitments,
}: {
  onboardingCompleted: boolean;
  plan: WeeklyPlan | null;
  todaysBlocks: ScheduledBlock[];
  todaysCommitments: CommitmentBlock[];
}) {
  return (
    <DashboardCard
      title="Today's Focus"
      icon={<TargetIcon className="h-5 w-5 text-brand-to" />}
      tone="accent"
    >
      <p className="text-[15px] leading-6 text-gray-700">
        {getFocusMessage(onboardingCompleted, plan, todaysBlocks, todaysCommitments)}
      </p>
    </DashboardCard>
  );
}
