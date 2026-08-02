export const CONTACT_EMAIL = "dailiusapp@gmail.com";
export const GITHUB_URL = "https://github.com/dailiusapp/dailius";

// Prefixed with "/" so these still resolve correctly from other routes
// (e.g. /privacy), not just from the homepage itself.
export const NAV_LINKS = [
  { href: "/#problem", label: "Why Dailius" },
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
] as const;
