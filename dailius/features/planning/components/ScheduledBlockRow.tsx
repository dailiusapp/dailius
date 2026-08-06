import { cn } from "@/lib/cn";
import { formatClockTime } from "@/features/planning/services/dateUtils";
import { STATUS_LABELS, STATUS_STYLES } from "@/features/planning/constants";
import type { ScheduledBlock } from "@/features/planning/types";

export function ScheduledBlockRow({
  block,
  showRationale = true,
}: {
  block: ScheduledBlock;
  showRationale?: boolean;
}) {
  return (
    <li className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-navy">{block.activityName}</p>
          <p className="text-gray-500">
            {formatClockTime(block.startTime)}–{formatClockTime(block.endTime)}
          </p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[block.status])}>
          {STATUS_LABELS[block.status]}
        </span>
      </div>
      {showRationale ? <p className="mt-2 text-[13px] leading-5 text-gray-500">{block.rationale}</p> : null}
    </li>
  );
}
