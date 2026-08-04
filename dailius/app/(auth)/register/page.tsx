import type { Metadata } from "next";
import { SignUpForm } from "@/features/auth/components/SignUpForm";

export const metadata: Metadata = {
  title: "Create your account — Dailius",
  description: "Create a Dailius account to start planning your week.",
};

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Create your account
      </h1>
      <p className="mt-2 text-[15px] leading-6 text-gray-600">
        Plan your life, not just your calendar.
      </p>

      <div className="mt-8">
        <SignUpForm />
      </div>
    </div>
  );
}
