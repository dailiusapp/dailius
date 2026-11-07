# Atomic plan generation, onboarding, and calendar sync

These changes finish the remaining multi-write operations identified in task #1.
Apply `supabase/migrations/20261107010000_atomic_planning_onboarding_calendar.sql`
**before deploying the application changes**. The migration adds three invoker
security functions, preserving RLS and allowing execution only by authenticated
users. The earlier `confirm_replan` migration is still required.

## Behavior

- `replace_weekly_plan` archives the previous plan, creates its replacement,
  transfers locked blocks without changing their IDs/status/rationale/original
  dates, and inserts new blocks in one transaction. Warnings are saved on the
  replacement. A late insertion failure restores the old active plan and all
  original block links. First generation and empty schedules are supported.
  Concurrent generation for the same user/week is serialized, including first
  creation. A changed active plan or locked-block ID set rejects stale generation.
- `complete_onboarding` saves goals, derived activities and links, recurring
  activities, availability, constraints, preferences, the profile completion flag,
  and draft cleanup in one transaction. Any failure preserves the draft and prior
  data. The profile row lock serializes completion; a completed profile makes
  retries a no-op so goals/activities are not duplicated.
- `replace_google_calendar_events` replaces the imported week and updates the
  connection's sync timestamp in one transaction. Failed insertion or timestamp
  updates preserve the prior imported events and timestamp. An empty successful
  Google response clears that week's imported events. Manual commitments, other
  weeks, and other users are preserved. The connection lock serializes imports.

Application services retain existing engine logic, input loading, Google fetches,
filtering, and user-visible error behavior. Failed sync still allows generation
from the previously stored calendar. There is no fallback to individual writes
when an RPC is unavailable or fails.

## Validation and rollout

- `npm test`: 77 tests across 11 files, including server-service tests for all
  three RPCs, failures without partial-write fallback, first generation, carried
  locks, empty imports, and failed Google fetches.
- `bash supabase/tests/run-confirm-replan.sh`: requires Docker and Python 3;
  creates a disposable PostgreSQL 17 database and applies all migrations. Runs
  original replan tests plus `atomic_writes.sql` with authenticated RLS and
  injected failures at each persistence stage. Includes actual database
  constraint failures, locked-block/status preservation, stale generation,
  onboarding retry behavior, calendar replacement boundaries, and foreign-user
  checks. Separate concurrent connections verify that two onboarding submissions
  produce one set of rows, and two first-generation requests produce one active
  plan with the stale request rejected. The database is removed on exit.
- Run `npm run lint` and `npx tsc --noEmit` before deployment.

Use the normal Supabase migration process for the intended project, then deploy
the application. These functions are additive and compatible with the previous
application. If the application goes live before the migration, the new operations
return errors without partial writes. No hosted database is modified by local
validation.

After staging deployment, smoke-test onboarding with a new test account, repeat
weekly generation after accepting an activity move, and sync Google Calendar.
Confirm that the move remains locked and onboarding does not duplicate data if
plan generation needs a retry.

## Boundaries

Each operation has its own transaction. A successful calendar sync remains saved
if subsequent plan generation fails; completed onboarding remains saved if first
plan generation fails. Retrying that generation does not duplicate onboarding.
Editing onboarding inputs after successful completion does not overwrite already
saved data; subsequent changes use the normal settings/goals/activities flows.

This does not introduce full snapshot concurrency control across all schedule
editors, change timezone boundaries, reconcile exact-time validation, add calendar
pagination, or repair data from older partial writes. Those remain separate work.
