"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOnboardingProgress, completeOnboarding } from "../services/actions";
import { TOTAL_STEPS, type OnboardingData } from "../types";
import { OnboardingProgress } from "./OnboardingProgress";
import { WelcomeStep } from "./WelcomeStep";
import { CalendarStep } from "./CalendarStep";
import { GoalsStep } from "./GoalsStep";
import { RecurringActivitiesStep } from "./RecurringActivitiesStep";
import { AvailabilityStep } from "./AvailabilityStep";
import { PreferencesStep } from "./PreferencesStep";
import { ReviewStep } from "./ReviewStep";
import { GeneratingScreen } from "./GeneratingScreen";
import { CompletionScreen } from "./CompletionScreen";

const WELCOME = 0;
const CALENDAR = 1;
const GOALS = 2;
const ACTIVITIES = 3;
const AVAILABILITY = 4;
const PREFERENCES = 5;
const REVIEW = 6;
const GENERATING = 7;
const COMPLETE = 8;

export function OnboardingWizard({
  initialStep,
  initialData,
}: {
  initialStep: number;
  initialData: OnboardingData;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const persist = useCallback((nextStep: number, nextData: OnboardingData) => {
    startTransition(() => {
      saveOnboardingProgress(nextStep, nextData).catch((error) => {
        console.error("Failed to save onboarding progress:", error);
      });
    });
  }, []);

  function advance(patch?: Partial<OnboardingData>) {
    const nextData = patch ? { ...data, ...patch } : data;
    const nextStep = step + 1;
    setData(nextData);
    setStep(nextStep);
    persist(nextStep, nextData);
  }

  function goBack() {
    const nextStep = Math.max(step - 1, WELCOME);
    setStep(nextStep);
    persist(nextStep, data);
  }

  async function handleGenerate() {
    setGenerationError(null);
    setStep(GENERATING);
    try {
      await completeOnboarding(data);
      setStep(COMPLETE);
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setGenerationError("Something went wrong generating your plan. Please try again.");
      setStep(REVIEW);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      {step >= CALENDAR && step <= REVIEW ? (
        <div className="mb-8">
          <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />
        </div>
      ) : null}

      {step === WELCOME ? <WelcomeStep onNext={() => advance()} /> : null}

      {step === CALENDAR ? <CalendarStep onNext={() => advance({ calendarSkipped: true })} /> : null}

      {step === GOALS ? (
        <GoalsStep goals={data.goals} onBack={goBack} onNext={(goals) => advance({ goals })} />
      ) : null}

      {step === ACTIVITIES ? (
        <RecurringActivitiesStep
          activities={data.activities}
          onBack={goBack}
          onNext={(activities) => advance({ activities })}
        />
      ) : null}

      {step === AVAILABILITY ? (
        <AvailabilityStep
          availability={data.availability}
          onBack={goBack}
          onNext={(availability) => advance({ availability })}
        />
      ) : null}

      {step === PREFERENCES ? (
        <PreferencesStep
          preferences={data.preferences}
          onBack={goBack}
          onNext={(preferences) => advance({ preferences })}
        />
      ) : null}

      {step === REVIEW ? (
        <ReviewStep data={data} error={generationError} onBack={goBack} onGenerate={handleGenerate} />
      ) : null}

      {step === GENERATING ? <GeneratingScreen /> : null}

      {step === COMPLETE ? <CompletionScreen onGoToDashboard={() => router.push("/dashboard")} /> : null}
    </div>
  );
}
