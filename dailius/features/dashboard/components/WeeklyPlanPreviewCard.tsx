import Link from "next/link";
import { CalendarIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function getUpcomingDays(count: number): Date[] {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
}

export function WeeklyPlanPreviewCard() {
  const days = getUpcomingDays(7);

  return (
    <DashboardCard
      title="Weekly Plan Preview"
      icon={<CalendarIcon className="h-5 w-5 text-gray-400" />}
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {days.map((date) => (
          <li key={date.toDateString()}>
            <Link
              href="/weekly-plan"
              className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors hover:border-brand-to/40 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to"
            >
              <span>
                <span className="block font-medium text-navy">
                  {WEEKDAY_FORMATTER.format(date)}
                </span>
                <span className="text-gray-500">{DATE_FORMATTER.format(date)}</span>
              </span>
              <span className="text-gray-500">Rest Day</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/weekly-plan"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-navy/25 bg-white px-6 py-3 text-[15px] font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2"
      >
        View Full Weekly Plan
      </Link>
    </DashboardCard>
  );
}
