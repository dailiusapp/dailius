import Link from "next/link";
import { Logo } from "@/components/landing/Logo";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link
        href="/"
        className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2"
      >
        <Logo />
        <span className="sr-only">Dailius home</span>
      </Link>

      <div className="mt-8 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </main>
  );
}
