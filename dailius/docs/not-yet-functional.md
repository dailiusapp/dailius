# Not Yet Functional

Running list of UI that exists in the app but isn't backed by real
functionality yet — things intentionally deferred while building the
UI/data-collection layer first. Distinct from `docs/future-ideas.md`
(which is unbuilt product vision); everything here already has a page,
button, or form in the app that a user can click today.

Update this file as new stubs are added or items get resolved.

---

# Conversational Replanning (partial)

**Where:** `/assistant` — a real chat interface backed by an OpenAI
integration (`features/assistant/`).

**What works:** two intents — "I missed activity X" and "move upcoming
activity X to [day]." The AI layer classifies which intent and which
real, already-scheduled block a message refers to (`extractIntent.ts` for
past/missed blocks, `extractFutureRescheduleIntent.ts` for future blocks,
tried in that order) — it never invents a date, time, or schedule change,
and for the future-move intent it may also extract a named target day of
week, which only *biases* the engine's search rather than deciding the
placement itself. The actual rescheduling is a two-step propose/confirm
flow: `proposeReschedule.ts` / `proposeFutureReschedule.ts` compute up to 3
alternative day/time options (no DB writes) and the chat presents them as
clickable buttons; picking one calls `confirmReschedule.ts` (shared by both
intents), which re-validates the chosen slot is still free, deletes the
original block, and inserts the new one — a *targeted* change touching only
those two rows, not a full-week regeneration. All of this lives in
`features/planning/services/`, reusing the existing deterministic engine
(`features/planning/services/engine.ts`) rather than reimplementing it.

**What's still missing:**
- General questions about the plan, or requests that aren't clearly "I missed
  X" or "move X to Y" — still get the generic fallback reply, not real
  handling.
- **Persisted chat history** — conversations are client-side state only
  and reset on page reload. Deliberately deferred for this first pass;
  would need a new `chat_messages` table + migration.

---

# Account deletion is a "request" flow, not real self-service deletion

**Where:** `/settings` (`features/settings/`) — `DeleteAccountRequest.tsx`
records a `deletion_requested_at` timestamp on the user's profile and shows
a confirmation; nothing actually deletes the account or its data.

**What's missing:** real deletion needs `supabase.auth.admin.deleteUser()`,
which requires a Supabase **service-role** key. This project has none
configured anywhere (not `.env.local`, not `.env.example`, not referenced by
any existing `lib/supabase/` client — all anon-key only). Every planning/
onboarding/calendar table already cascades from `auth.users(id) on delete
cascade`, so once a service-role-backed admin client actually deletes the
`auth.users` row, cleanup is automatic — no per-table deletes needed. The
remaining work is a deliberate decision to provision
`SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard → project settings → API)
and add it to `.env.local` + Vercel, plus a new server-only admin client
(never exposed to the browser) to call it from. Until then, deletion
requests need a human to act on them manually.

---

# Analytics

**Where:** Not implemented anywhere in the app.

**What's missing:** `docs/requirements/onboarding-flow.md` specifies
events to track (Onboarding Started, Calendar Connected/Skipped, Goal
Added, Activity Added, Availability Completed, Preferences Completed,
Plan Generated, Onboarding Completed) — no analytics provider is wired
up yet, so none of these currently fire anywhere.

---

# Apple Calendar / Microsoft Outlook

Explicitly out of scope per `docs/requirements/onboarding-flow.md`'s own
"Out of Scope (MVP)" section — listed here only for completeness.
