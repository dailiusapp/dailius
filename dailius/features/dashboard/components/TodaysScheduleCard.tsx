import { CalendarIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";
import { cn } from "@/lib/cn";
import { formatClockTime } from "@/features/planning/services/dateUtils";
import { STATUS_LABELS, STATUS_STYLES } from "@/features/planning/constants";
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
              <li
                key={block.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-navy">{block.activityName}</p>
                  <p className="text-gray-500">
                    {formatClockTime(block.startTime)}–{formatClockTime(block.endTime)}
                  </p>
                </div>
                <span
                  className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[block.status])}
                >
                  {STATUS_LABELS[block.status]}
                </span>
              </li>
            ))}
        </ul>
      )}
    </DashboardCard>
  );
}
