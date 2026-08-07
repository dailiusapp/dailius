import Link from "next/link";
import { CalendarIcon } from "@/components/landing/icons";
import { cn } from "@/lib/cn";
import { DashboardCard } from "./DashboardCard";
import { GeneratePlanButton } from "@/features/planning/components/GeneratePlanButton";
import { STATUS_LABELS, STATUS_STYLES } from "@/features/planning/constants";
import { addDays, formatClockTime, getWeekStart, toISODate, todayInTimezone } from "@/features/planning/services/dateUtils";
import type { CommitmentBlock, ScheduledBlock, WeeklyPlan } from "@/features/planning/types";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const DAY_NUMBER_FORMATTER = new Intl.DateTimeFormat("en-US", { day: "numeric" });

type ScheduleItem =
  | { startTime: string; kind: "block"; block: ScheduledBlock }
  | { startTime: string; kind: "commitment"; commitment: CommitmentBlock };

function WeekDayColumn({
  date,
  weekStart,
  isToday,
  blocks,
  commitments,
}: {
  date: Date;
  weekStart: string;
  isToday: boolean;
  blocks: ScheduledBlock[];
  commitments: CommitmentBlock[];
}) {
  const iso = toISODate(date);
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
        <p className={cn("text-xs font-semibold", isToday ? "text-brand-to" : "text-navy")}>
          {WEEKDAY_FORMATTER.format(date)}
        </p>
        <p className="text-[11px] text-gray-500">{DAY_NUMBER_FORMATTER.format(date)}</p>
      </Link>

      <div className="mt-2 space-y-1.5">
        {items.length === 0 ? (
          <p className="px-1 text-[11px] leading-4 text-gray-400">Rest day</p>
        ) : (
          items.map((item) =>
            item.kind === "block" ? (
              <div key={item.block.id} className="rounded-lg border border-gray-200 px-2 py-1.5">
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
              </div>
            ) : (
              <div
                key={item.commitment.id}
                className="rounded-lg border border-dashed border-gray-300 bg-surface px-2 py-1.5"
              >
                <p className="truncate text-[11px] font-medium text-gray-700">{item.commitment.title}</p>
                <p className="mt-0.5 text-[10px] text-gray-500">{formatClockTime(item.commitment.startTime)}</p>
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}

export function WeeklyPlanPreviewCard({ plan, timezone }: { plan: WeeklyPlan | null; timezone: string | null }) {
  const now = todayInTimezone(timezone);
  const weekStartDate = getWeekStart(now);
  const weekStart = toISODate(weekStartDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStartDate, index));
  const today = toISODate(now);

  return (
    <DashboardCard
      title="This Week"
      icon={<CalendarIcon className="h-5 w-5 text-gray-400" />}
      action={
        <Link
          href="/weekly-plan"
          className="text-sm font-medium text-navy underline underline-offset-2 hover:text-brand-to"
        >
          View Full Week →
        </Link>
      }
    >
      {!plan ? (
        <>
          <p className="text-[15px] leading-6 text-gray-600">You don&apos;t have a plan yet for this week.</p>
          <div className="mt-4">
            <GeneratePlanButton label="Generate My Plan" />
          </div>
        </>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-7 lg:gap-3 lg:overflow-visible">
          {days.map((date) => {
            const iso = toISODate(date);
            return (
              <WeekDayColumn
                key={iso}
                date={date}
                weekStart={weekStart}
                isToday={iso === today}
                blocks={plan.blocks.filter((block) => block.scheduledDate === iso)}
                commitments={plan.commitments.filter((commitment) => commitment.scheduledDate === iso)}
              />
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}
