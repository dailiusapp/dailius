-- Every RPC is a single transaction; exceptions roll back the entire operation.
-- Keep invoker security and derive ownership from the authenticated session.
create function public.replace_weekly_plan(
  p_week_start date, p_expected_plan_id uuid, p_locked_block_ids uuid[],
  p_warnings jsonb, p_blocks jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  current_id uuid;
  new_id uuid;
  locked_ids uuid[];
  item jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_week_start is null or p_locked_block_ids is null
    or jsonb_typeof(p_blocks) is distinct from 'array'
    or jsonb_typeof(p_warnings) is distinct from 'array' then
    raise exception 'Invalid plan payload' using errcode = '22023';
  end if;
  -- Serializes creation even when there is no existing plan row to lock.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':plan:' || p_week_start::text, 0));
  select id into current_id from public.weekly_plans
    where user_id = auth.uid() and week_start = p_week_start and status = 'active'
    for update;
  if current_id is distinct from p_expected_plan_id then
    raise exception 'Active plan changed during generation' using errcode = 'P0002';
  end if;
  -- Lock the carried rows before comparing the set used by the engine.
  perform 1 from public.scheduled_blocks where weekly_plan_id = current_id and locked for update;
  select coalesce(array_agg(id order by id), '{}'::uuid[]) into locked_ids
    from public.scheduled_blocks where weekly_plan_id = current_id and locked;
  if locked_ids is distinct from array(select unnest(p_locked_block_ids) order by 1) then
    raise exception 'Locked blocks changed during generation' using errcode = 'P0002';
  end if;
  update public.weekly_plans set status = 'archived' where id = current_id;
  insert into public.weekly_plans (user_id, week_start, status, unplaced_fixed_time_warnings)
    values (auth.uid(), p_week_start, 'active',
      case when jsonb_array_length(p_warnings) > 0 then p_warnings else null end)
    returning id into new_id;
  update public.scheduled_blocks set weekly_plan_id = new_id
    where weekly_plan_id = current_id and id = any(p_locked_block_ids);
  for item in select value from jsonb_array_elements(p_blocks) loop
    perform 1 from public.activities
      where id = (item->>'activity_id')::uuid and user_id = auth.uid() and enabled;
    if not found then
      raise exception 'Activity is no longer available' using errcode = 'P0002';
    end if;
    if (item->>'scheduled_date')::date < p_week_start
      or (item->>'scheduled_date')::date >= p_week_start + 7 then
      raise exception 'Block is outside the plan week' using errcode = '22023';
    end if;
    insert into public.scheduled_blocks
      (weekly_plan_id, activity_id, scheduled_date, start_time, end_time, rationale)
      values (new_id, (item->>'activity_id')::uuid, (item->>'scheduled_date')::date,
        (item->>'start_time')::time, (item->>'end_time')::time, item->>'rationale');
  end loop;
  return new_id;
end;
$$;

