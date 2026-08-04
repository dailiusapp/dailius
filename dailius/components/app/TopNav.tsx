"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/landing/Logo";
import { ChevronDownIcon, CloseIcon, MenuIcon } from "@/components/landing/icons";
import { cn } from "@/lib/cn";
import { signOut } from "@/features/auth/services/signOut";

const APP_NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/weekly-plan", label: "Weekly Plan" },
  { href: "/goals", label: "Goals" },
  { href: "/settings", label: "Settings" },
] as const;

export function TopNav({ email, fullName }: { email: string; fullName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const displayName = fullName?.trim() || email;
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!profileOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  async function handleLogout() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-8 lg:px-12">
        <Link
          href="/dashboard"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to focus-visible:ring-offset-2"
        >
          <Logo />
          <span className="sr-only">Dailius dashboard</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {APP_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "text-sm font-medium transition-colors hover:text-navy",
                isActive(link.href) ? "text-navy" : "text-gray-600",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="relative hidden md:block" ref={profileRef}>
          <button
            type="button"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-gray-200 py-1.5 pr-3 pl-1.5 text-sm font-medium text-navy transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-brand-from to-brand-to text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="max-w-[10rem] truncate">{displayName}</span>
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                profileOpen && "rotate-180",
              )}
            />
          </button>

          {profileOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
            >
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setProfileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-surface hover:text-navy"
              >
                Profile
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setProfileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-surface hover:text-navy"
              >
                Account Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-surface hover:text-navy"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full p-2 text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-to md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-app-nav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen ? (
        <nav
          id="mobile-app-nav"
          aria-label="Mobile"
          className="border-t border-gray-200 bg-white px-6 py-4 md:hidden"
        >
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-brand-from to-brand-to text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="truncate text-sm font-medium text-navy">{displayName}</span>
          </div>

          <ul className="mt-4 flex flex-col gap-1">
            {APP_NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-base font-medium text-gray-700 hover:bg-surface hover:text-navy"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-base font-medium text-gray-700 hover:bg-surface hover:text-navy"
              >
                Profile
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-base font-medium text-gray-700 hover:bg-surface hover:text-navy"
              >
                Logout
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
