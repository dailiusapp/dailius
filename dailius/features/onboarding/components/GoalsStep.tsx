"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { GoalSelection, OnboardingChatMessage, Priority } from "../types";
import { FREQUENCY_OPTIONS, GOAL_OPTIONS, PRIORITY_OPTIONS } from "../constants";
import { extractGoalsFromChat } from "../services/extractGoalsFromChat";
import { ChatPanel } from "./ChatPanel";
import { PrimaryButton, SecondaryButton } from "./buttons";
import { StepFooter, StepShell } from "./StepShell";

const GREETING: OnboardingChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "Tell me what you'd like to make more time for — I can pick from the list below and set frequency/priority for you.",
};

function keyFor(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

export function GoalsStep({
  goals,
  onBack,
  onNext,
}: {
  goals: GoalSelection[];
  onBack: () => void;
  onNext: (goals: GoalSelection[]) => void;
}) {
  const [selected, setSelected] = useState<GoalSelection[]>(goals);
  const [messages, setMessages] = useState<OnboardingChatMessage[]>([GREETING]);
  const [isSending, setIsSending] = useState(false);

  async function handleSend(text: string) {
    const nextMessages: OnboardingChatMessage[] = [...messages, { id: crypto.randomUUID(), role: "user", text }];
    setMessages(nextMessages);
    setIsSending(true);
    try {
      const result = await extractGoalsFromChat(
        messages.map(({ role, text: turnText }) => ({ role, text: turnText })),
        text,
        selected,
      );
      setSelected(result.goals);
      setMessages([...nextMessages, { id: crypto.randomUUID(), role: "assistant", text: result.reply }]);
    } catch (error) {
      console.error("Failed to send onboarding chat message:", error);
      setMessages([
        ...nextMessages,
        { id: crypto.randomUUID(), role: "assistant", text: "Sorry, something went wrong — you can still pick manually below." },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function toggle(label: string) {
    const key = keyFor(label);
    setSelected((prev) =>
      prev.some((g) => g.key === key)
        ? prev.filter((g) => g.key !== key)
        : [...prev, { key, label, frequency: FREQUENCY_OPTIONS[1], priority: "medium" }],
    );
  }

  function updateGoal(key: string, patch: Partial<GoalSelection>) {
    setSelected((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  }

  return (
    <StepShell
      title="What would you like to make more time for?"
      description="Select as many as you'd like."
    >
      <ChatPanel
        messages={messages}
        onSend={handleSend}
        isSending={isSending}
        placeholder="e.g. I want to run 3x a week and start meditating"
      />

      <p className="mb-2 mt-6 text-sm text-gray-500">…or pick manually:</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GOAL_OPTIONS.map((label) => {
          const key = keyFor(label);
          const active = selected.some((g) => g.key === key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(label)}
              disabled={isSending}
              aria-pressed={active}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-brand-to bg-brand-to/[0.08] text-navy"
                  : "border-gray-200 bg-white text-gray-700 hover:border-brand-to/40",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {selected.length > 0 ? (
        <div className="mt-6 space-y-3">
          {selected.map((goal) => (
            <div key={goal.key} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-navy">{goal.label}</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-gray-600">Frequency</span>
                  <select
                    value={goal.frequency}
                    onChange={(event) => updateGoal(goal.key, { frequency: event.target.value })}
                    disabled={isSending}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {FREQUENCY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Priority</span>
                  <select
                    value={goal.priority}
                    onChange={(event) =>
                      updateGoal(goal.key, { priority: event.target.value as Priority })
                    }
                    disabled={isSending}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <StepFooter>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={() => onNext(selected)}>Continue</PrimaryButton>
      </StepFooter>
    </StepShell>
  );
}
