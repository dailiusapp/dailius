"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Analyzing your goals...",
  "Finding available time...",
  "Balancing your priorities...",
  "Optimizing your schedule...",
  "Almost ready...",
];

export function GeneratingScreen() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center py-16 text-center">
      <span
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-4 border-brand-to/20 border-t-brand-to"
      />
      <h1 className="mt-6 text-xl font-semibold text-navy">
        Building your personalized weekly plan...
      </h1>
      <p className="mt-2 text-sm text-gray-500">{MESSAGES[index]}</p>
    </div>
  );
}