create function public.complete_onboarding(p_data jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  completed boolean;
  item jsonb;
  goal_id uuid;
  activity_id uuid;
  avail jsonb := p_data->'availability';
  prefs jsonb := p_data->'preferences';
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select onboarding_completed into completed from public.profiles
    where id = auth.uid() for update;
  if not found then
    raise exception 'Profile missing' using errcode = 'P0002';
  end if;
  -- The profile lock serializes double clicks/retries. Completed onboarding
  -- is a no-op, preserving subsequent user edits and avoiding duplicates.
  if completed then return; end if;
  if jsonb_typeof(p_data->'goals') is distinct from 'array'
    or jsonb_typeof(p_data->'activities') is distinct from 'array'
    or jsonb_typeof(avail) is distinct from 'object'
    or jsonb_typeof(prefs) is distinct from 'object'
    or jsonb_typeof(prefs->'protectedTimes') is distinct from 'array' then
    raise exception 'Invalid onboarding payload' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(p_data->'goals') loop
    insert into public.goals (user_id, title, priority)
      values (auth.uid(), item->>'label', item->>'priority') returning id into goal_id;
    insert into public.activities (user_id, name, default_duration_minutes, preferred_frequency)
      values (auth.uid(), item->>'label', 30, item->>'frequency') returning id into activity_id;
    insert into public.activity_goals values (activity_id, goal_id);
  end loop;
  for item in select value from jsonb_array_elements(p_data->'activities') loop
    insert into public.activities (user_id, name, default_duration_minutes, preferred_days, preferred_time_of_day, flexible, enabled)
      values (auth.uid(), item->>'name', (item->>'durationMinutes')::integer,
        array(select jsonb_array_elements_text(item->'preferredDays')),
        item->>'preferredTimeOfDay', (item->>'flexible')::boolean, true);
  end loop;
  insert into public.availability (
    user_id, weekday_morning_start, weekday_morning_end, weekday_afternoon_start, weekday_afternoon_end,
    weekday_evening_start, weekday_evening_end, weekend_morning_start, weekend_morning_end,
    weekend_afternoon_start, weekend_afternoon_end, weekend_evening_start, weekend_evening_end,
    max_daily_planning_minutes, updated_at
  ) values (
    auth.uid(), (avail#>>'{weekdayMorning,start}')::time, (avail#>>'{weekdayMorning,end}')::time,
    (avail#>>'{weekdayAfternoon,start}')::time, (avail#>>'{weekdayAfternoon,end}')::time,
    (avail#>>'{weekdayEvening,start}')::time, (avail#>>'{weekdayEvening,end}')::time,
    (avail#>>'{weekendMorning,start}')::time, (avail#>>'{weekendMorning,end}')::time,
    (avail#>>'{weekendAfternoon,start}')::time, (avail#>>'{weekendAfternoon,end}')::time,
    (avail#>>'{weekendEvening,start}')::time, (avail#>>'{weekendEvening,end}')::time,
    (avail->>'maxDailyPlanningMinutes')::integer, now()
  ) on conflict (user_id) do update set
    weekday_morning_start = excluded.weekday_morning_start, weekday_morning_end = excluded.weekday_morning_end,
    weekday_afternoon_start = excluded.weekday_afternoon_start, weekday_afternoon_end = excluded.weekday_afternoon_end,
    weekday_evening_start = excluded.weekday_evening_start, weekday_evening_end = excluded.weekday_evening_end,
    weekend_morning_start = excluded.weekend_morning_start, weekend_morning_end = excluded.weekend_morning_end,
    weekend_afternoon_start = excluded.weekend_afternoon_start, weekend_afternoon_end = excluded.weekend_afternoon_end,
    weekend_evening_start = excluded.weekend_evening_start, weekend_evening_end = excluded.weekend_evening_end,
    max_daily_planning_minutes = excluded.max_daily_planning_minutes, updated_at = excluded.updated_at;
  if nullif(prefs->>'avoidSchedulingAfter', '') is not null then
    insert into public.scheduling_constraints (user_id, type, value)
      values (auth.uid(), 'latest_exercise_time', prefs->>'avoidSchedulingAfter');
  end if;
  insert into public.scheduling_constraints (user_id, type, value)
    select auth.uid(), 'protected_time', value from jsonb_array_elements_text(prefs->'protectedTimes');
  if coalesce((prefs->>'preferredWorkoutLengthMinutes')::integer, 0) <> 0 then
    insert into public.preferences (user_id, type, value)
      values (auth.uid(), 'preferred_workout_length', prefs->>'preferredWorkoutLengthMinutes');
  end if;
  if nullif(prefs->>'planningStyle', '') is not null then
    insert into public.preferences (user_id, type, value)
      values (auth.uid(), 'planning_style', prefs->>'planningStyle');
  end if;
  update public.profiles set onboarding_completed = true where id = auth.uid();
  delete from public.onboarding_progress where user_id = auth.uid();
end;
$$;

create function public.replace_google_calendar_events(
  p_user_id uuid, p_week_start timestamptz, p_week_end timestamptz, p_events jsonb
) returns void
language plpgsql security invoker set search_path = '' as $$
declare item jsonb;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_week_start is null or p_week_end is null or p_week_end <= p_week_start
    or jsonb_typeof(p_events) is distinct from 'array' then
    raise exception 'Invalid calendar payload' using errcode = '22023';
  end if;
  -- Connection exists even when no imported events exist yet.
  perform 1 from public.google_calendar_connections where user_id = auth.uid() for update;
  if not found then
    raise exception 'Calendar connection missing' using errcode = 'P0002';
  end if;
  delete from public.commitments where user_id = auth.uid() and source = 'Google Calendar'
    and start_time >= p_week_start and start_time < p_week_end;
  for item in select value from jsonb_array_elements(p_events) loop
    -- Google timeMin is an end-time bound: ongoing events can start before
    -- the requested week. Preserve that existing import behavior here.
    insert into public.commitments (user_id, title, start_time, end_time, timezone, source, external_event_id)
      values (auth.uid(), item->>'title', (item->>'start_time')::timestamptz,
        (item->>'end_time')::timestamptz, item->>'timezone', 'Google Calendar', item->>'external_event_id');
  end loop;
  update public.google_calendar_connections set last_synced_at = now() where user_id = auth.uid();
end;
$$;

revoke all on function public.replace_weekly_plan(date, uuid, uuid[], jsonb, jsonb) from public, anon;
revoke all on function public.complete_onboarding(jsonb) from public, anon;
revoke all on function public.replace_google_calendar_events(uuid, timestamptz, timestamptz, jsonb) from public, anon;
grant execute on function public.replace_weekly_plan(date, uuid, uuid[], jsonb, jsonb) to authenticated;
grant execute on function public.complete_onboarding(jsonb) to authenticated;
grant execute on function public.replace_google_calendar_events(uuid, timestamptz, timestamptz, jsonb) to authenticated;
