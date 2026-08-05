import { CheckSquareIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";
import { GeneratePlanButton } from "@/features/planning/components/GeneratePlanButton";
import type { ScheduledBlock, WeeklyPlan } from "@/features/planning/types";

function totalMinutes(blocks: ScheduledBlock[]): number {
  return blocks.reduce((sum, block) => {
    const [startHour, startMinute] = block.startTime.split(":").map(Number);
    const [endHour, endMinute] = block.endTime.split(":").map(Number);
    return sum + (endHour * 60 + endMinute - (startHour * 60 + startMinute));
  }, 0);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

export function TodaysOverviewCard({
  plan,
  todaysBlocks,
}: {
  plan: WeeklyPlan | null;
  todaysBlocks: ScheduledBlock[];
}) {
  return (
    <DashboardCard title="Today's Plan" icon={<CheckSquareIcon className="h-5 w-5 text-gray-400" />}>
      {!plan ? (
        <>
          <p className="text-[15px] leading-6 text-gray-600">You don&apos;t have a plan for today yet.</p>
          <div className="mt-4">
            <GeneratePlanButton label="Generate My Plan" />
          </div>
        </>
      ) : todaysBlocks.length === 0 ? (
        <p className="text-[15px] leading-6 text-gray-600">Rest day — nothing scheduled for today.</p>
      ) : (
        <ul className="space-y-1 text-sm text-gray-600">
          <li>• {todaysBlocks.length} activities planned</li>
          <li>• {formatDuration(totalMinutes(todaysBlocks))} scheduled</li>
          <li>• No scheduling conflicts</li>
        </ul>
      )}
    </DashboardCard>
  );
}
