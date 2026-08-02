import Link from "next/link";
import { CONTACT_EMAIL, GITHUB_URL } from "@/lib/constants";
import { CodeIcon, MailIcon } from "./icons";
import { Logo } from "./Logo";
import { Container } from "./ui";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 py-12">
      <Container className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Plan your life, not just your calendar.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-navy">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li>
                <Link href="/privacy" className="hover:text-navy">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-navy">
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-navy">Connect</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-navy"
                >
                  <CodeIcon className="h-4 w-4" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-1.5 hover:text-navy"
                >
                  <MailIcon className="h-4 w-4" />
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>

      <Container className="mt-10 border-t border-gray-100 pt-6">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} Dailius. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
