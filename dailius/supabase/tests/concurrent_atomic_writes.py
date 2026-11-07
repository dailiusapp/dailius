"""Concurrency checks against the runner's disposable PostgreSQL container."""
import concurrent.futures
import json
import subprocess
import sys

container = sys.argv[1]


def sql(statement):
    return subprocess.run(
        ["docker", "exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
        input=statement, text=True, capture_output=True, timeout=30,
    )


def checked(statement):
    result = sql(statement)
    if result.returncode:
        raise AssertionError(result.stderr)
    return result.stdout


user_id = "00000000-0000-0000-0000-000000000003"
checked(f"""
insert into auth.users (id,email) values ('{user_id}','concurrency@example.test');
grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
""")
payload = json.dumps({
    "goals": [{"label": "Concurrent goal", "priority": "high", "frequency": "3x"}],
    "activities": [], "availability": {}, "preferences": {"protectedTimes": []},
})
prefix = f"begin; set local role authenticated; select set_config('request.jwt.claim.sub','{user_id}',true);"
# The first successful caller keeps its transaction/row lock open briefly,
# while another independent connection attempts the same operation.
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(sql, [prefix + f"select public.complete_onboarding('{payload}'); select pg_sleep(1); commit;"] * 2))
assert all(r.returncode == 0 for r in results), [r.stderr for r in results]
assert checked(f"select count(*) from public.goals where user_id='{user_id}';").strip() == "1"
assert checked(f"select count(*) from public.activities where user_id='{user_id}';").strip() == "1"

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(sql, [prefix + "select public.replace_weekly_plan('2026-11-02',null,'{}','[]','[]'); select pg_sleep(1); commit;"] * 2))
assert sorted(r.returncode == 0 for r in results) == [False, True], [r.stderr for r in results]
failed = next(r for r in results if r.returncode)
assert "Active plan changed during generation" in failed.stderr, failed.stderr
assert checked(f"select count(*) from public.weekly_plans where user_id='{user_id}' and status='active';").strip() == "1"
print("atomic writes: concurrent onboarding and initial plan creation checks passed")
