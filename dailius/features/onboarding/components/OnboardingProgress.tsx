export function OnboardingProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  const percent = Math.round((currentStep / totalSteps) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Step {currentStep} of {totalSteps}
        </span>
        <span>{percent}% Complete</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-from to-brand-to transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
