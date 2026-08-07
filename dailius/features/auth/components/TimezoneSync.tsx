"use client";

import { useEffect } from "react";
import { syncTimezone } from "../services/syncTimezone";

// Renders nothing — runs once per mount to keep profiles.timezone in sync
// with the browser's actual IANA timezone, so server-side "today"/"now"
// computations (dashboard, weekly plan, plan generation) reflect the
// user's real local time instead of the server's.
export function TimezoneSync({ currentTimezone }: { currentTimezone: string | null }) {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== currentTimezone) {
      syncTimezone(detected).catch((error) => console.error("Failed to sync timezone:", error));
    }
  }, [currentTimezone]);

  return null;
}
