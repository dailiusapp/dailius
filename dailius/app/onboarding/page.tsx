import type { Metadata } from "next";
import { requireUser } from "@/features/auth/services/requireUser";
import { getOnboardingProgress } from "@/features/onboarding/services/actions";
import { isGoogleCalendarConnected } from "@/features/calendar/services/getConnectionStatus";
import { OnboardingWizard } from "@/features/onboarding/components/OnboardingWizard";

export const metadata: Metadata = {
  title: "Onboarding — Dailius",
  description: "Let's build your first weekly plan.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ googleCalendarError?: string }>;
}) {
  const user = await requireUser();
  const { googleCalendarError } = await searchParams;
  const [{ step, data }, calendarConnected] = await Promise.all([
    getOnboardingProgress(),
    isGoogleCalendarConnected(user.id),
  ]);

  return (
    <OnboardingWizard
      initialStep={step}
      initialData={{ ...data, calendarConnected }}
      googleCalendarError={googleCalendarError === "1"}
    />
  );
}
