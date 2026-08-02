import Link from "next/link";
import { ChevronDownIcon } from "./icons";
import { Container, SectionHeading } from "./ui";

const FAQS = [
  {
    question: "Do I replace Google Calendar?",
    answer:
      "No. Dailius connects to Google Calendar rather than replacing it. Your calendar stays the source of truth for fixed commitments — Dailius decides how to use the time around them.",
  },
  {
    question: "Does Dailius support Outlook?",
    answer:
      "Outlook support is planned alongside Google Calendar. During the private beta you'll be able to connect whichever calendar you already use.",
  },
  {
    question: "Will Dailius automatically edit my calendar?",
    answer:
      "Dailius proposes a plan and explains its reasoning. It never moves or deletes an existing event without your approval.",
  },
  {
    question: "What happens if I miss a planned activity?",
    answer:
      "Tell Dailius what happened and it finds the next best time based on your goals, your remaining availability, and recovery — without rearranging the rest of your week.",
  },
  {
    question: "Is my calendar data private?",
    answer:
      "Your commitments and preferences are only ever used to build your plan.",
  },
  {
    question: "When can I use Dailius?",
    answer:
      "We're in private beta. Join the waitlist above and we'll reach out as spots open up.",
  },
] as const;

export function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28" aria-labelledby="faq-heading">
      <Container className="max-w-3xl">
        <SectionHeading
          eyebrow="FAQ"
          title={<span id="faq-heading">Common questions</span>}
          align="center"
        />

        <div className="mt-12 divide-y divide-gray-200 border-t border-b border-gray-200">
          {FAQS.map((item, index) => (
            <details key={item.question} className="group py-5" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 rounded-sm">
                {item.question}
                <ChevronDownIcon className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-3 pr-8 text-[15px] leading-6 text-gray-600">
                {item.answer}
                {item.question === "Is my calendar data private?" ? (
                  <>
                    {" "}
                    We&apos;ll publish full privacy details before general
                    availability — see our{" "}
                    <Link href="/privacy" className="font-medium text-navy underline underline-offset-2">
                      Privacy page
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
