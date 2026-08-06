"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { ScheduledBlockRow } from "@/features/planning/components/ScheduledBlockRow";
import { dayOfWeekLabel, formatClockTime, parseISODate } from "@/features/planning/services/dateUtils";
import type { ScheduledBlockDraft } from "@/features/planning/types";
import { sendChatMessage } from "../services/sendChatMessage";
import { confirmChatReschedule } from "../services/confirmChatReschedule";
import type { ChatMessage, PendingOptions } from "../types";

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "Tell me about a missed activity and I'll find a new time for it — try something like \"I missed my Tuesday workout.\"",
};

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
    setInput("");
    setIsSending(true);

    try {
      const result = await sendChatMessage(text);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: result.reply,
          block: result.block ?? undefined,
          options: result.options ?? undefined,
        },
      ]);
    } catch (error) {
      console.error("Failed to send chat message:", error);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: GENERIC_ERROR_MESSAGE },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function clearOptions(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, options: undefined } : m)));
  }

  function handleDismissOptions(messageId: string) {
    clearOptions(messageId);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "No problem — let me know if you'd like different options.",
      },
    ]);
  }

  async function handleChooseOption(messageId: string, options: PendingOptions, draft: ScheduledBlockDraft) {
    if (isSending) return;
    clearOptions(messageId);
    setIsSending(true);

    try {
      const result = await confirmChatReschedule(options.blockId, draft);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: result.reply, block: result.block ?? undefined },
      ]);
    } catch (error) {
      console.error("Failed to confirm reschedule:", error);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: GENERIC_ERROR_MESSAGE },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-6",
                message.role === "user"
                  ? "bg-gradient-to-b from-brand-from to-brand-to text-white"
                  : "bg-gray-50 text-gray-800",
              )}
            >
              <p>{message.text}</p>
              {message.block ? (
                <ul className="mt-3">
                  <ScheduledBlockRow block={message.block} />
                </ul>
              ) : null}
              {message.options ? (
                <div className="mt-3 space-y-2">
                  {message.options.drafts.map((draft, index) => {
                    const dayLabel = dayOfWeekLabel(parseISODate(draft.scheduledDate));
                    const timeRange = `${formatClockTime(draft.startTime)}–${formatClockTime(draft.endTime)}`;
                    return (
                      <button
                        key={`${draft.scheduledDate}-${draft.startTime}-${index}`}
                        type="button"
                        disabled={isSending}
                        onClick={() => handleChooseOption(message.id, message.options!, draft)}
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left text-sm text-gray-800 transition-colors hover:border-brand-to hover:bg-brand-to/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <p className="font-medium text-navy">
                          {dayLabel} {timeRange}
                        </p>
                        <p className="mt-0.5 text-[13px] leading-5 text-gray-500">{draft.rationale}</p>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => handleDismissOptions(message.id)}
                    className="text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    None of these work
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {isSending ? (
          <div role="status" aria-live="polite" className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-[15px] text-gray-500">
              <span
                aria-hidden="true"
                className="h-2 w-2 animate-pulse rounded-full bg-gray-400"
                style={{ animationDelay: "0ms" }}
              />
              <span
                aria-hidden="true"
                className="h-2 w-2 animate-pulse rounded-full bg-gray-400"
                style={{ animationDelay: "150ms" }}
              />
              <span
                aria-hidden="true"
                className="h-2 w-2 animate-pulse rounded-full bg-gray-400"
                style={{ animationDelay: "300ms" }}
              />
              <span>Dailius is thinking...</span>
            </div>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-3 border-t border-gray-100 p-4">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          type="text"
          value={input}
          disabled={isSending}
          onChange={(event) => setInput(event.target.value)}
          placeholder="I missed my Tuesday workout..."
          className="min-h-11 flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to disabled:cursor-not-allowed disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-b from-brand-from to-brand-to px-6 py-2.5 text-[15px] font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          Send
        </button>
      </form>
    </div>
  );
}
