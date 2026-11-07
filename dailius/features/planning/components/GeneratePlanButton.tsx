"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { TimeOccurrenceChoices } from "./TimeOccurrenceChoices";
import type { ScheduleTimeChoice } from "../types";
import type { TimeChoices } from "../services/scheduleTimes";
import { generatePlan } from "../services/generatePlan";

const DEFAULT_BUTTON_CLASSES =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-b from-brand-from to-brand-to px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98]";

export function GeneratePlanButton({ label, className, initialTimeChoices = [], onGenerated }: { label: string; className?: string; initialTimeChoices?: ScheduleTimeChoice[]; onGenerated?: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requests, setRequests] = useState<ScheduleTimeChoice[]>(initialTimeChoices);
  const [choices, setChoices] = useState<TimeChoices>({});
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generatePlan(choices);
      if (!result.ok) {
        setError(result.message);
        setRequests(result.timeChoices ?? []);
        return;
      }
      setRequests([]);
      router.refresh();
      onGenerated?.();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={cn(className ?? DEFAULT_BUTTON_CLASSES, isPending ? "opacity-60" : null)}
      >
        {isPending ? "Generating..." : label}
      </button>
      <TimeOccurrenceChoices requests={requests} choices={choices} onChange={setChoices} disabled={isPending} />
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
