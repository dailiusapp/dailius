\set ON_ERROR_STOP on
begin;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-000000000001', 'atomic@example.test'),
 ('00000000-0000-0000-0000-000000000002', 'other@example.test');
insert into public.weekly_plans (id, user_id, week_start) values
 ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-11-02');
insert into public.activities (id, user_id, name) values
 ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Run'),
 ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Foreign');
insert into public.scheduled_blocks (id, weekly_plan_id, activity_id, scheduled_date, start_time, end_time, rationale, locked, original_scheduled_date, status) values
 ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '2026-11-03', '09:00', '09:30', 'Accepted move', true, '2026-11-02', 'completed');
insert into public.onboarding_progress (user_id, current_step, data) values
 ('00000000-0000-0000-0000-000000000001', 5, '{"draft":true}');
insert into public.google_calendar_connections (user_id, access_token, refresh_token, token_expires_at) values
 ('00000000-0000-0000-0000-000000000001', 'test', 'test', now());
insert into public.commitments (user_id, title, start_time, end_time, source) values
 ('00000000-0000-0000-0000-000000000001', 'Original imported', '2026-11-03T12:00:00Z', '2026-11-03T13:00:00Z', 'Google Calendar'),
 ('00000000-0000-0000-0000-000000000001', 'Manual', '2026-11-03T14:00:00Z', '2026-11-03T15:00:00Z', 'Manual'),
 ('00000000-0000-0000-0000-000000000001', 'Other week', '2026-11-10T14:00:00Z', '2026-11-10T15:00:00Z', 'Google Calendar'),
 ('00000000-0000-0000-0000-000000000002', 'Other user', '2026-11-03T14:00:00Z', '2026-11-03T15:00:00Z', 'Google Calendar');

-- Fault injection makes each persistence stage fail, including the LAST one.
create function pg_temp.fail_write() returns trigger language plpgsql as $$
begin
 if current_setting('test.fail_table', true) = tg_table_name then
   raise exception 'Injected failure on %', tg_table_name using errcode = '23514';
 end if;
 if tg_op = 'DELETE' then return old; end if;
 return new;
end;
$$;
do $$
declare tbl text;
begin
 foreach tbl in array array['weekly_plans','scheduled_blocks','goals','activities','activity_goals','availability','scheduling_constraints','preferences','profiles','onboarding_progress','commitments','google_calendar_connections'] loop
   execute format('create trigger test_fail before insert or update or delete on public.%I for each row execute function pg_temp.fail_write()', tbl);
 end loop;
end;
$$;
grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
create function pg_temp.all_state() returns jsonb language plpgsql as $$
declare tbl text; rows jsonb; result jsonb := '{}';
begin
 foreach tbl in array array['weekly_plans','scheduled_blocks','goals','activities','activity_goals','availability','scheduling_constraints','preferences','profiles','onboarding_progress','commitments','google_calendar_connections'] loop
   execute format('select jsonb_agg(r order by r::text) from (select to_jsonb(t) r from public.%I t) s', tbl) into rows;
   result := result || jsonb_build_object(tbl, rows);
 end loop;
 return result;
end;
$$;
create function pg_temp.expect_rollback(command text, fail_table text, expected_code text default '23514') returns void language plpgsql as $$
declare original jsonb := pg_temp.all_state(); caught boolean := false;
begin
 perform set_config('test.fail_table', fail_table, true);
 begin execute command;
 exception when others then
   if sqlstate <> expected_code then raise; end if;
   caught := true;
 end;
 perform set_config('test.fail_table', '', true);
 if not caught then raise exception 'Expected failure: %', command; end if;
 if pg_temp.all_state() is distinct from original then raise exception 'Partial write persisted: %', command; end if;
end;
$$;

do $$
declare
 plan_id uuid := '10000000-0000-0000-0000-000000000001';
 locked_ids uuid[] := array['40000000-0000-0000-0000-000000000001'::uuid];
 blocks jsonb := '[{"activity_id":"30000000-0000-0000-0000-000000000001","scheduled_date":"2026-11-05","start_time":"10:00","end_time":"10:30","rationale":"New"}]';
 command text; tbl text; new_id uuid; original jsonb;
 onboarding jsonb := '{"goals":[{"label":"Guitar","priority":"high","frequency":"3x"}],"activities":[{"name":"Yoga","durationMinutes":45,"preferredDays":["Tue"],"preferredTimeOfDay":"Morning","flexible":false}],"availability":{"weekdayMorning":{"start":"06:00","end":"08:00"},"maxDailyPlanningMinutes":60},"preferences":{"avoidSchedulingAfter":"20:00","protectedTimes":["Family dinner"],"preferredWorkoutLengthMinutes":40,"planningStyle":"balanced"}}';
 events jsonb := '[{"title":"Replacement","start_time":"2026-11-04T10:00:00Z","end_time":"2026-11-04T11:00:00Z","timezone":"UTC","external_event_id":"event-1"}]';
