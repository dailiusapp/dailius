import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/landing/Logo";
import { requireUser } from "@/features/auth/services/requireUser";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center px-6 sm:px-8">
          <Link
            href="/dashboard"
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2"
          >
            <Logo />
            <span className="sr-only">Dailius dashboard</span>
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
