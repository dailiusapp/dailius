# Dailius codebase guide

Repository review: 2026-11-06, based on commit `5db481f`.
This guide records the implementation inspected during the Claude-to-Codex handoff.
Update it when the architecture or feature status changes. This is an orientation
review, not a complete security audit or live deployment verification.

## Product and working principles

Dailius helps busy people fit meaningful activities around their existing lives.
It is a personal planning layer above calendars. Goals describe outcomes;
activities are schedulable inputs; commitments occupy fixed time; weekly plans
and scheduled blocks are generated outputs. Data belongs to individual users.

The MVP validates whether people want help deciding when to do what matters.
Keep implementations simple and dependencies few. Preserve working scheduling
behavior and refactor incrementally. Native apps, household accounts, wearable
integrations, social features, and complex optimizers remain outside MVP scope.

The UI should feel calm, spacious, helpful, and trustworthy. Use the navy and
blue/indigo brand palette, Geist/Inter typography, clear explanations, accessible
controls, and encouraging language without productivity guilt or AI hype.

## Documentation map and precedence

Read the implementation and migrations to establish what actually exists.
Requirements describe intended behavior, which may be partially implemented.
When documents disagree, identify the discrepancy rather than silently treating
an older overview as the current specification.

| Documents | What they establish |
| --- | --- |
| `product-vision.md`, `product-principles.md` | Mission, target use case, user control, simplicity |
| `mvp-scope.md`, `validation-plan.md`, `user-flow.md` | MVP journey, validation questions, first-value target |
| `technical-architecture.md`, `decision-log.md` | Stack and separation of AI from scheduling enforcement |
| `planning-rules.md`, `planning-algorithm.md`, `ai-planning-engine.md` | Conceptual planning rules and objectives |
| `requirements/scheduling refactoring.md` | More recent AI-proposes/engine-validates architecture and phased requirements |
| `requirements/signup.md`, `requirements/onboarding-flow.md`, `requirements/dashboard.md` | Detailed feature requirements; some layouts and scope statements are historical |
| `database-schema.md`, `api-design.md` | Conceptual entities and proposed API conventions; consult migrations and server actions for actual contracts |
| `component-architecture.md`, `coding-standards.md`, `development-guidelines.md` | Feature organization, server-first UI, services, readable TypeScript |
| `brand-guidelines.md`, `ui-design-system.md`, `copy-guidelines.md` | Visual and communication rules |
| `not-yet-functional.md` | Useful implementation backlog, with some stale statements |
| `future-ideas.md` | Deferred vision, not an instruction to implement |

`CLAUDE.md` is significantly stale: this is no longer a landing-page-only app;
the waitlist has database capture, feature folders exist, and Vitest is configured.
Its original "LLM does not schedule" principle is now refined: AI can reason over
the week and propose operations, but deterministic code owns exact placement and
constraint enforcement. Initial generation still uses the deterministic engine.
The app README is also incomplete (ends inside its install example).

`not-yet-functional.md` predates the unified edit/delete UI and the newest
one-time/fixed-time activity model. Newly created one-time activities now live in
`activities`; older manual commitments remain supported. Do not assume that every
limitation or completed-feature statement in that file is current.

## Repository and runtime

The Git root is `/workspaces/dailius`; the application root is its `dailius/`
subdirectory. Run application commands there.

- Next.js 16.2.12 App Router, React 19.2.4, TypeScript, Tailwind CSS 4.
- Supabase SSR/Auth and PostgreSQL with row-level security.
- OpenAI SDK for intent extraction, onboarding assistance, and planning proposals.
- Vercel is the documented deployment target. Stripe is planned, not a current dependency.
- `@/*` resolves to the application root.

Commands: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`,
`npm test`, and `npx tsc --noEmit`.

Follow `AGENTS.md`: read relevant installed Next.js guides under
`node_modules/next/dist/docs/` before changing framework code.

## Implementation map

| Area | Entry points and behavior |
| --- | --- |
| Marketing | `app/(marketing)/`, `components/landing/`, `features/waitlist/`; landing, privacy, terms, database-backed waitlist |
| Auth | `app/(auth)/`, `app/auth/`, `features/auth/`; Supabase registration, verification callback, login, logout, profile and timezone helpers |
| Session protection | `proxy.ts`, `lib/supabase/middleware.ts`; refresh cookies and redirect unauthenticated protected routes; server actions use `requireUser()` |
| Onboarding | `app/onboarding/`, `features/onboarding/`; resumable wizard, manual controls plus AI extraction, persisted progress and final data creation |
| Dashboard | `app/(app)/dashboard/`, `features/dashboard/`; daily focus, assistant entry, weekly preview, quick actions and fixed-time warnings |
| Weekly plan | `app/(app)/weekly-plan/`, `features/planning/components/`; week navigation, day schedules, generation and record editing |
| Activities/commitments | `features/activities/`, `features/commitments/`; create/edit/delete, one-time dates, optional exact start time, conflict checks |
| Goals | `features/goals/`; creation, editing, deletion, priority and status |
| Assistant | `features/assistant/`; intent classification, proposal display, accept/reject flow; chat state is client-local |
| Calendar | `features/calendar/`, Google OAuth routes; read-only primary-calendar import and token refresh |
| Account | `features/profile/`, `features/settings/`; profile, availability, password, deletion request/cancellation |
| Persistence | `supabase/migrations/`; actual schema, constraints, policies and evolution |

Most application mutations use Next.js server actions in feature service files,
rather than the REST endpoints proposed in `api-design.md`. UI components should
call those services; domain scheduling rules belong outside components.

## Planning flow

### Initial generation

`generatePlan.ts` optionally refreshes Google commitments, loads inputs via
`loadEngineInputs.ts`, preserves accepted locked blocks, and calls
`engine.ts:generateWeeklySchedule`. It archives the current week's active plan,
creates another plan, relinks locked blocks, inserts newly generated blocks,
and revalidates dashboard/weekly-plan pages.

The engine subtracts commitments and protected periods from availability, places
fixed-time activities first, then considers goal priority, constrained days,
preferred time, daily capacity, and exercise balance. It can shorten flexible
activities to their configured minimum. An exact-time activity is placed at its
specified time or omitted with a warning; it does not drift to another clock time.
Locked accepted moves retain their original date metadata to avoid refilling the
vacated day during regeneration.

### Conversational replanning

`sendChatMessage.ts` builds candidate lists and calls the intent classifier.
Supported triggers cover missed activities, future activity moves, goal priority
changes, and manual commitment moves.

`proposeReplan.ts` loads state and checks planning usage, then runs:

```text
buildPlanningContext → aiPlanner → applyPlanningOperations → planningValidator
                          ↑                                  |
                          └──── violations, up to 3 attempts ─┘
