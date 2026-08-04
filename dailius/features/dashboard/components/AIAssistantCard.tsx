import Link from "next/link";
import { MessageIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";

export function AIAssistantCard() {
  return (
    <DashboardCard
      title="Ask Dailius"
      icon={<MessageIcon className="h-5 w-5 text-brand-to" />}
      tone="accent"
    >
      <p className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-400">
        &ldquo;What should I focus on this afternoon?&rdquo;
      </p>
      <Link
        href="/assistant"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-b from-brand-from to-brand-to px-6 py-3 text-[15px] font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98]"
      >
        Open AI Assistant
      </Link>
    </DashboardCard>
  );
}
