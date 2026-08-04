import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Onboarding — Dailius" };

export default function OnboardingPage() {
  return <ComingSoon title="Onboarding" />;
}
