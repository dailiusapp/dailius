import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Goals — Dailius" };

export default function GoalsPage() {
  return <ComingSoon title="Goals" />;
}