```

Operations include `MOVE_ACTIVITY`, `ADD_ACTIVITY`, `REMOVE_ACTIVITY`,
`CHANGE_PRIORITY`, and `MOVE_COMMITMENT`. The AI chooses changes and target dates;
the engine's placement code chooses exact slots. Operations run against a
temporary snapshot. A valid proposal returns to the user for review.

On acceptance, `confirmReplan.ts` reloads current state, reapplies and validates
the operations, then commits changes through the `confirm_replan` PostgreSQL RPC in one
transaction. Activity placements are locked to survive
full regeneration. Proposals are ephemeral, not persisted or signed server-side
proposal records; confirmation validates client-returned operations afresh.

## Persistence and configuration

Tables include `profiles`, `goals`, `activities`, `activity_goals`,
`scheduling_constraints`, `preferences`, `availability`, `onboarding_progress`,
`weekly_plans`, `scheduled_blocks`, `commitments`,
`google_calendar_connections`, `waitlist_signups`, and `ai_planning_events`.
Policies enforce user ownership, including parent ownership for links/blocks.
Consult migrations rather than assuming the conceptual schema is implemented
verbatim; conceptual plan-version entities, for example, are not implemented.

`.env.example` currently documents only Supabase URL/anon key. OpenAI and Google
OAuth configuration are also needed for their features; check the relevant
service/env modules for exact variables. Never expose server credentials through
`NEXT_PUBLIC_*` variables or print local secret files during diagnosis.

Planning configuration includes `AI_PLANNER_MODEL` (default `gpt-4o-mini`),
`AI_DAILY_LIMIT` (default 20), and `AI_MONTHLY_LIMIT` (default 200).
The loop limit is a constant of 3. Usage records count attempts in rolling
24-hour/30-day windows, not calendar periods or whole conversations.

## Known limitations and review findings

These are observations to guide future work, not fixes made by this handoff.

- Plan generation, onboarding completion and calendar replacement still perform
  multiple database writes without a transaction. Replan confirmation now uses
  an atomic RPC; deploy `20261107000000_atomic_confirm_replan.sql` before the
  application change. See `docs/atomic-replan.md` for validation and rollout.
- Fresh confirmation validation does not provide a transactional concurrency
  boundary or a persisted proposal lifecycle.
- Initial weekly generation remains deterministic despite the refactoring
  requirements describing AI-assisted initial generation as a target.
- General plan questions, work-late/vacation requests, swap/duration/split
  operations, explicit recovery constraints, persisted proposals and persisted
  conversations are still absent or incomplete.
- Usage checking happens in `proposeReplan`, after intent extraction. Onboarding
  extraction also has separate AI paths. These caps therefore do not cover all
  AI calls. Checks fail open on usage-table errors and do not reserve capacity
  atomically across concurrent requests. Token counts are logged for successful
  parsed planner responses, but complete token/cost accounting is not implemented.
- Exercise detection uses a small name allowlist. Protected periods map known
  labels to fixed clock ranges; unknown labels such as Personal Time do not
  reserve time. Recovery is a balancing heuristic, not an explicit spacing rule.
- Exact-time generation intentionally bypasses the exercise cutoff, whereas
  `planningValidator.ts` applies the cutoff to exercise blocks. These paths need
  reconciliation if changing exact-time or replanning behavior.
- The loader documents server-timezone week-boundary query gaps. Commitments use
  their stored timezone; review interactions with the user's profile timezone
  before extending cross-zone scheduling.
- Calendar sync imports the current week of the primary Google calendar,
  skips all-day and multi-day events, does delete-and-replace, and does not
  process pagination. Imported events cannot be moved back to Google.
- Account deletion records a request; it does not delete the auth user or data.
- Analytics, billing, and broader calendar/fitness integrations remain unbuilt.

## Verification baseline

The existing Vitest suite passed on this checkout: 7 files, 56 tests.
`npm run lint` and `npx tsc --noEmit` also passed. Coverage
includes the engine, fixed-time conflicts, operation application, output parsing,
schedule validation, retry loop, and intent classification. It is not end-to-end
coverage of authentication, database writes, Google OAuth, or live OpenAI calls.
A production build and live integrations were not exercised during this review.
