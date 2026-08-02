import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/constants";
import { Container } from "@/components/landing/ui";

export const metadata: Metadata = {
  title: "Terms — Dailius",
  description: "Terms of service for Dailius.",
};

export default function TermsPage() {
  return (
    <main id="main" className="py-20 sm:py-28">
      <Container className="max-w-2xl">
        <p className="text-sm font-semibold tracking-wide text-brand-to uppercase">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
          Terms
        </h1>
        <p className="mt-6 text-[15px] leading-7 text-gray-600">
          Dailius is currently in private beta and does not yet have
          published Terms of Service. Joining the waitlist does not create
          any binding agreement.
        </p>
        <p className="mt-4 text-[15px] leading-7 text-gray-600">
          Full Terms of Service will be published here before general
          availability. Questions in the meantime can go to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-navy underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <Link
          href="/"
          className="mt-10 inline-block text-sm font-medium text-navy underline underline-offset-2"
        >
          Back to home
        </Link>
      </Container>
    </main>
  );
}
