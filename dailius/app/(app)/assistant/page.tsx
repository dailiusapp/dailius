import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "AI Assistant — Dailius" };

export default function AssistantPage() {
  return <ComingSoon title="AI Assistant" />;
}
