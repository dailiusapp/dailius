import { TargetIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";
import { formatClockTime } from "@/features/planning/services/dateUtils";
import type { CommitmentBlock, ScheduledBlock, WeeklyPlan } from "@/features/planning/types";

type TodayItem = { startTime: string; endTime: string; name: string };

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

  // Merge engine-placed activities and fixed commitments (including
  // manually-added one-time activities) into a single timeline — otherwise
  // a one-off activity with no scheduled blocks would never be named here,
  // even though it's the thing happening today.
  const items: TodayItem[] = [
    ...todaysBlocks.map((block) => ({ startTime: block.startTime, endTime: block.endTime, name: block.activityName })),
    ...todaysCommitments.map((commitment) => ({
      startTime: commitment.startTime,
      endTime: commitment.endTime,
      name: commitment.title,
    })),
  ];

  if (items.length === 0) {
    return "Today is a rest day — no activities are scheduled. Enjoy the break.";
  }
  const upcoming = items.filter((item) => item.endTime > currentTime);
  if (upcoming.length === 0) {
    return "You've wrapped up today's scheduled activities.";
  }
  const next = [...upcoming].sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  if (next.startTime <= currentTime) {
    return `Happening now: ${next.name}, until ${formatClockTime(next.endTime)}.`;
  }
  return `Next up: ${next.name} at ${formatClockTime(next.startTime)}.`;
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
