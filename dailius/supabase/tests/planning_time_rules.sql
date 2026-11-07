\set ON_ERROR_STOP on
begin;
insert into auth.users (id,email) values ('00000000-0000-0000-0000-000000000004','dst@example.test');
insert into public.activities (id,user_id,name) values ('30000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','DST workout');
insert into public.google_calendar_connections (user_id,access_token,refresh_token,token_expires_at)
 values ('00000000-0000-0000-0000-000000000004','test','test',now());
insert into public.commitments (user_id,title,start_time,end_time,source) values
 ('00000000-0000-0000-0000-000000000004','Overnight','2026-10-26T02:00:00Z','2026-10-26T06:00:00Z','Google Calendar');
grant usage on schema public,auth to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
do $$
declare
 plan uuid; replacement uuid; block uuid;
 payload jsonb := '[{"activity_id":"30000000-0000-0000-0000-000000000004","scheduled_date":"2026-11-01","start_time":"01:30","end_time":"01:30","rationale":"One real hour","time_occurrence":"earlier","start_instant":"2026-11-01T05:30:00Z","end_instant":"2026-11-01T06:30:00Z"}]';
 failed boolean := false;
begin
 -- Equal local endpoints are valid only when exact endpoints prove real duration.
 plan := public.replace_weekly_plan('2026-10-26',null,'{}','[]',payload);
 if (select time_occurrence from public.activities where id='30000000-0000-0000-0000-000000000004') <> 'earlier'
   or not exists(select 1 from public.scheduled_blocks where weekly_plan_id=plan and end_instant-start_instant=interval '1 hour') then
   raise exception 'DST occurrence/endpoints were not persisted';
 end if;
 begin
   -- A late failing insert must roll back the new preference as well as the plan.
   perform public.replace_weekly_plan('2026-10-26',plan,'{}','[]',jsonb_set(jsonb_set(payload,'{0,time_occurrence}','"later"'),'{0,end_instant}','"2026-11-01T04:30:00Z"'));
 exception when check_violation then failed := true;
 end;
 if not failed or (select time_occurrence from public.activities where id='30000000-0000-0000-0000-000000000004') <> 'earlier'
   or not exists(select 1 from public.weekly_plans where id=plan and status='active') then
   raise exception 'Failed replacement partially saved DST choice';
 end if;
 -- Replan uses the same atomic preference persistence.
 perform public.confirm_replan(plan,'[]',jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload,'{0,time_occurrence}','"later"'),'{0,end_time}','"02:30"'),'{0,start_instant}','"2026-11-01T06:30:00Z"'),'{0,end_instant}','"2026-11-01T07:30:00Z"'),'[]','{}');
 select id into block from public.scheduled_blocks where weekly_plan_id=plan and locked;
 if (select time_occurrence from public.activities where id='30000000-0000-0000-0000-000000000004') <> 'later' then
   raise exception 'Replan preference was not saved';
 end if;
 replacement := public.replace_weekly_plan('2026-10-26',plan,array[block],'[]','[]');
 if not exists(select 1 from public.scheduled_blocks where id=block and weekly_plan_id=replacement and start_instant='2026-11-01T06:30:00Z') then
   raise exception 'Regeneration lost locked DST endpoint';
 end if;
 -- Replacement removes an overlapping prior-week import, avoiding duplicates.
 perform public.replace_google_calendar_events(auth.uid(),'2026-10-26T04:00:00Z','2026-11-02T05:00:00Z',
   '[{"title":"Overnight refreshed","start_time":"2026-10-26T02:00:00Z","end_time":"2026-10-26T06:00:00Z","timezone":"America/New_York","external_event_id":"overnight"}]');
 if (select count(*) from public.commitments) <> 1 or exists(select 1 from public.commitments where title='Overnight') then
   raise exception 'Overlapping import was duplicated';
 end if;
end;
$$;
rollback;
\echo 'planning time rules: occurrence persistence, elapsed endpoints, atomic rollback, locked carryover, overlapping imports passed'
