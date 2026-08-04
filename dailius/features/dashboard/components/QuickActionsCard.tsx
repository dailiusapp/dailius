import Link from "next/link";
import { SlidersIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";

const QUICK_ACTIONS = [
  { href: "/weekly-plan", label: "Generate Weekly Plan" },
  { href: "/report-missed-activity", label: "Report Missed Activity" },
  { href: "/add-activity", label: "Add Activity" },
  { href: "/goals", label: "Update Goals" },
] as const;

export function QuickActionsCard() {
  return (
    <DashboardCard title="Quick Actions" icon={<SlidersIcon className="h-5 w-5 text-gray-400" />}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-navy/25 bg-white px-4 py-2.5 text-center text-sm font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
