import type { Metadata } from "next";
import { AssistantChat } from "@/features/assistant/components/AssistantChat";

export const metadata: Metadata = {
  title: "AI Assistant — Dailius",
  description: "Ask Dailius about a missed activity and get a new time for it.",
};

export default function AssistantPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8 lg:px-12">
      <h1 className="text-2xl font-semibold text-navy">AI Assistant</h1>
      <p className="mt-1 text-sm text-gray-500">Ask Dailius about a missed activity.</p>

      <div className="mt-8">
        <AssistantChat />
      </div>
    </div>
  );
}
