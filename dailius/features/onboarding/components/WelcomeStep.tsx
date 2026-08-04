import { CalendarIcon, CompassIcon, SlidersIcon, TargetIcon } from "@/components/landing/icons";
import { PrimaryButton } from "./buttons";

const TOPICS = [
  { icon: CalendarIcon, label: "Your calendar" },
  { icon: TargetIcon, label: "Your goals" },
  { icon: CompassIcon, label: "Activities you enjoy" },
  { icon: SlidersIcon, label: "When you're available" },
] as const;

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
        Welcome to Dailius
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-gray-600">
        Let&apos;s spend a few minutes learning about your life so we can build your first
        personalized weekly plan.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
        {TOPICS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <Icon className="h-5 w-5 shrink-0 text-brand-to" />
            <span className="text-sm font-medium text-navy">{label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-gray-500">
        You can change everything later. <span className="text-gray-400">Estimated time: 3–5 minutes</span>
      </p>

      <PrimaryButton onClick={onNext} className="mt-6 w-full sm:w-auto">
        Let&apos;s Begin
      </PrimaryButton>
    </div>
  );
}
