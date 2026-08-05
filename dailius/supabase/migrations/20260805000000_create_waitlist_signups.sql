-- Waitlist signups: anonymous, pre-auth email capture from the marketing
-- landing page's WaitlistForm. There is no user_id — signups have no
-- authenticated owner. The anon key is public (shipped in the client
-- bundle), so RLS is the real defense here: the insert policy is
-- intentionally the only policy on this table, so nobody can read
-- collected emails back through the anon/authenticated API (only via the
-- Supabase Dashboard).

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

create policy "Anyone can join the waitlist"
  on public.waitlist_signups for insert
  with check (true);
