import { MessageIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";
import { AssistantChat } from "@/features/assistant/components/AssistantChat";

export function AIAssistantCard() {
  return (
    <DashboardCard title="Ask Dailius" icon={<MessageIcon className="h-5 w-5 text-brand-to" />} tone="accent">
      <AssistantChat variant="embedded" />
    </DashboardCard>
  );
}
