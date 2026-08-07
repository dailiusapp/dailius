"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { OnboardingChatMessage, RecurringActivitySelection } from "../types";
import { ACTIVITY_OPTIONS, DAY_OPTIONS, DURATION_OPTIONS, TIME_OPTIONS } from "../constants";
import { extractActivitiesFromChat } from "../services/extractActivitiesFromChat";
import { ChatPanel } from "./ChatPanel";
import { PrimaryButton, SecondaryButton } from "./buttons";
import { StepFooter, StepShell } from "./StepShell";

const GREETING: OnboardingChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "Tell me about any recurring commitments — I can pick from the list below and fill in the details.",
};

function keyFor(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

export function RecurringActivitiesStep({
  activities,
  onBack,
  onNext,
}: {
  activities: RecurringActivitySelection[];
  onBack: () => void;
  onNext: (activities: RecurringActivitySelection[]) => void;
}) {
  const [selected, setSelected] = useState<RecurringActivitySelection[]>(activities);
  const [messages, setMessages] = useState<OnboardingChatMessage[]>([GREETING]);
  const [isSending, setIsSending] = useState(false);

  async function handleSend(text: string) {
    const nextMessages: OnboardingChatMessage[] = [...messages, { id: crypto.randomUUID(), role: "user", text }];
    setMessages(nextMessages);
    setIsSending(true);
    try {
      const result = await extractActivitiesFromChat(
        messages.map(({ role, text: turnText }) => ({ role, text: turnText })),
        text,
        selected,
      );
      setSelected(result.activities);
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
      prev.some((a) => a.key === key)
        ? prev.filter((a) => a.key !== key)
        : [
            ...prev,
            {
              key,
              label,
              name: label === "Other" ? "" : label,
              durationMinutes: 60,
              preferredDays: [],
              preferredTimeOfDay: null,
              flexible: true,
            },
          ],
    );
  }

  function update(key: string, patch: Partial<RecurringActivitySelection>) {
    setSelected((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  }

  function toggleDay(key: string, day: string) {
    setSelected((prev) =>
      prev.map((a) =>
        a.key === key
          ? {
              ...a,
              preferredDays: a.preferredDays.includes(day)
                ? a.preferredDays.filter((d) => d !== day)
                : [...a.preferredDays, day],
            }
          : a,
      ),
    );
  }

  return (
    <StepShell
      title="Any recurring activities?"
      description="Commitments that should regularly appear on your schedule."
    >
      <ChatPanel
        messages={messages}
        onSend={handleSend}
        isSending={isSending}
        placeholder="e.g. I play soccer on Tuesdays and go to church Sunday mornings"
      />

      <p className="mb-2 mt-6 text-sm text-gray-500">…or pick manually:</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ACTIVITY_OPTIONS.map((label) => {
          const key = keyFor(label);
          const active = selected.some((a) => a.key === key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(label)}
              disabled={isSending}
              aria-pressed={active}
              className={cn(
                "rounded-xl border px-4 py-3 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60",
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
        <div className="mt-6 space-y-4">
          {selected.map((activity) => (
            <div key={activity.key} className="rounded-xl border border-gray-200 bg-white p-4">
              {activity.label === "Other" ? (
                <input
                  type="text"
                  value={activity.name}
                  onChange={(event) => update(activity.key, { name: event.target.value })}
                  disabled={isSending}
                  placeholder="Activity name"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-navy focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60"
                />
              ) : (
                <p className="text-sm font-semibold text-navy">{activity.label}</p>
              )}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-gray-600">Duration</span>
                  <select
                    value={activity.durationMinutes ?? 60}
                    onChange={(event) =>
                      update(activity.key, { durationMinutes: Number(event.target.value) })
                    }
                    disabled={isSending}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {DURATION_OPTIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Preferred time</span>
                  <select
                    value={activity.preferredTimeOfDay ?? ""}
                    onChange={(event) =>
                      update(activity.key, { preferredTimeOfDay: event.target.value || null })
                    }
                    disabled={isSending}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-to focus:outline-none focus:ring-2 focus:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">No preference</option>
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3">
                <span className="text-sm text-gray-600">Preferred days</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {DAY_OPTIONS.map((day) => {
                    const on = activity.preferredDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(activity.key, day)}
                        disabled={isSending}
                        aria-pressed={on}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60",
                          on
                            ? "border-brand-to bg-brand-to/[0.08] text-navy"
                            : "border-gray-200 bg-white text-gray-600 hover:border-brand-to/40",
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={activity.flexible}
                  onChange={(event) => update(activity.key, { flexible: event.target.checked })}
                  disabled={isSending}
                  className="h-4 w-4 rounded border-gray-300 text-brand-to focus:ring-brand-to disabled:cursor-not-allowed disabled:opacity-60"
                />
                Flexible timing
              </label>
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
