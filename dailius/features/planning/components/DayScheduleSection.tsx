import { cn } from "@/lib/cn";
import { formatClockTime, toISODate } from "@/features/planning/services/dateUtils";
import { STATUS_LABELS, STATUS_STYLES } from "@/features/planning/constants";
import type { ScheduledBlock } from "@/features/planning/types";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function DayScheduleSection({ date, blocks }: { date: Date; blocks: ScheduledBlock[] }) {
  const iso = toISODate(date);
  const sortedBlocks = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <section
      id={`day-${iso}`}
      className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm target:ring-2 target:ring-brand-to target:ring-offset-2"
    >
      <h2 className="text-base font-semibold text-navy">
        {WEEKDAY_FORMATTER.format(date)} <span className="font-normal text-gray-500">{DATE_FORMATTER.format(date)}</span>
      </h2>

      <div className="mt-4">
        {sortedBlocks.length === 0 ? (
          <p className="text-[15px] leading-6 text-gray-600">Rest day.</p>
        ) : (
          <ul className="space-y-3">
            {sortedBlocks.map((block) => (
              <li key={block.id} className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
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
                </div>
                <p className="mt-2 text-[13px] leading-5 text-gray-500">{block.rationale}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
