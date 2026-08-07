import type { Metadata } from "next";
import { requireUser } from "@/features/auth/services/requireUser";
import { getProfile } from "@/features/auth/services/getProfile";
import { getPlanForWeek } from "@/features/planning/services/getPlanForWeek";
import { GeneratePlanButton } from "@/features/planning/components/GeneratePlanButton";
import { WeekNavigator } from "@/features/planning/components/WeekNavigator";
import { DayScheduleSection } from "@/features/planning/components/DayScheduleSection";
import { EmptyUserExperience } from "@/features/dashboard/components/EmptyUserExperience";
import { addDays, getWeekStart, parseISODate, toISODate, todayInTimezone } from "@/features/planning/services/dateUtils";

export const metadata: Metadata = {
  title: "Weekly Plan — Dailius",
  description: "Your full weekly schedule.",
};

function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISODate(value).getTime());
}

export default async function WeeklyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const onboardingCompleted = profile?.onboardingCompleted ?? false;

  const { week } = await searchParams;
  const currentWeekStart = toISODate(getWeekStart(todayInTimezone(profile?.timezone ?? null)));
  const weekStart =
    week && isValidISODate(week) ? toISODate(getWeekStart(parseISODate(week))) : currentWeekStart;
  const isCurrentWeek = weekStart === currentWeekStart;

  const plan = onboardingCompleted ? await getPlanForWeek(user.id, weekStart) : null;
  const days = Array.from({ length: 7 }, (_, index) => addDays(parseISODate(weekStart), index));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8 lg:px-12">
      <h1 className="text-xl font-semibold text-navy">Weekly Plan</h1>

      {!onboardingCompleted ? (
        <div className="mt-6">
          <EmptyUserExperience />
        </div>
      ) : (
        <>
          <div className="mt-6">
            <WeekNavigator weekStart={weekStart} isCurrentWeek={isCurrentWeek} />
          </div>

          <div className="mt-6 flex flex-col gap-6">
            {!plan ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <p className="text-[15px] leading-6 text-gray-600">
                  {isCurrentWeek
                    ? "You don't have a plan yet for this week."
                    : "No plan was generated for this week."}
                </p>
                {isCurrentWeek ? (
                  <div className="mt-4 flex justify-center">
                    <GeneratePlanButton label="Generate My Plan" />
                  </div>
                ) : null}
              </div>
            ) : (
              days.map((date) => {
                const iso = toISODate(date);
                const blocksForDay = plan.blocks.filter((block) => block.scheduledDate === iso);
                const commitmentsForDay = plan.commitments.filter((commitment) => commitment.scheduledDate === iso);
                return (
                  <DayScheduleSection key={iso} date={date} blocks={blocksForDay} commitments={commitmentsForDay} />
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
