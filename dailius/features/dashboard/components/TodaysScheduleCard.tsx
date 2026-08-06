import { CalendarIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";
import { ScheduledBlockRow } from "@/features/planning/components/ScheduledBlockRow";
import type { ScheduledBlock } from "@/features/planning/types";

export function TodaysScheduleCard({ todaysBlocks }: { todaysBlocks: ScheduledBlock[] }) {
  return (
    <DashboardCard title="Today's Schedule" icon={<CalendarIcon className="h-5 w-5 text-gray-400" />}>
      {todaysBlocks.length === 0 ? (
        <p className="text-[15px] leading-6 text-gray-600">No activities scheduled today.</p>
      ) : (
        <ul className="space-y-2">
          {[...todaysBlocks]
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((block) => (
              <ScheduledBlockRow key={block.id} block={block} showRationale={false} />
            ))}
        </ul>
      )}
    </DashboardCard>
  );
}
