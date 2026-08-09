import type { PlanningOperation, ScheduledBlockDraft } from "@/features/planning/types";

// A validated, not-yet-committed multi-operation proposal — replaces the
// old single-activity "3 clickable time slots" PendingOptions shape.
// `operations` is echoed straight back to confirmChatReplan.ts on accept
// (re-validated fresh there, never trusted blindly); `previewBlocks` is the
// full resulting week, used only to render the "Review changes" list.
export type PendingProposal = {
  operations: PlanningOperation[];
  previewBlocks: ScheduledBlockDraft[];
  // Plain-language line per operation (e.g. "Move Strength → Friday"),
  // computed server-side where activity/goal names are available —
  // previewBlocks alone can't describe a REMOVE_ACTIVITY, since a removed
  // block is by definition absent from the resulting week.
  changeDescriptions: string[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  proposal?: PendingProposal;
};

export type SendChatMessageResult = {
  reply: string;
  proposal: PendingProposal | null;
};
