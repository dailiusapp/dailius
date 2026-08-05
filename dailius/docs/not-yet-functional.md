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

# Conversational Replanning

**Where:** Not implemented anywhere in the app. Deterministic plan
generation (below) is done, but there's no way to ask for changes yet.

**What's missing:** The AI conversation layer (`docs/technical-architecture.md`)
that would let a user say "I missed my Tuesday workout" or "I have to work
late Wednesday" and get a re-planned schedule back. This needs the
`/assistant` chat interface plus an OpenAI integration — neither exists.
The deterministic planning engine (`features/planning/`) that would do the
actual rescheduling work already exists and can be called again for a
full regeneration, but nothing translates natural language into a call to
it yet, and it only ever regenerates the whole week rather than making a
minimal, targeted change.

---

# AI Assistant ("Ask Dailius")

**Where:** Dashboard AI Assistant card → `/assistant` placeholder page.

**What's missing:** A real chat interface and the AI conversation layer
(OpenAI integration) described in `docs/technical-architecture.md`.

---

# Dashboard nav / quick-action placeholder pages

**Where:** `/weekly-plan`, `/goals`, `/settings`, `/profile`,
`/report-missed-activity`, `/add-activity` — all render a generic
"coming soon" placeholder (`components/app/ComingSoon.tsx`).

**What's missing:**
- `/weekly-plan` — full weekly schedule view (needs Weekly Plan +
  Scheduled Block data, i.e. the planning engine).
- `/goals` — goal management UI (list/edit/pause the `goals` rows
  onboarding creates).
- `/settings`, `/profile` — account settings / profile editing UI.
- `/report-missed-activity`, `/add-activity` — ad-hoc activity
  logging/creation outside the onboarding flow.

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
