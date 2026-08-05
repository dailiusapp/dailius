-- Planning engine output tables. Named plurally (weekly_plans,
-- scheduled_blocks) to match the goals/activities convention already
-- established, diverging from docs/database-schema.md's singular entity
-- names the same way activities/scheduling_constraints already do.
--
-- `confidence` (present in docs/database-schema.md's Scheduled Block) is
-- intentionally omitted: nothing in the requirements docs reads it, and a
-- deterministic, template-based engine has no natural probabilistic value
-- to put there. `status` is added beyond the docs' field list because
-- docs/requirements/dashboard.md's Today's Schedule card requires one.
--
-- No DB-level overlap-prevention constraint: the engine is the sole writer
-- and is designed to never produce overlapping blocks for a user.

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.weekly_plans enable row level security;

create policy "Users can manage their own weekly plans"
  on public.weekly_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Not unique: regeneration inserts a new active row and archives the old
-- one, so history can accumulate per (user_id, week_start).
create index weekly_plans_user_week_idx on public.weekly_plans (user_id, week_start);

create table public.scheduled_blocks (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  scheduled_date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'missed', 'cancelled')),
  rationale text not null,
  created_at timestamptz not null default now()
);

alter table public.scheduled_blocks enable row level security;

create policy "Users can manage blocks on their own weekly plans"
  on public.scheduled_blocks for all
  using (
    exists (select 1 from public.weekly_plans p where p.id = weekly_plan_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.weekly_plans p where p.id = weekly_plan_id and p.user_id = auth.uid())
  );

create index scheduled_blocks_plan_idx on public.scheduled_blocks (weekly_plan_id);
create index scheduled_blocks_date_idx on public.scheduled_blocks (scheduled_date);

-- Onboarding's RecurringActivitiesStep already collects a "Flexible
-- timing" checkbox per activity, but completeOnboarding has never
-- persisted it. The engine needs it to decide whether an activity's
-- preferred days are a hard requirement or a soft preference.
alter table public.activities add column flexible boolean not null default true;
