# Not Yet Functional

Running list of UI that exists in the app but isn't backed by real
functionality yet — things intentionally deferred while building the
UI/data-collection layer first. Distinct from `docs/future-ideas.md`
(which is unbuilt product vision); everything here already has a page,
button, or form in the app that a user can click today.

Update this file as new stubs are added or items get resolved.

---

# Google Calendar Connection

**Where:** Onboarding Step 1 ("Connect Google Calendar" button, disabled/"coming soon").

**What's missing:** Real Google OAuth — a Google Cloud project, OAuth
consent screen, redirect URI, calendar scope, and a way to store/refresh
tokens. Requires the user to create the Google Cloud credentials; Claude
can't do that step. Once connected, imported events should land in the
`commitments` table with `source = 'Google Calendar'`.

---

# Conversational Replanning (partial)

**Where:** `/assistant` — a real chat interface backed by an OpenAI
integration (`features/assistant/`).

**What works:** exactly one intent — "I missed activity X." The AI layer
(`features/assistant/services/extractIntent.ts`) only ever classifies:
given the user's message and the real, already-scheduled activities from
their current week, it picks a matching one or returns null — it never
invents a date, time, or schedule change. The actual rescheduling is a
two-step propose/confirm flow: `proposeReschedule.ts` computes up to 3
alternative day/time options (no DB writes) and the chat presents them as
clickable buttons; picking one calls `confirmReschedule.ts`, which
re-validates the chosen slot is still free, deletes the original missed
block, and inserts the new one — a *targeted* change touching only those
two rows, not a full-week regeneration. Both live in
`features/planning/services/`, reusing the existing deterministic engine
(`features/planning/services/engine.ts`) rather than reimplementing it.

**What's still missing:**
- Any other kind of request ("I have to work late Wednesday," "move my run
  to Friday," general questions about the plan) — gets a graceful fallback
  reply, not real handling. Only the missed-activity intent is understood.
- **Misleading fallback copy for future-reschedule requests** — a message
  about an *upcoming* activity (not yet missed) never reaches the AI
  matching step at all (`sendChatMessage.ts` only offers candidates with
  `scheduledDate <= today`), so the user gets the generic "I couldn't tell
  which activity you meant" reply — same wording as a genuinely garbled
  message — rather than something honest like "I can only handle already-
  missed activities right now." Worth a distinct reply once there's a
  reason to tell the two cases apart.
- **Persisted chat history** — conversations are client-side state only
  and reset on page reload. Deliberately deferred for this first pass;
  would need a new `chat_messages` table + migration.

---

# Future Activity Rescheduling

**Where:** Not implemented anywhere in the app.

**What's missing:** Conversational replanning today only handles reporting
something already missed. It doesn't yet handle proactively moving an
*upcoming* activity — "I have to work late Wednesday, move my run" or "move
Friday's run to Saturday." This is a distinct intent from "missed activity":
different candidate list (future `scheduled` blocks instead of past ones),
a new AI intent type, and different rationale copy — but should be able to
reuse the same underlying engine primitives
(`placeOccurrence`/`seedExistingBookings` in `features/planning/services/engine.ts`)
that `replanMissedActivity.ts` already uses.

---

# Dashboard nav / quick-action placeholder pages

**Where:** `/goals`, `/settings`, `/report-missed-activity`,
`/add-activity` — still render a generic "coming soon" placeholder
(`components/app/ComingSoon.tsx`). (`/weekly-plan` and `/profile` were
built and are no longer stubs.)

**What's missing:**
- `/goals` — goal management UI (list/edit/pause the `goals` rows
  onboarding creates).
- `/settings` — account settings (password change, account deletion —
  explicitly out of scope for `/profile`, see its own page).
- `/report-missed-activity` — likely superseded by the `/assistant` chat
  flow above rather than needing its own separate form; revisit whether
  this page is still needed once conversational replanning covers the
  same use case.
- `/add-activity` — ad-hoc activity creation outside the onboarding flow.

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
