# Planning time rules — task #2

## Confirmed behavior

The user selected these rules before implementation:

- An explicit activity start time overrides the exercise cutoff. Availability,
  protected time, commitments, collisions, and the daily planning cap still apply.
- The profile timezone defines the planning week and calendar-event display and
  scheduling inputs. A missing profile timezone uses UTC. A database lookup error
  is not treated as a missing timezone.
- Reject nonexistent local times. Repeated local times require an earlier/later
  choice; recurring activities save that preference for future occurrences.
- Include timed events crossing midnight, blocking their occupied time on each day.
- Durations mean actual elapsed minutes, including during clock changes.

## Implementation

`dateUtils.ts` enumerates candidate UTC instants and round-trips them through the
requested IANA timezone. Gaps produce no candidate; folds require an explicit
choice. This handles half-hour changes as well as one-hour changes. Week bounds
use the start of each local Monday, rather than adding a fixed number of hours.

The engine places activities using actual start/end instants. Repeated wall-clock
minutes use absolute overlap checks so the earlier occurrence can be occupied
while the later occurrence remains free. Availability/protected windows retain
wall-clock semantics. Daily planning accumulation uses elapsed minutes. Fixed
activities keep their exact clock time; flexible activities can search later
valid slots. Nonexistent exact times are rejected on dated activity entry and
are reported as unplaced during recurring generation.

Generation and confirmation return choice requests without writing the proposed
schedule. Choices are available in generation controls, onboarding, chat proposal
acceptance, and activity forms; manual commitment editing asks which occurrence
before updating. Saved activity preferences can be changed in the activity form.

New blocks persist exact endpoints and any repeated-time choice. The preference
and block writes are part of the existing replacement/confirmation transactions.
Equal or reversed local start/end times can be valid across a backwards clock
change; the database then requires strictly increasing absolute endpoints.
Accepted locked blocks retain their IDs, endpoints, statuses, and original dates
when carried into a replacement plan.

Calendar queries select intervals overlapping the local week (`start < weekEnd`
and `end > weekStart`). Reads and displays convert to the profile clock. Timed
multi-day events retain their source record IDs and exact endpoints, while the
engine/view use per-day segments clipped to the requested week. Midnight end
instants are exclusive. Same-day calendar events spanning a clock change display
UTC offsets to distinguish their actual endpoints. Calendar replacement deletes
all overlapping imported records before inserting the refreshed set in the same
transaction, including records starting in the preceding week.

## Migration and rollout

As of the 2026-11-07 handoff, the user reports this migration executed in
Supabase. The user subsequently requested committing and pushing all application
changes to staging. Vercel deployment confirmation and live smoke checks remain
pending. See `session-handoff.md`.

Apply `supabase/migrations/20261107020000_align_planning_time_rules.sql` before
deploying the application. It adds nullable `activities.time_occurrence`, and
`scheduled_blocks.time_occurrence/start_instant/end_instant`, updates the block
interval constraint, and extends the existing RPC bodies without changing their
signatures. Existing RLS, function grants, and legacy wall-time rows remain intact.
Old application writes remain valid during the migration-first rollout.

Existing blocks without exact endpoints keep their historical wall-time
representation; the migration does not invent an earlier/later occurrence or
rewrite old plans. Newly generated/replanned blocks receive exact endpoints.

Local verification:

- `npm test`: date conversion, DST gaps/folds and half-hour changes, 167/169-hour
  planning weeks, profile/UTC boundaries, query parity, overnight conflicts,
  actual elapsed duration, explicit cutoff overrides, choice-before-write,
  saved preferences, and manual commitment editing, plus the existing suite.
- `npm run lint` and `npx tsc --noEmit`.
- `bash supabase/tests/run-confirm-replan.sh`: all migrations applied in disposable
  PostgreSQL 17; includes existing rollback and concurrency tests plus occurrence
  persistence, equal-clock endpoints, preference rollback, locked carryover,
  and replacement of overlapping overnight imports.

Staging smoke checks after migration/deployment:

1. Generate an exact-time workout after the exercise cutoff; accept an unrelated
   replan and verify the explicit workout remains valid.
2. In a test account, set a timezone different from an event's source timezone;
   check Sunday/Monday events and an overnight event on both days.
3. With the application clock controlled in a test environment for a transition
   week, generate a repeated-time activity. Verify no schedule replacement until
   a choice is made, that regeneration reuses it, and that it can be edited.
4. Try a dated nonexistent time; verify rejection. Edit a manual commitment at a
   repeated time and verify the chosen timestamp and elapsed duration.

No hosted database or staging deployment is changed by local tests. All-day
calendar events and Google pagination remain outside this task. Automatic
rescheduling of an overnight manual commitment still depends on finding a whole
placement through the single-day activity placer; overnight occupancy itself is
fully represented regardless of whether a move is possible.
