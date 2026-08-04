import type { Metadata } from "next";
import { getOnboardingProgress } from "@/features/onboarding/services/actions";
import { OnboardingWizard } from "@/features/onboarding/components/OnboardingWizard";

export const metadata: Metadata = {
  title: "Onboarding — Dailius",
  description: "Let's build your first weekly plan.",
};

export default async function OnboardingPage() {
  const { step, data } = await getOnboardingProgress();

  return <OnboardingWizard initialStep={step} initialData={data} />;
}
