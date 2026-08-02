import { Container } from "./ui";

export function Philosophy() {
  return (
    <section className="bg-navy py-24 sm:py-32" aria-labelledby="philosophy-heading">
      <Container className="max-w-3xl text-center">
        <p className="text-lg font-medium text-blue-200/80">Not another calendar.</p>
        <p className="mt-1 text-lg font-medium text-blue-200/80">Not another task manager.</p>
        <h2
          id="philosophy-heading"
          className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          An intelligent planning layer that helps you make the best use of
          your limited time.
        </h2>
      </Container>
    </section>
  );
}
