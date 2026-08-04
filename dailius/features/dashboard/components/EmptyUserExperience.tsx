import Link from "next/link";
import { SparkleIcon } from "@/components/landing/icons";

export function EmptyUserExperience() {
  return (
    <section className="rounded-2xl border border-brand-to/20 bg-gradient-to-b from-brand-from/[0.08] to-brand-to/[0.08] p-8 text-center sm:p-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-to shadow-sm">
        <SparkleIcon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-navy">Welcome to Dailius!</h2>
      <p className="mt-2 text-[15px] leading-6 text-gray-600">
        Let&apos;s build your first weekly plan.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/onboarding"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-b from-brand-from to-brand-to px-6 py-3 text-[15px] font-semibold text-white transition-transform duration-150 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2 active:scale-[0.98] sm:w-auto"
        >
          Complete Onboarding
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-navy/25 bg-white px-6 py-3 text-[15px] font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2 sm:w-auto"
        >
          Learn More
        </Link>
      </div>
    </section>
  );
}
