import { TargetIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";

export function TodaysFocusCard({ onboardingCompleted }: { onboardingCompleted: boolean }) {
  return (
    <DashboardCard
      title="Today's Focus"
      icon={<TargetIcon className="h-5 w-5 text-brand-to" />}
      tone="accent"
    >
      <p className="text-[15px] leading-6 text-gray-700">
        {onboardingCompleted
          ? "No personalized recommendation yet — check back once your plan is ready."
          : "Complete onboarding to receive personalized daily recommendations."}
      </p>
    </DashboardCard>
  );
}
