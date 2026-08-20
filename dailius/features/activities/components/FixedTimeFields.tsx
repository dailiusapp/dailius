"use client";

import { cn } from "@/lib/cn";
import { formatClockTime, minutesToTime, timeToMinutes } from "@/features/planning/services/dateUtils";

// Explicit slots rather than a native <input type="time"> — browsers
// disagree on whether that widget honors a forced 12h/24h format, so a
// picked "10:00" can silently mean 10 AM or 10 PM depending on the
// browser. A labeled dropdown removes that ambiguity: the displayed label
// and the stored "HH:MM" value can't diverge. Shared by AddActivityForm
// and ActivityEditForm (and mirrored independently, for now, in
// CommitmentEditForm) so this array/markup isn't duplicated a third time.
export const TIME_SLOT_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

// Optional exact-time picker for an activity — a hard constraint the
// engine places at exactly this clock time or not at all (see engine.ts's
// findExactSlotInDay), distinct from the soft "Preferred time"
// Morning/Afternoon/Evening bucket. Start + duration only, end is always
// derived and shown, never entered independently.
export function FixedTimeFields({
  fixedStartTime,
  onChange,
  durationMinutes,
  disabled,
  error,
  idPrefix,
}: {
  fixedStartTime: string | null;
  onChange: (value: string | null) => void;
  durationMinutes: number;
  disabled?: boolean;
  error?: string;
  idPrefix: string;
}) {
  const enabled = fixedStartTime !== null;
  const endTime = fixedStartTime ? minutesToTime(timeToMinutes(fixedStartTime) + durationMinutes) : null;

  return (
    <div>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked ? TIME_SLOT_OPTIONS[0] : null)}
          className="h-4 w-4 rounded border-gray-300 text-brand-to focus:ring-brand-to"
        />
        Set an exact time — always scheduled then, never shifted by the planner
      </label>

      {enabled ? (
        <label className="mt-2 block text-sm" htmlFor={`${idPrefix}-fixed-time`}>
          <span className="font-medium text-navy">Start time</span>
          <select
            id={`${idPrefix}-fixed-time`}
            value={fixedStartTime ?? ""}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${idPrefix}-fixed-time-error` : undefined}
            className={cn(
              "mt-1.5 block w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2",
              error ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:border-brand-to focus:ring-brand-to",
            )}
          >
            {TIME_SLOT_OPTIONS.map((slot) => (
              <option key={slot} value={slot}>
                {formatClockTime(slot)}
              </option>
            ))}
          </select>
          {endTime ? <p className="mt-1.5 text-xs text-gray-500">Ends at {formatClockTime(endTime)}.</p> : null}
          {error ? (
            <p id={`${idPrefix}-fixed-time-error`} role="alert" className="mt-1.5 text-sm text-red-600">
              {error}
            </p>
          ) : null}
        </label>
      ) : null}
    </div>
  );
}
