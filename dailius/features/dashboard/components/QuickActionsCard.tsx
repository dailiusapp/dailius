import Link from "next/link";
import { SlidersIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";
import { GeneratePlanButton } from "@/features/planning/components/GeneratePlanButton";

const QUICK_ACTION_TILE_CLASSES =
  "inline-flex min-h-11 w-full items-center justify-center rounded-full border border-navy/25 bg-white px-4 py-2.5 text-center text-sm font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2";

const LINK_ACTIONS = [
  { href: "/add-activity", label: "Add Activity" },
  { href: "/goals", label: "Update Goals" },
] as const;

export function QuickActionsCard() {
  return (
    <DashboardCard title="Quick Actions" icon={<SlidersIcon className="h-5 w-5 text-gray-400" />}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <GeneratePlanButton label="Generate Weekly Plan" className={QUICK_ACTION_TILE_CLASSES} />
        {LINK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href} className={QUICK_ACTION_TILE_CLASSES}>
            {action.label}
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