begin
 command := format('select public.replace_weekly_plan(%L,%L,%L,%L,%L)', '2026-11-02', plan_id, locked_ids, '["Warning"]', blocks);
 perform pg_temp.expect_rollback(command, 'weekly_plans');
 perform pg_temp.expect_rollback(command, 'scheduled_blocks');
 -- A real late constraint failure occurs AFTER archiving, creation and relinking.
 perform pg_temp.expect_rollback(format('select public.replace_weekly_plan(%L,%L,%L,%L,%L)', '2026-11-02', plan_id, locked_ids, '[]', jsonb_set(blocks,'{0,end_time}','"09:00"')), '');
 perform pg_temp.expect_rollback(format('select public.replace_weekly_plan(%L,%L,%L,%L,%L)', '2026-11-02', plan_id, locked_ids, '[]', jsonb_set(blocks,'{0,activity_id}','"30000000-0000-0000-0000-000000000002"')), '', 'P0002');
 perform pg_temp.expect_rollback(format('select public.replace_weekly_plan(%L,%L,%L,%L,%L)', '2026-11-02', plan_id, '{}'::uuid[], '[]', blocks), '', 'P0002');
 new_id := public.replace_weekly_plan('2026-11-02', plan_id, locked_ids, '["Warning"]', blocks);
 if (select status from public.weekly_plans where id = plan_id) <> 'archived'
   or (select count(*) from public.weekly_plans where status='active') <> 1
   or not exists(select 1 from public.scheduled_blocks where id = any(locked_ids) and weekly_plan_id = new_id and status='completed' and locked and original_scheduled_date='2026-11-02')
   or (select unplaced_fixed_time_warnings from public.weekly_plans where id=new_id) <> '["Warning"]'::jsonb then
   raise exception 'Plan replacement lost expected data';
 end if;
 -- A second generation based on the superseded plan fails without writes.
 perform pg_temp.expect_rollback(command, '', 'P0002');
 -- Creation without a prior plan also succeeds.
 perform public.replace_weekly_plan('2026-11-09', null, '{}', '[]', '[]');

 command := format('select public.complete_onboarding(%L)', onboarding);
 foreach tbl in array array['goals','activities','activity_goals','availability','scheduling_constraints','preferences','profiles','onboarding_progress'] loop
   perform pg_temp.expect_rollback(command, tbl);
 end loop;
 perform public.complete_onboarding(onboarding);
 if not (select onboarding_completed from public.profiles where id=auth.uid())
   or exists(select 1 from public.onboarding_progress)
   or (select count(*) from public.activity_goals) <> 1
   or not exists(select 1 from public.activities where name='Yoga' and not flexible and preferred_days=array['Tue'] and default_duration_minutes=45)
   or not exists(select 1 from public.availability where weekday_morning_start='06:00' and max_daily_planning_minutes=60)
   or (select count(*) from public.scheduling_constraints) <> 2
   or (select count(*) from public.preferences) <> 2 then
   raise exception 'Onboarding did not preserve payload';
 end if;
 original := pg_temp.all_state();
 perform public.complete_onboarding(onboarding);
 if pg_temp.all_state() is distinct from original then raise exception 'Repeated onboarding duplicated data'; end if;

 command := format('select public.replace_google_calendar_events(%L,%L,%L,%L)', auth.uid(), '2026-11-02T00:00:00Z', '2026-11-09T00:00:00Z', events);
 perform pg_temp.expect_rollback(command, 'commitments');
 perform pg_temp.expect_rollback(command, 'google_calendar_connections');
 perform pg_temp.expect_rollback(format('select public.replace_google_calendar_events(%L,%L,%L,%L)', auth.uid(), '2026-11-02T00:00:00Z', '2026-11-09T00:00:00Z', jsonb_set(events,'{0,end_time}','"2026-11-04T09:00:00Z"')), '');
 perform pg_temp.expect_rollback(format('select public.replace_google_calendar_events(%L,%L,%L,%L)', '00000000-0000-0000-0000-000000000002', '2026-11-02T00:00:00Z', '2026-11-09T00:00:00Z', events), '', '42501');
 execute command;
 if exists(select 1 from public.commitments where title='Original imported')
   or not exists(select 1 from public.commitments where title='Replacement')
   or not exists(select 1 from public.commitments where title='Manual')
   or not exists(select 1 from public.commitments where title='Other week')
   or not exists(select 1 from public.google_calendar_connections where last_synced_at is not null) then
   raise exception 'Calendar replacement lost expected data';
 end if;
 perform public.replace_google_calendar_events(auth.uid(), '2026-11-02T00:00:00Z', '2026-11-09T00:00:00Z', '[]');
 if exists(select 1 from public.commitments where title='Replacement') then raise exception 'Empty calendar response did not clear week'; end if;
 perform set_config('request.jwt.claim.sub', '', true);
 perform pg_temp.expect_rollback('select public.complete_onboarding(''{}'')', '', '42501');
 perform pg_temp.expect_rollback('select public.replace_weekly_plan(''2026-11-02'',null,''{}'',''[]'',''[]'')', '', '42501');
 if has_function_privilege('anon','public.complete_onboarding(jsonb)','execute')
   or has_function_privilege('anon','public.replace_weekly_plan(date,uuid,uuid[],jsonb,jsonb)','execute')
   or has_function_privilege('anon','public.replace_google_calendar_events(uuid,timestamptz,timestamptz,jsonb)','execute') then
   raise exception 'Anonymous RPC access';
 end if;
end;
$$;
reset role;
do $$ begin
 if not exists(select 1 from public.commitments where title='Other user') then raise exception 'Foreign data changed'; end if;
end $$;
rollback;
\echo 'atomic writes: plan, onboarding, and calendar rollback and success checks passed'
