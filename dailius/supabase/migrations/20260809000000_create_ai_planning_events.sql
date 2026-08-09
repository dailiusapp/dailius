-- Logs every AI-assisted planning attempt (docs/requirements/scheduling
-- refactoring.md §26/§37) and doubles as the data source for a simple
-- per-user daily/monthly usage check (§19) — proposeReplan.ts counts rows
-- in this table for the current user before making any real AI call.
--
-- One row per planning ATTEMPT within a loop, not one row per user
-- request, so `attempts`/`token` totals across the loop are queryable —
-- `request_id` groups attempts that belong to the same planningLoop run.

create table public.ai_planning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  trigger text not null check (
    trigger in ('MISSED_ACTIVITY', 'FUTURE_MOVE', 'PRIORITY_CHANGE')
  ),
  attempt_number integer not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  result text not null check (
    result in ('VALID', 'INVALID', 'MALFORMED', 'ERROR', 'LIMIT_EXCEEDED')
  ),
  latency_ms integer,
  created_at timestamptz not null default now()
);

alter table public.ai_planning_events enable row level security;

-- Read-only from the client's perspective — rows are only ever written by
-- server-side service code using the user's own session, same access
-- pattern as every other user-owned table in this schema.
create policy "Users can view their own AI planning events"
  on public.ai_planning_events for select
  using (auth.uid() = user_id);

create policy "Users can insert their own AI planning events"
  on public.ai_planning_events for insert
  with check (auth.uid() = user_id);

-- Powers the daily/monthly usage-limit COUNT queries in proposeReplan.ts.
create index ai_planning_events_user_created_idx on public.ai_planning_events (user_id, created_at);
