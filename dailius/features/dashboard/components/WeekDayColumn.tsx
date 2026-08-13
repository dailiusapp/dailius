"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { STATUS_LABELS, STATUS_STYLES } from "@/features/planning/constants";
import { formatClockTime } from "@/features/planning/services/dateUtils";
import type { CommitmentBlock, ScheduledBlock } from "@/features/planning/types";
import { useEditRecordModal } from "@/features/planning/components/EditRecordModal/EditRecordModalContext";

type ScheduleItem =
  | { startTime: string; kind: "block"; block: ScheduledBlock }
  | { startTime: string; kind: "commitment"; commitment: CommitmentBlock };

export function WeekDayColumn({
  iso,
  weekdayLabel,
  dayNumberLabel,
  weekStart,
  isToday,
  blocks,
  commitments,
}: {
  // Pre-formatted server-side (see WeeklyPlanPreviewCard.tsx) rather than a
  // raw Date object — this component is a client component (for the click
  // handlers below), and formatting a Date with no explicit `timeZone` runs
  // in whichever environment executes it: UTC on the server, the browser's
  // own local zone on the client. A Date prop re-formatted during hydration
  // can silently land on a different calendar day/weekday label than what
  // the server rendered. Passing plain strings sidesteps that entirely.
  iso: string;
  weekdayLabel: string;
  dayNumberLabel: string;
  weekStart: string;
  isToday: boolean;
  blocks: ScheduledBlock[];
  commitments: CommitmentBlock[];
}) {
  const { openActivity, openCommitment } = useEditRecordModal();
  const items: ScheduleItem[] = [
    ...blocks.map((block): ScheduleItem => ({ startTime: block.startTime, kind: "block", block })),
    ...commitments.map((commitment): ScheduleItem => ({
      startTime: commitment.startTime,
      kind: "commitment",
      commitment,
    })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="min-w-[130px] shrink-0 lg:min-w-0 lg:shrink">
      <Link
        href={`/weekly-plan?week=${weekStart}#day-${iso}`}
        className={cn(
          "block rounded-lg px-2 py-1.5 text-center transition-colors hover:bg-surface",
          isToday ? "bg-brand-to/10" : null,
        )}
      >
        <p className={cn("text-xs font-semibold", isToday ? "text-brand-to" : "text-navy")}>{weekdayLabel}</p>
        <p className="text-[11px] text-gray-500">{dayNumberLabel}</p>
      </Link>

      <div className="mt-2 space-y-1.5">
        {items.length === 0 ? (
          <p className="px-1 text-[11px] leading-4 text-gray-400">Rest day</p>
        ) : (
          items.map((item) =>
            item.kind === "block" ? (
              <button
                key={item.block.id}
                type="button"
                onClick={() => openActivity(item.block.activityId)}
                className="block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-left transition-colors hover:border-brand-to/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to"
              >
                <p className="truncate text-[11px] font-medium text-navy">{item.block.activityName}</p>
                <div className="mt-0.5 flex items-center justify-between gap-1">
                  <p className="text-[10px] text-gray-500">{formatClockTime(item.block.startTime)}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                      STATUS_STYLES[item.block.status],
                    )}
                  >
                    {STATUS_LABELS[item.block.status]}
                  </span>
                </div>
              </button>
            ) : (
              <button
                key={item.commitment.id}
                type="button"
                onClick={() => openCommitment(item.commitment.id, item.commitment.source)}
                className="block w-full rounded-lg border border-dashed border-gray-300 bg-surface px-2 py-1.5 text-left transition-colors hover:border-brand-to/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to"
              >
                <p className="truncate text-[11px] font-medium text-gray-700">{item.commitment.title}</p>
                <p className="mt-0.5 text-[10px] text-gray-500">{formatClockTime(item.commitment.startTime)}</p>
              </button>
            ),
          )
        )}
      </div>
    </div>
  );
}
