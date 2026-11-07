"use client";

import type { ScheduleTimeChoice } from "../types";
import type { TimeChoices } from "../services/scheduleTimes";

export function TimeOccurrenceChoices({ requests, choices, onChange, disabled }: {
  requests: ScheduleTimeChoice[]; choices: TimeChoices;
  onChange: (choices: TimeChoices) => void; disabled?: boolean;
}) {
  return <div className="space-y-3" aria-live="polite">
    {requests.map((request) => <label key={request.activityId} className="block text-sm text-gray-700">
      {request.activityName}: {request.date} at {request.time} occurs twice in {request.timezone}.
      {!request.activityId.startsWith("commitment:") ? " Your choice will be saved for this activity." : " Choose the time for this move."}
      <select value={choices[request.activityId] ?? ""} disabled={disabled}
        onChange={(event) => onChange({ ...choices, [request.activityId]: event.target.value as "earlier" | "later" })}
        className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2">
        <option value="" disabled>Choose an occurrence</option>
        <option value="earlier">Earlier occurrence (before the clocks go back)</option>
        <option value="later">Later occurrence (after the clocks go back)</option>
      </select>
    </label>)}
  </div>;
}
