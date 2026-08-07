import { TargetIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";
import { formatClockTime } from "@/features/planning/services/dateUtils";
import type { CommitmentBlock, ScheduledBlock, WeeklyPlan } from "@/features/planning/types";

function getFocusMessage(
  onboardingCompleted: boolean,
  plan: WeeklyPlan | null,
  todaysBlocks: ScheduledBlock[],
  todaysCommitments: CommitmentBlock[],
  currentTime: string,
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
  const upcoming = todaysBlocks.filter((block) => block.endTime > currentTime);
  if (upcoming.length === 0) {
    return "You've wrapped up today's scheduled activities.";
  }
  const next = [...upcoming].sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  if (next.startTime <= currentTime) {
    return `Happening now: ${next.activityName}, until ${formatClockTime(next.endTime)}.`;
  }
  return `Next up: ${next.activityName} at ${formatClockTime(next.startTime)}.`;
}

export function TodaysFocusCard({
  onboardingCompleted,
  plan,
  todaysBlocks,
  todaysCommitments,
  currentTime,
}: {
  onboardingCompleted: boolean;
  plan: WeeklyPlan | null;
  todaysBlocks: ScheduledBlock[];
  todaysCommitments: CommitmentBlock[];
  currentTime: string;
}) {
  return (
    <DashboardCard
      title="Today's Focus"
      icon={<TargetIcon className="h-5 w-5 text-brand-to" />}
      tone="accent"
    >
      <p className="text-[15px] leading-6 text-gray-700">
        {getFocusMessage(onboardingCompleted, plan, todaysBlocks, todaysCommitments, currentTime)}
      </p>
    </DashboardCard>
  );
}
