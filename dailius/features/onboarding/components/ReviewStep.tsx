import type { OnboardingData } from "../types";
import { PrimaryButton, SecondaryButton } from "./buttons";
import { StepFooter, StepShell } from "./StepShell";

function formatTime(value: string): string {
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteStr} ${period}`;
}

const PLANNING_STYLE_LABELS: Record<string, string> = {
  relaxed: "Keep my schedule relaxed",
  balanced: "Balanced",
  productive: "Maximize productivity",
};

function SummarySection({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      {lines.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-gray-600">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-gray-500">None selected.</p>
      )}
    </section>
  );
}

export function ReviewStep({
  data,
  error,
  onBack,
  onGenerate,
}: {
  data: OnboardingData;
  error: string | null;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const goalLines = data.goals.map((goal) => `${goal.label} — ${goal.frequency}`);
  const activityLines = data.activities.map((activity) => activity.name || activity.label);

  const availabilityLines: string[] = [];
  if (
    data.availability.weekdayMorning ||
    data.availability.weekdayAfternoon ||
    data.availability.weekdayEvening
  ) {
    availabilityLines.push("Weekdays available");
  }
  if (
    data.availability.weekendMorning ||
    data.availability.weekendAfternoon ||
    data.availability.weekendEvening
  ) {
    availabilityLines.push("Weekends available");
  }
  if (data.availability.maxDailyPlanningMinutes) {
    availabilityLines.push(`Up to ${data.availability.maxDailyPlanningMinutes} minutes of planning per day`);
  }

  const preferenceLines: string[] = [];
  if (data.preferences.avoidSchedulingAfter) {
    preferenceLines.push(`No activities after ${formatTime(data.preferences.avoidSchedulingAfter)}`);
  }
  for (const protectedTime of data.preferences.protectedTimes) {
    preferenceLines.push(`Protect ${protectedTime}`);
  }
  if (data.preferences.planningStyle) {
    preferenceLines.push(PLANNING_STYLE_LABELS[data.preferences.planningStyle]);
  }

  return (
    <StepShell
      title="Review your plan inputs"
      description="Here's what we'll use to build your first weekly plan."
    >
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        <SummarySection title="Goals" lines={goalLines} />
        <SummarySection title="Recurring Activities" lines={activityLines} />
        <SummarySection title="Availability" lines={availabilityLines} />
        <SummarySection title="Preferences" lines={preferenceLines} />
      </div>

      <StepFooter>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={onGenerate}>Generate My Plan</PrimaryButton>
      </StepFooter>
    </StepShell>
  );
}
