import { PlanMockup } from "./PlanMockup";
import { WaitlistForm } from "./WaitlistForm";
import { Badge, Container } from "./ui";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
      <Container className="flex flex-col items-center text-center">
        <div className="animate-fade-up">
          <Badge>Private beta · Launching soon</Badge>
        </div>

        <h1 className="animate-fade-up mt-8 max-w-4xl text-4xl font-semibold tracking-tight text-navy [animation-delay:80ms] sm:text-6xl sm:leading-[1.08]">
          AI that plans your life
          <br className="hidden sm:block" /> not just your calendar.
        </h1>

        <p className="animate-fade-up mt-6 max-w-2xl text-lg leading-8 text-gray-600 [animation-delay:160ms] sm:text-xl">
          Connect your calendar, tell Dailius your goals and preferences, and
          get a realistic weekly plan that fits your real life — then
          automatically replans the moment something changes.
        </p>

        <div className="animate-fade-up mt-10 flex w-full max-w-md flex-col items-center [animation-delay:240ms]" id="waitlist">
          <WaitlistForm className="w-full" />
          <a
            href="#how-it-works"
            className="mt-5 text-sm font-medium text-navy underline decoration-navy/30 underline-offset-4 transition-colors hover:decoration-navy"
          >
            See how it works
          </a>
        </div>
      </Container>

      <Container className="mt-16 sm:mt-20">
        <div className="animate-fade-up [animation-delay:320ms]">
          <PlanMockup />
        </div>
      </Container>
    </section>
  );
}
