import { CalendarIcon, CheckSquareIcon, CompassIcon } from "./icons";
import { Container, SectionHeading } from "./ui";

const CARDS = [
  {
    icon: CalendarIcon,
    label: "Calendar",
    question: "What do I have scheduled?",
    detail: "Shows you commitments. Leaves the rest of your week empty.",
    highlight: false,
  },
  {
    icon: CheckSquareIcon,
    label: "Task manager",
    question: "What do I need to do?",
    detail: "Gives you a list. Doesn't say when you'll actually do it.",
    highlight: false,
  },
  {
    icon: CompassIcon,
    label: "Dailius",
    question: "What should I do next?",
    detail: "Looks at your goals, your time, and your life — and tells you.",
    highlight: true,
  },
];

export function ProblemSection() {
  return (
    <section id="problem" className="bg-surface py-20 sm:py-28" aria-labelledby="problem-heading">
      <Container>
        <SectionHeading
          eyebrow="Why Dailius"
          title={<span id="problem-heading">Your calendar can&apos;t tell you what to do next.</span>}
          description="Calendars store events. Task managers store to-dos. Neither one helps you decide how to spend the time in between."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {CARDS.map(({ icon: Icon, label, question, detail, highlight }) => (
            <div
              key={label}
              className={
                highlight
                  ? "rounded-2xl bg-navy p-8 text-white"
                  : "rounded-2xl border border-gray-200 bg-white p-8"
              }
            >
              <Icon
                className={
                  highlight ? "h-6 w-6 text-brand-from" : "h-6 w-6 text-gray-400"
                }
              />
              <p
                className={
                  highlight
                    ? "mt-5 text-sm font-semibold tracking-wide text-blue-200 uppercase"
                    : "mt-5 text-sm font-semibold tracking-wide text-gray-400 uppercase"
                }
              >
                {label}
              </p>
              <p className={highlight ? "mt-2 text-xl font-semibold" : "mt-2 text-xl font-semibold text-navy"}>
                &ldquo;{question}&rdquo;
              </p>
              <p className={highlight ? "mt-3 text-[15px] leading-6 text-blue-100" : "mt-3 text-[15px] leading-6 text-gray-600"}>
                {detail}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
