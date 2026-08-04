import { SparkleIcon } from "@/components/landing/icons";
import { PrimaryButton } from "./buttons";

// Spec copy is "Your first plan is ready!" — deliberately softened here
// since no real weekly_plan/scheduled_block rows are generated yet (see
// docs/not-yet-functional.md). Revert to the spec copy once the planning
// engine actually produces a plan at this step.
export function CompletionScreen({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <div role="status" className="flex flex-col items-center py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-to/10 text-brand-to">
        <SparkleIcon className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-navy">You&apos;re all set!</h1>
      <p className="mt-2 max-w-sm text-[15px] leading-6 text-gray-600">
        We&apos;ve saved your goals, activities, and preferences. Your personalized weekly plan
        will appear here once plan generation is live.
      </p>
      <PrimaryButton onClick={onGoToDashboard} className="mt-6">
        Go to Dashboard
      </PrimaryButton>
    </div>
  );
}
