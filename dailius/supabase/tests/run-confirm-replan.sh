#!/usr/bin/env bash
# Requires Docker; creates and removes an isolated PostgreSQL instance.
set -euo pipefail
cd "$(dirname "$0")/../.."
container="dailius-replan-test-$$"
trap 'docker stop "$container" >/dev/null 2>&1 || true' EXIT
docker run --detach --rm --name "$container" -e POSTGRES_PASSWORD=local-test-only postgres:17 >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
{
cat <<'SQL'
create role anon;
create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
SQL
cat supabase/migrations/*.sql
cat supabase/tests/confirm_replan.sql
cat supabase/tests/atomic_writes.sql
cat supabase/tests/planning_time_rules.sql
} | docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1

python3 supabase/tests/concurrent_atomic_writes.py "$container"
