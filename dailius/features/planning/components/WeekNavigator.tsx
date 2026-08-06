import Link from "next/link";
import { addDays, parseISODate, toISODate } from "@/features/planning/services/dateUtils";

const RANGE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const LINK_CLASSES =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-navy/25 bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2";

export function WeekNavigator({ weekStart, isCurrentWeek }: { weekStart: string; isCurrentWeek: boolean }) {
  const start = parseISODate(weekStart);
  const end = addDays(start, 6);
  const rangeLabel = RANGE_FORMATTER.formatRange(start, end);
  const prevWeek = toISODate(addDays(start, -7));
  const nextWeek = toISODate(addDays(start, 7));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Link href={`/weekly-plan?week=${prevWeek}`} className={LINK_CLASSES} aria-label="Previous week">
          ← Prev Week
        </Link>
        <Link href={`/weekly-plan?week=${nextWeek}`} className={LINK_CLASSES} aria-label="Next week">
          Next Week →
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold text-navy">{rangeLabel}</span>
        {!isCurrentWeek ? (
          <Link href="/weekly-plan" className="text-sm font-semibold text-brand-to hover:underline">
            Back to This Week
          </Link>
        ) : null}
      </div>
    </div>
  );
}
