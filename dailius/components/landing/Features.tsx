import {
  CalendarIcon,
  MessageIcon,
  RepeatIcon,
  SlidersIcon,
  SparkleIcon,
  TargetIcon,
} from "./icons";
import { Container, SectionHeading } from "./ui";

const FEATURES = [
  {
    icon: CalendarIcon,
    title: "Import what's already fixed",
    description:
      "Connect Google Calendar or Outlook so Dailius always knows what's already committed — nothing gets double-booked.",
  },
  {
    icon: SparkleIcon,
    title: "AI fills the time around it",
    description:
      "Dailius schedules your flexible goals and activities into the time you actually have left in the week.",
  },
  {
    icon: RepeatIcon,
    title: "Adjusts when life does",
    description:
      "Missed a workout or ran into a late meeting? Dailius finds a better time instead of leaving a gap.",
  },
  {
    icon: TargetIcon,
    title: "Keeps your goals in view",
    description:
      "Fitness, learning, hobbies, or a personal project — tell Dailius what matters and it protects time for it.",
  },
  {
    icon: SlidersIcon,
    title: "Respects your limits",
    description:
      "No exercise after 8 PM. Protect family dinner. Dailius never schedules around the rules that matter to you.",
  },
  {
    icon: MessageIcon,
    title: "Talk to your schedule",
    description:
      "Tell Dailius what changed in plain language, and it explains every adjustment it makes.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28" aria-labelledby="features-heading">
      <Container>
        <SectionHeading
          eyebrow="What it does"
          title={<span id="features-heading">Everything it takes to plan a realistic week.</span>}
          description="Dailius combines your commitments, goals, and preferences into one plan — and keeps it current."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-7 transition-colors hover:border-gray-300"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-surface">
                <Icon className="h-5 w-5 text-brand-to" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-navy">{title}</h3>
              <p className="mt-2 text-[15px] leading-6 text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
