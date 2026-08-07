"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import type { OnboardingChatMessage } from "../types";

export function ChatPanel({
  messages,
  onSend,
  isSending,
  placeholder,
}: {
  messages: OnboardingChatMessage[];
  onSend: (text: string) => void;
  isSending: boolean;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    onSend(text);
    setInput("");
  }

  return (
    <div className="flex h-72 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6",
                message.role === "user"
                  ? "bg-gradient-to-b from-brand-from to-brand-to text-white"
                  : "bg-gray-50 text-gray-800",
              )}
            >
              <p>{message.text}</p>
            </div>
          </div>
        ))}

        {isSending ? (
          <div role="status" aria-live="polite" className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
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
            </div>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-100 p-3">
        <label htmlFor="onboarding-chat-input" className="sr-only">
          Message
        </label>
        <input
          id="onboarding-chat-input"
          type="text"
          value={input}
          disabled={isSending}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          className="min-h-10 flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to disabled:cursor-not-allowed disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-gradient-to-b from-brand-from to-brand-to px-5 py-2 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          Send
        </button>
      </form>
    </div>
  );
}
