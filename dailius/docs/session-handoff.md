# Session handoff — 2026-11-07

Read this before continuing work. The user has stopped for the day. This file is
project memory and a handoff, not authorization to commit, push, or deploy.

## Current state

- Repository: `/workspaces/dailius`; application: `dailius/`.
- Branch: `staging`.
- Last task #1 commit: `f7101cd` — Make plan generation onboarding and calendar writes atomic.
- The user subsequently requested committing and pushing all task #2 changes and
  these handoff notes to `staging`. Use `git log -1` and remote status to identify
  and verify the resulting commit; Vercel deployment is not yet confirmed.
- Task #1 is committed and pushed. The user confirmed both its Supabase migrations
  were executed and both application changes went live on Vercel staging.
- Task #2 is implemented and validated. Its code, migration, tests, and notes
  are included in the commit containing this handoff update. Its application
  changes have not yet been reported deployed.
- The user confirmed task #2's migration was executed in Supabase. This was a user
  report, not a direct inspection of the hosted database or migration history.
- Live staging smoke tests have not been reported completed. Do not describe the
  live user flows as verified solely from local tests or deployment confirmation.

## Work completed today

### Task #1 — atomic writes

1. `66ddad4` — Make replan acceptance atomic and document project architecture.
   `confirmReplan` now persists priorities, activity placements, commitment moves,
   and removals in one `confirm_replan` RPC transaction with ownership checks/RLS.
   Migration: `20261107000000_atomic_confirm_replan.sql`.
2. `f7101cd` — Make plan generation onboarding and calendar writes atomic.
   `replace_weekly_plan`, `complete_onboarding`, and
   `replace_google_calendar_events` make each operation transactional. Onboarding
   retries are idempotent; concurrent initial generation cannot create two active
   plans through the new RPC. Locked blocks survive regeneration.
   Migration: `20261107010000_atomic_planning_onboarding_calendar.sql`.

Calendar sync, onboarding, and initial plan generation are separate transactions;
a successful earlier operation remains saved if a later operation fails. Full
snapshot concurrency across all schedule editors and proposal idempotency are
not implemented. Details: `atomic-replan.md` and `atomic-writes.md`.

### Task #2 — scheduling and timezone consistency

The user requested a plan before implementation and clarification instead of
assumptions. All of the following decisions were explicitly confirmed:

- **1A:** An explicit workout time overrides the exercise cutoff. Other hard
  constraints still apply.
- **2A:** Profile timezone governs the planning week and calendar event times;
  UTC is the fallback when it is missing.
- **3A:** Reject nonexistent times; ask which occurrence for repeated times.
- **4A:** Include timed overnight events and block their occupied time on each day.
- Recurring activities **save the earlier/later preference on the activity**
  after a choice, rather than asking again each affected week (follow-up B).
- Durations mean **actual elapsed minutes**, including across clock changes
  (follow-up A).

Task #2 implementation:

- Shared strict local-time conversion and local-week boundaries in `dateUtils.ts`.
- Engine placement, validation, calendar loading/sync, and manual commitment edits
  follow the confirmed rules. Absolute endpoints distinguish repeated occurrences
  and preserve real durations; no automatic shift of nonexistent exact times.
- Calendar reads use overlap bounds and profile-clock daily segments, retaining
  events starting before the week and timed events crossing midnight.
- Repeated-time prompts in generation, onboarding, activity forms, chat acceptance,
  and manual commitment editing. Saved activity preferences are editable.
- Exact endpoints and choices persist atomically with the plan; locked endpoints
  survive regeneration. Calendar replacement now deletes overlapping imports.
- New migration: `20261107020000_align_planning_time_rules.sql` — **user reports
  executed already**. Requires migration-first deployment; keeps existing RPC
  signatures and legacy rows compatible.
- New implementation/rollout reference: `planning-time-rules.md`.

Key helpers: `scheduleTimes.ts`, `elapsedTime.ts`, `commitmentSegments.ts`, and
`TimeOccurrenceChoices.tsx`. The task #2 commit includes its new helper files, migration, tests, and
documentation.

## Verification at stop

- `npm test`: **102 tests passed across 15 files**.
- `npm run lint`: passed without warnings.
- `npx tsc --noEmit`: passed.
- `bash supabase/tests/run-confirm-replan.sh`: passed against disposable
  PostgreSQL 17 with all migrations. Includes real rollback, RLS/ownership,
  concurrent onboarding/initial generation, saved DST choices, exact endpoints,
  locked carryover, and overlapping overnight import replacement.
- Targeted date/time/query/calendar tests also passed with `TZ=Pacific/Honolulu`:
  **24 tests across 4 files**, verifying independence from the server timezone.
- `git diff --check`: passed.
- No production build, browser smoke test, live Google/OpenAI call, or direct
  hosted database verification was performed for task #2.

Test runner requires Docker and Python 3 and removes its disposable database on
exit. Git metadata writes and external network operations need escalation in this
workspace; earlier authorized commits/pushes were performed with escalation.

## Resume point and remaining backlog

After verifying the requested commit/push completed, check Vercel staging
deployment and perform the smoke checks in `planning-time-rules.md`. No need to
reimplement task #2 or rerun the SQL blindly. Confirm the actual working
tree/branch and remote status before continuing.

Original remaining tasks after task #2:

3. Finish AI usage controls: intent classification and onboarding calls included;
   limits enforced across concurrent requests.
4. Expand conversational support: work-late requests and questions explaining
   scheduling decisions.
5. Persist chat and proposals across refreshes and return visits.

Keep these separate from the completed atomic-write and time-rule work. All-day
calendar events, Google pagination, historical data repair, and full concurrency
control remain outside the implemented scope. Overnight occupancy is supported;
automatic moves of overnight manual commitments still depend on the existing
single-day activity placer finding a whole placement.

## Collaboration preferences

- Plan changes before implementation and ask about unclear product behavior.
- Do not silently assume answers to unresolved choices.
- Keep the user posted on meaningful progress and verification results.
- Clearly distinguish local implementation, migration applied, commit/push,
  deployment, and live validation. Do not mark a task deployed merely because
  its migration was executed.
