-- Google Calendar integration. `commitments` is docs/database-schema.md's
-- Commitment entity, never built until now (the planning engine had no
-- concept of external fixed events before this migration). `source` keeps
-- the full documented enum even though only 'Manual' and 'Google Calendar'
-- are writable today, matching the existing convention of scheduled_blocks'
-- `status` column.
--
-- `google_calendar_connections` stores OAuth tokens per user, RLS-scoped
-- like every other per-user table. Tokens are stored in plaintext, matching
-- this project's current security posture (RLS as the only access control,
-- no per-row encryption anywhere else in the schema); revisit if this ever
-- moves beyond MVP.

create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null check (end_time > start_time),
  location text,
  source text not null default 'Manual' check (source in ('Manual', 'Google Calendar', 'Apple Calendar', 'Outlook')),
  external_event_id text,
  created_at timestamptz not null default now()
);

alter table public.commitments enable row level security;

create policy "Users can manage their own commitments"
  on public.commitments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index commitments_user_start_idx on public.commitments (user_id, start_time);

create table public.google_calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  google_email text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);

alter table public.google_calendar_connections enable row level security;

create policy "Users can manage their own google calendar connection"
  on public.google_calendar_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
