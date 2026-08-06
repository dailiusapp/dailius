import type { ScheduledBlock, ScheduledBlockDraft } from "@/features/planning/types";

export type PendingOptions = {
  blockId: string;
  drafts: ScheduledBlockDraft[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  block?: ScheduledBlock;
  options?: PendingOptions;
};

export type SendChatMessageResult = {
  reply: string;
  block: ScheduledBlock | null;
  options: PendingOptions | null;
};
