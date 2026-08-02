import { ArrowRightIcon } from "./icons";
import { Container, SectionHeading } from "./ui";

const STEPS = [
  {
    number: "1",
    title: "Connect your calendar",
    description:
      "Sync Google Calendar or Outlook in a couple of clicks. Your existing commitments stay exactly where they are.",
  },
  {
    number: "2",
    title: "Tell Dailius your goals",
    description:
      "Add the fitness, hobbies, learning, and family time you want room for — plus any rules that matter to you.",
  },
  {
    number: "3",
    title: "Get your optimized weekly plan",
    description:
      "Dailius fits everything around your real schedule and explains every decision it makes.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-surface py-20 sm:py-28"
      aria-labelledby="how-it-works-heading"
    >
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title={<span id="how-it-works-heading">From calendar chaos to a plan you can trust.</span>}
          align="center"
        />

        <ol className="mt-14 flex flex-col items-stretch gap-6 md:flex-row md:items-start md:gap-4">
          {STEPS.map((step, index) => (
            <li key={step.number} className="flex flex-1 items-start md:items-stretch">
              <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-7">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
                  {step.number}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-navy">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-gray-600">
                  {step.description}
                </p>
              </div>

              {index < STEPS.length - 1 ? (
                <div className="hidden w-10 shrink-0 items-center justify-center text-gray-300 md:flex" aria-hidden>
                  <ArrowRightIcon className="h-5 w-5" />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
