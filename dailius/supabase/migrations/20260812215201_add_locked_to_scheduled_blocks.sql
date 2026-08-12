-- A block the user (or the AI on their behalf) deliberately placed via
-- confirmReplan.ts, as opposed to one the deterministic engine placed on
-- its own during a full generatePlan.ts run. generatePlan.ts must carry
-- locked blocks forward untouched instead of wiping them on regeneration —
-- see docs/requirements/scheduling refactoring.md §16, "minimize
-- unnecessary changes."
alter table public.scheduled_blocks add column locked boolean not null default false;
