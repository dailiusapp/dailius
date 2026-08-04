import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/components/SignInForm";

export const metadata: Metadata = {
  title: "Sign in — Dailius",
  description: "Sign in to your Dailius account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const initialError =
    error === "confirmation_failed"
      ? "That confirmation link is invalid or has expired. Please sign in, or sign up again."
      : undefined;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Welcome back
      </h1>
      <p className="mt-2 text-[15px] leading-6 text-gray-600">
        Sign in to continue planning your week.
      </p>

      <div className="mt-8">
        <SignInForm initialError={initialError} />
      </div>
    </div>
  );
}
