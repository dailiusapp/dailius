import Link from "next/link";
import { CalendarIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";
import { WeekDayColumn } from "./WeekDayColumn";
import { GeneratePlanButton } from "@/features/planning/components/GeneratePlanButton";
import { addDays, getWeekStart, toISODate, todayInTimezone } from "@/features/planning/services/dateUtils";
import type { WeeklyPlan } from "@/features/planning/types";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const DAY_NUMBER_FORMATTER = new Intl.DateTimeFormat("en-US", { day: "numeric" });

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
                iso={iso}
                weekdayLabel={WEEKDAY_FORMATTER.format(date)}
                dayNumberLabel={DAY_NUMBER_FORMATTER.format(date)}
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
