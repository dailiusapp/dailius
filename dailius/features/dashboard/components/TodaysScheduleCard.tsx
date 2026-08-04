import { CalendarIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";

export function TodaysScheduleCard() {
  return (
    <DashboardCard title="Today's Schedule" icon={<CalendarIcon className="h-5 w-5 text-gray-400" />}>
      <p className="text-[15px] leading-6 text-gray-600">No activities scheduled today.</p>
    </DashboardCard>
  );
}
