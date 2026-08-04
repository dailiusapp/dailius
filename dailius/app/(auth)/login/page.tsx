import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/components/SignInForm";

export const metadata: Metadata = {
  title: "Sign in — Dailius",
  description: "Sign in to your Dailius account.",
};

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Welcome back
      </h1>
      <p className="mt-2 text-[15px] leading-6 text-gray-600">
        Sign in to continue planning your week.
      </p>

      <div className="mt-8">
        <SignInForm />
      </div>
    </div>
  );
}
