"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { sendChatMessage } from "../services/sendChatMessage";
import { confirmChatReplan } from "../services/confirmChatReplan";
import type { ChatMessage, PendingProposal } from "../types";

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "Tell me about a missed activity, ask me to move an upcoming one, or ask me to prioritize a goal — try something like \"I missed my Tuesday workout,\" \"move Friday's run to Saturday,\" or \"prioritize running.\"",
};

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

const VARIANT_CLASSES = {
  standalone: "h-[70vh] rounded-2xl border border-gray-200 bg-white shadow-sm",
  embedded: "h-[480px]",
};

export function AssistantChat({ variant = "standalone" }: { variant?: "standalone" | "embedded" }) {
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
          proposal: result.proposal ?? undefined,
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

  function clearProposal(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, proposal: undefined } : m)));
  }

  function handleKeepCurrentPlan(messageId: string) {
    clearProposal(messageId);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "No problem — your current schedule is unchanged. Let me know if you'd like something different.",
      },
    ]);
  }

  async function handleAcceptProposal(messageId: string, proposal: PendingProposal) {
    if (isSending) return;
    clearProposal(messageId);
    setIsSending(true);

    try {
      const result = await confirmChatReplan(proposal.operations);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: result.reply }]);
    } catch (error) {
      console.error("Failed to confirm plan changes:", error);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: GENERIC_ERROR_MESSAGE },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className={cn("flex flex-col", VARIANT_CLASSES[variant])}>
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
              {message.proposal ? (
                <div className="mt-3 space-y-3">
                  <ul className="space-y-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3">
                    {message.proposal.changeDescriptions.map((line, index) => (
                      <li key={index} className="text-sm text-gray-800">
                        • {line}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => handleAcceptProposal(message.id, message.proposal!)}
                      className="rounded-full bg-gradient-to-b from-brand-from to-brand-to px-4 py-2 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Accept Changes
                    </button>
                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => handleKeepCurrentPlan(message.id)}
                      className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Keep Current Plan
                    </button>
                  </div>
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
          placeholder="I missed my Tuesday workout, move Friday's run, or prioritize running..."
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
