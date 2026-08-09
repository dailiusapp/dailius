# Not Yet Functional

Running list of UI that exists in the app but isn't backed by real
functionality yet — things intentionally deferred while building the
UI/data-collection layer first. Distinct from `docs/future-ideas.md`
(which is unbuilt product vision); everything here already has a page,
button, or form in the app that a user can click today.

Update this file as new stubs are added or items get resolved.

---

# Conversational Replanning (AI-assisted, partial)

**Where:** `/assistant` — a real chat interface backed by an OpenAI
integration (`features/assistant/`), now routed through an AI-assisted
planning pipeline (`features/planning/services/`) per
`docs/requirements/scheduling refactoring.md`.

**What works:** three intents — "I missed activity X," "move upcoming
activity X to [day]," and "prioritize/deprioritize goal X" — chained
classifiers (`classifyIntent.ts`, unifying `extractIntent.ts`,
`extractFutureRescheduleIntent.ts`, and `extractPriorityChangeIntent.ts`)
turn a message into a `PlanningTrigger`. From there, the architecture is:

```
AI Planner (aiPlanner.ts) — proposes structured PlanningOperations
        ↓
applyPlanningOperations.ts — applies them to a snapshot (never the DB),
        using the deterministic engine's own placement (placeOccurrence)
        ↓
planningValidator.ts — checks the resulting week against hard constraints
        ↓
planningLoop.ts — bounded retry (MAX_PLANNING_ATTEMPTS = 3): invalid
        attempts feed their violations back to the AI for a revised proposal
        ↓
proposeReplan.ts — returns an ephemeral proposal (summary + operations +
        plain-language change list) to the chat UI for review
        ↓
User clicks [Accept Changes] / [Keep Current Plan]
        ↓
confirmReplan.ts — re-validates the *exact* operations fresh against
        current DB state (never trusts the client echo), then writes:
        goal priority updates, batched block insert, batched block delete
```

The AI only ever proposes *which* activities move and to roughly *which
day* (`targetDate`) — the deterministic engine's existing slot-search
(`placeOccurrence`) always decides the exact time, same principle as
before, now generalized from one activity to a whole-week, multi-operation
proposal. Every AI planning attempt is logged to `ai_planning_events`
(trigger, model, attempts, tokens, result), which also backs a simple
per-user daily/monthly usage limit (`AI_DAILY_LIMIT`/`AI_MONTHLY_LIMIT` env
vars, checked before any AI call).

**What's still missing:**
- General questions about the plan, "why did you schedule X," and requests
  that aren't clearly one of the three intents above — still get the
  generic fallback reply, not real handling.
- Work-conflict ("I have to work late Wednesday") and vacation phrasing —
  same architecture, not yet a recognized intent/classifier.
- `SWAP_ACTIVITIES`, `CHANGE_DURATION`, `SPLIT_ACTIVITY` operation types —
  the AI planner can currently only propose `MOVE_ACTIVITY`, `ADD_ACTIVITY`,
  `REMOVE_ACTIVITY`, `CHANGE_PRIORITY`.
- Recovery/spacing hard constraints (e.g. "no two hard workouts within 24h")
  — no `min_spacing`/`recovery` constraint type exists in the schema or
  engine yet, so the validator can't enforce one.
- **Persisted proposals** — a proposal is ephemeral (computed server-side,
  echoed to the client, re-validated fresh on accept), not stored in a
  `planning_proposals` table with the DRAFT/PENDING_USER/ACCEPTED/...
  status lifecycle the requirements doc describes. Works fine within one
  chat session; doesn't survive a page reload between propose and accept.
- Usage-limit *enforcement* is real but intentionally simple — flat env-
  configured daily/monthly caps per user, no tiers, no admin UI to view or
  adjust them.
- Model routing beyond one configurable model (`AI_PLANNER_MODEL` env var,
  defaults to `gpt-4o-mini` for every AI call in this pipeline).
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
