import { CalendarIcon } from "@/components/landing/icons";
import { formatClockTime } from "@/features/planning/services/dateUtils";
import type { CommitmentBlock } from "@/features/planning/types";

export function CommitmentRow({ commitment }: { commitment: CommitmentBlock }) {
  return (
    <li className="rounded-xl border border-dashed border-gray-300 bg-surface px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">{commitment.title}</p>
            <p className="text-gray-500">
              {formatClockTime(commitment.startTime)}–{formatClockTime(commitment.endTime)}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
          {commitment.source}
        </span>
      </div>
    </li>
  );
}
