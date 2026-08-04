"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard failed to load:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-24 text-center sm:px-8 lg:px-12">
      <h1 className="text-xl font-semibold text-navy">We couldn&apos;t load your dashboard.</h1>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-b from-brand-from to-brand-to px-6 py-3 text-[15px] font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98]"
      >
        Retry
      </button>
    </div>
  );
}
