# Atomic replan acceptance

`confirmReplan.ts` still reloads the plan and inputs, applies operations to a
snapshot, and validates the resulting schedule. It now submits all goal priority
changes, new locked activity blocks, manual commitment moves, and source block
removals through one `confirm_replan` RPC. PostgreSQL commits the entire batch or
rolls it back. There is no fallback to separate writes.

The function runs with invoker privileges and RLS. It scopes changes to the
signed-in user and active plan, verifies activity ownership, permits only manual
commitment moves, and raises an error when a target disappeared or a source block
is no longer scheduled. Missing targets return the existing stale-plan message.
Other database errors return the existing failure message. Pages are invalidated
only after a successful commit.

## Deployment

1. Apply `supabase/migrations/20261107000000_atomic_confirm_replan.sql` to the
   intended Supabase project with the project's normal migration process. For
   a linked Supabase CLI checkout, review `supabase migration list` and
   `supabase db push --dry-run` first, then run `supabase db push`. These commands
   may include other pending migrations: review that list before applying.
   Alternatively, run the exact migration file in the project's SQL editor and
   reconcile migration history with your normal process.
2. Deploy the application change after the function exists. The database change
   is additive, so the old application can continue running during deployment.
3. In a development account, accept a proposal that moves an activity and changes
   a goal priority; verify both changes and subsequent weekly regeneration.

If the application is deployed first, confirmation fails without changing data
until the migration is applied. To roll back the application, leave the additive
function in place. No hosted database was changed during local verification.

## Verification

- `npm test`: server-action tests verify one RPC for a mixed batch, timezone
  conversion, rejection before persistence, and failure without partial-write
  fallback or success-page invalidation.
- `bash supabase/tests/run-confirm-replan.sh`: requires Docker; starts a disposable
  PostgreSQL 17 instance, applies all repository migrations with a minimal Supabase
  auth fixture, and runs `supabase/tests/confirm_replan.sql` as the authenticated
  role with RLS. Verifies rollback after insert, commitment-update, and final-delete
  failures; foreign targets; imported commitments; stale sources; anonymous access;
  successful mixed batches; and duplicate acceptance of the same move. The instance
  is removed on exit. It does not connect to a hosted database.
- `npm run lint` and `npx tsc --noEmit`.

## Scope

This change makes replan persistence atomic. Weekly generation, onboarding, and
calendar replacement are now also transactional; see `docs/atomic-writes.md`. It does not add persisted
proposal IDs or idempotency for add-only proposals. The plan row lock serializes
confirmation transactions, but validation still occurs before that transaction;
concurrent edits to availability, commitments, or unrelated blocks are not covered
by a full snapshot/version check. Broader scheduling concurrency control remains
separate work.
