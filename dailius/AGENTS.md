<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Dailius project context

Read `docs/codebase-guide.md` for the current implementation map, documentation
priorities, development commands, and known gaps. `CLAUDE.md` contains useful
product principles but its landing-page-only implementation description is stale.

Before product changes, read the relevant requirements and design documents in
`docs/`. Preserve the separation between AI proposals and deterministic scheduling
and validation. Prefer simple, feature-organized TypeScript, server components by
default, and database access through feature services. Keep user ownership checks
and Supabase row-level security intact.
