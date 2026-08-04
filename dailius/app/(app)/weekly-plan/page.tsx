import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Weekly Plan — Dailius" };

export default function WeeklyPlanPage() {
  return <ComingSoon title="Weekly Plan" />;
}
