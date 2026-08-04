import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental:
    process.env.NODE_ENV === "development"
      ? {
          serverActions: {
            // GitHub Codespaces forwards the dev server through a
            // *.app.github.dev proxy domain (or, via VS Code's local
            // tunnel, a request whose Origin is plain localhost while
            // x-forwarded-host is still the public domain) — either way
            // this otherwise fails Next's Server Actions Origin/Host CSRF
            // check.
            allowedOrigins: ["*.app.github.dev", "localhost:3000"],
          },
        }
      : undefined,
};

export default nextConfig;
