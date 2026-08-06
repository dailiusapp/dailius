// Fixed, explicitly configured app origin — deliberately NOT derived from
// request headers (`new URL(request.url).origin`). That approach broke the
// Google OAuth redirect_uri in this dev environment: an intermediary proxy
// (VS Code/Codespaces port forwarding) reports `https` on requests that
// only ever reach the Next.js dev server over plain HTTP, so the
// server-computed origin didn't match what's registered in Google Cloud
// Console. A fixed value sidesteps that whole class of proxy-header
// mismatches, which is also the standard pattern for OAuth redirect URIs.
export function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}
