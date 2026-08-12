-- For a locked block created by a MOVE_ACTIVITY replan (see confirmReplan.ts
-- and the `locked` column added in 20260812215201), records the date the
-- activity moved FROM. generatePlan.ts needs this to know which of the
-- activity's preferred days is already satisfied by the move — without it,
-- a full regeneration has no way to tell that a preferred day is "spoken
-- for" by a block that now lives elsewhere, and ends up re-filling that
-- original slot with a fresh occurrence (see engine.ts's `LockedBlock`).
-- Null for locked blocks created by ADD_ACTIVITY, which have no prior slot.
alter table public.scheduled_blocks add column original_scheduled_date date null;
