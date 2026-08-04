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

# AI Plan Generation

**Where:** Onboarding's final "Generate My Plan" step and the dashboard's
Today's Focus / Today's Overview / Today's Schedule / Weekly Plan Preview
cards.

**What's missing:** The actual planning engine (`docs/planning-rules.md`,
`docs/planning-algorithm.md`) and the AI conversation layer
(`docs/technical-architecture.md`) — neither exists yet. Onboarding
currently persists the user's goals/activities/availability/preferences/
constraints for real, then marks `onboarding_completed = true` and sends
the user to the dashboard without generating an actual `weekly_plan` /
`scheduled_block` row. The dashboard's plan-dependent cards correctly
show their spec'd empty states until this exists.

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
