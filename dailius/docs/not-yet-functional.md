# Not Yet Functional

Running list of UI that exists in the app but isn't backed by real
functionality yet — things intentionally deferred while building the
UI/data-collection layer first. Distinct from `docs/future-ideas.md`
(which is unbuilt product vision); everything here already has a page,
button, or form in the app that a user can click today.

Update this file as new stubs are added or items get resolved.

---

# Needs Live Testing

Built and passing `npm run lint`/`npm run build`, but not yet clicked through
in a real browser with a logged-in user — no browser automation was
available in the session(s) that built these. Remove each bullet once
verified; move any real bugs found into their own note before removing.

- **Future-activity rescheduling** (`/assistant`, `extractFutureRescheduleIntent.ts`
  / `proposeFutureReschedule.ts`) — try "move Friday's run to Saturday" (day
  named, should be offered first) and "I have to work late Wednesday, move my
  gym session" (no day named, should show balanced alternatives); confirm
  picking an option still swaps the block correctly; confirm the existing
  "I missed my Tuesday workout" flow still works unchanged.
- **`/add-activity`** (`features/activities/`) — create one activity in
  "specific days" mode and one in "times per week" mode; confirm empty name
  and zero-days-selected are both rejected; confirm a created activity
  actually gets scheduled on the next `generatePlan()` run.
- **`/goals`** (`features/goals/`) — create a goal, edit its title/priority/
  status, delete a goal; on `/add-activity`, confirm a goal shows up as a
  linkable chip and that `/goals`' "N activities linked" count updates after
  linking one.

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

# Dashboard nav / quick-action placeholder pages

**Where:** `/settings`, `/report-missed-activity` — still render a generic
"coming soon" placeholder (`components/app/ComingSoon.tsx`). (`/weekly-plan`,
`/profile`, `/add-activity`, and `/goals` were built and are no longer stubs.)

**What's missing:**
- `/settings` — account settings (password change, account deletion —
  explicitly out of scope for `/profile`, see its own page).
- `/report-missed-activity` — likely superseded by the `/assistant` chat
  flow above rather than needing its own separate form; revisit whether
  this page is still needed once conversational replanning covers the
  same use case.

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
