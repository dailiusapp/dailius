import { Container } from "./ui";

const AUDIENCES = ["Busy professionals", "Parents", "Builders on the side"];

export function SocialProof() {
  return (
    <section className="py-16 sm:py-20" aria-label="Who Dailius is for">
      <Container className="flex flex-col items-center text-center">
        <p className="text-sm font-semibold tracking-wide text-brand-to uppercase">
          Launching soon
        </p>
        <p className="mt-3 max-w-xl text-lg text-gray-600">
          Built for people balancing work, family, fitness, and personal
          goals — with less rearranging and more actually doing.
        </p>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {AUDIENCES.map((audience) => (
            <li
              key={audience}
              className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600"
            >
              {audience}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
