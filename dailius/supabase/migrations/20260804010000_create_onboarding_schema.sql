-- Onboarding data model. Entities and field names follow
-- docs/database-schema.md; what gets written into them is driven by
-- docs/requirements/onboarding-flow.md. `scheduling_constraints` and
-- `preferences` map onto docs/database-schema.md's Constraint/Preference
-- entities; `availability` isn't yet a named entity there but captures
-- onboarding's Step 4 data (a single row per user, not a repeating list,
-- so a dedicated table reads clearer than generic type/value rows).
-- `onboarding_progress` is scratch storage only, for wizard autosave/resume
-- — it's cleared once the wizard completes and writes the rows below.

alter table public.profiles
  add column onboarding_completed boolean not null default false;

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  start_date date not null default current_date,
  target_date date,
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "Users can manage their own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text,
  default_duration_minutes integer,
  preferred_frequency text,
  preferred_days text[],
  preferred_time_of_day text,
  minimum_duration_minutes integer,
  maximum_duration_minutes integer,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;

create policy "Users can manage their own activities"
  on public.activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.activity_goals (
  activity_id uuid not null references public.activities (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  primary key (activity_id, goal_id)
);

alter table public.activity_goals enable row level security;

create policy "Users can manage links between their own activities and goals"
  on public.activity_goals for all
  using (
    exists (select 1 from public.activities a where a.id = activity_id and a.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.activities a where a.id = activity_id and a.user_id = auth.uid())
    and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
  );

create table public.scheduling_constraints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  value text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.scheduling_constraints enable row level security;

create policy "Users can manage their own constraints"
  on public.scheduling_constraints for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  value text not null,
  weight numeric,
  created_at timestamptz not null default now()
);

alter table public.preferences enable row level security;

create policy "Users can manage their own preferences"
  on public.preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.availability (
  user_id uuid primary key references auth.users (id) on delete cascade,
  weekday_morning boolean not null default false,
  weekday_afternoon boolean not null default false,
  weekday_evening boolean not null default false,
  weekend_morning boolean not null default false,
  weekend_afternoon boolean not null default false,
  weekend_evening boolean not null default false,
  max_daily_planning_minutes integer,
  updated_at timestamptz not null default now()
);

alter table public.availability enable row level security;

create policy "Users can manage their own availability"
  on public.availability for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.onboarding_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_step integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.onboarding_progress enable row level security;

create policy "Users can manage their own onboarding progress"
  on public.onboarding_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
