import Link from "next/link";
import { MailIcon } from "@/components/landing/icons";

export function ConfirmationScreen({ email }: { email: string }) {
  return (
    <div role="status" className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-to">
        <MailIcon className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-navy">
        Check your email
      </h1>
      <p className="mt-3 text-[15px] leading-6 text-gray-600">
        We&apos;ve sent a verification email to
        <br />
        <span className="font-medium text-navy">{email}</span>
      </p>
      <p className="mt-3 text-[15px] leading-6 text-gray-600">
        Please verify your email before signing in.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-navy/25 bg-white px-6 py-3 text-[15px] font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2"
      >
        Return to Login
      </Link>
    </div>
  );
}
