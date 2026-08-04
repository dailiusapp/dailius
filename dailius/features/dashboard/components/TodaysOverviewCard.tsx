import Link from "next/link";
import { CheckSquareIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";

export function TodaysOverviewCard() {
  return (
    <DashboardCard title="Today's Plan" icon={<CheckSquareIcon className="h-5 w-5 text-gray-400" />}>
      <p className="text-[15px] leading-6 text-gray-600">
        You don&apos;t have a plan for today yet.
      </p>
      <Link
        href="/weekly-plan"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-b from-brand-from to-brand-to px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98]"
      >
        Generate My Plan
      </Link>
    </DashboardCard>
  );
}
