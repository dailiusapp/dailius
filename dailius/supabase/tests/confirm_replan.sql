-- Run against a disposable database with all migrations applied.
\set ON_ERROR_STOP on
begin;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-000000000001', 'one@example.test'),
 ('00000000-0000-0000-0000-000000000002', 'two@example.test');
insert into public.weekly_plans (id, user_id, week_start) values
 ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-11-02'),
 ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '2026-11-02');
insert into public.goals (id, user_id, title) values
 ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Goal');
insert into public.activities (id, user_id, name) values
 ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Activity'),
 ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Foreign activity');
insert into public.scheduled_blocks (id, weekly_plan_id, activity_id, scheduled_date, start_time, end_time, rationale) values
 ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '2026-11-03', '09:00', '09:30', 'Original'),
 ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '2026-11-03', '09:00', '09:30', 'Foreign');
insert into public.commitments (id, user_id, title, start_time, end_time, source) values
 ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Manual', '2026-11-03T15:00:00Z', '2026-11-03T16:00:00Z', 'Manual'),
 ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Imported', '2026-11-03T17:00:00Z', '2026-11-03T18:00:00Z', 'Google Calendar');

-- Ordinary session grants like Supabase's default table grants. Tests run
-- as authenticated (not owner/superuser), so RLS is exercised too.
grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

create function pg_temp.snapshot() returns jsonb language sql as $$
 select jsonb_build_array(
   (select jsonb_agg(to_jsonb(g) order by id) from public.goals g),
   (select jsonb_agg(to_jsonb(b) order by id) from public.scheduled_blocks b),
   (select jsonb_agg(to_jsonb(c) order by id) from public.commitments c)
 )
$$;

-- Each failure must preserve ALL visible rows exactly, including the rows
-- written before the failing step. Unexpected SQL errors fail the test.
create function pg_temp.expect_failure(
  plan_id uuid, priorities jsonb, blocks jsonb, moves jsonb, removals uuid[], expected_code text
) returns void language plpgsql as $$
declare before_state jsonb := pg_temp.snapshot(); caught boolean := false;
begin
  begin
    perform public.confirm_replan(plan_id, priorities, blocks, moves, removals);
  exception when others then
    if sqlstate <> expected_code then raise; end if;
    caught := true;
  end;
  if not caught then raise exception 'Expected failure %', expected_code; end if;
  if pg_temp.snapshot() is distinct from before_state then
    raise exception 'Partial changes persisted';
  end if;
end;
$$;

do $$
declare
 plan_id uuid := '10000000-0000-0000-0000-000000000001';
 priorities jsonb := '[{"goal_id":"20000000-0000-0000-0000-000000000001","priority":"high"}]';
 blocks jsonb := '[{"activity_id":"30000000-0000-0000-0000-000000000001","scheduled_date":"2026-11-05","start_time":"09:00","end_time":"09:30","rationale":"Moved","original_scheduled_date":"2026-11-03"}]';
 moves jsonb := '[{"id":"50000000-0000-0000-0000-000000000001","start_time":"2026-11-06T15:00:00Z","end_time":"2026-11-06T16:00:00Z"}]';
 removals uuid[] := array['40000000-0000-0000-0000-000000000001'::uuid];
begin
 -- Insert failure after a priority update.
 perform pg_temp.expect_failure(plan_id, priorities,
   jsonb_set(blocks, '{0,end_time}', '"08:00"'), moves, removals, '23514');
 -- Commitment failure after priority and block writes.
 perform pg_temp.expect_failure(plan_id, priorities, blocks,
   jsonb_set(moves, '{0,end_time}', '"2026-11-06T14:00:00Z"'), removals, '23514');
 -- Final deletion failure after ALL other writes (and one valid deletion).
 perform pg_temp.expect_failure(plan_id, priorities, blocks, moves,
   removals || '40000000-0000-0000-0000-000000000099'::uuid, 'P0002');
 -- Foreign plan, activity, block and imported commitment are rejected.
 perform pg_temp.expect_failure('10000000-0000-0000-0000-000000000002', priorities, blocks, moves, removals, 'P0002');
 perform pg_temp.expect_failure(plan_id, priorities,
   jsonb_set(blocks, '{0,activity_id}', '"30000000-0000-0000-0000-000000000002"'), moves, removals, 'P0002');
 perform pg_temp.expect_failure(plan_id, priorities, blocks, moves,
   array['40000000-0000-0000-0000-000000000002'::uuid], 'P0002');
 perform pg_temp.expect_failure(plan_id, priorities, blocks,
   jsonb_set(moves, '{0,id}', '"50000000-0000-0000-0000-000000000002"'), removals, 'P0002');
 perform pg_temp.expect_failure(plan_id, 'null', blocks, moves, removals, '22023');
 -- Full batch succeeds, preserves lock/original date, and removes source.
 perform public.confirm_replan(plan_id, priorities, blocks, moves, removals);
 if (select priority from public.goals limit 1) <> 'high'
   or exists (select 1 from public.scheduled_blocks where id = any(removals))
   or not exists (select 1 from public.scheduled_blocks where locked and original_scheduled_date = '2026-11-03' and scheduled_date = '2026-11-05')
   or not exists (select 1 from public.commitments where id = '50000000-0000-0000-0000-000000000001' and start_time = '2026-11-06T15:00:00Z') then
   raise exception 'Successful batch did not persist expected changes';
 end if;
 -- A repeat acceptance cannot duplicate the inserted block.
 perform pg_temp.expect_failure(plan_id, priorities, blocks, moves, removals, 'P0002');
 update public.weekly_plans set status = 'archived' where id = plan_id;
 perform pg_temp.expect_failure(plan_id, priorities, blocks, moves, '{}', 'P0002');
 perform set_config('request.jwt.claim.sub', '', true);
 perform pg_temp.expect_failure(plan_id, priorities, blocks, moves, removals, '42501');
 if has_function_privilege('anon', 'public.confirm_replan(uuid,jsonb,jsonb,jsonb,uuid[])', 'execute') then
   raise exception 'Anonymous execution must be revoked';
 end if;
end;
$$;
rollback;
\echo 'confirm_replan: rollback, ownership, stale targets, and success checks passed'
