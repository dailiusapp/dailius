-- Lets a user pin an activity to an exact clock time — a hard constraint
-- the engine places exactly or not at all — instead of only the coarse
-- preferred_time_of_day bucket. End time is never stored separately: it's
-- always fixed_start_time + default_duration_minutes, same as every other
-- duration concept in this table.
--
-- one_time_date unifies the former "oneTime" frequency mode into
-- `activities` (previously written straight to `commitments`). Non-null
-- only for a single-occurrence activity; preferred_days/preferred_frequency
-- stay empty for it, mirroring how those two already stay mutually empty
-- of each other.
--
-- No timezone column: clock-time fields here are always interpreted in the
-- user's profile timezone at engine-input-build time, consistent with
-- preferred_time_of_day and the availability table (neither has timezone
-- either).
alter table public.activities add column fixed_start_time time null;
alter table public.activities add column one_time_date date null;

-- Populated only when a fixed-time activity's occurrence couldn't be
-- placed on this regeneration (its exact slot became unavailable). Read by
-- the weekly-plan/dashboard UI to show a banner. Null/empty in the normal
-- case. Kept as a plain jsonb array of small objects rather than a new
-- table — there's no need to query/join this data, only render it
-- alongside the plan that produced it.
alter table public.weekly_plans add column unplaced_fixed_time_warnings jsonb null;
