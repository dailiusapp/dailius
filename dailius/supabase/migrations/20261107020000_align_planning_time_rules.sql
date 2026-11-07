-- Persist an activity's explicit choice for repeated local times, and exact
-- elapsed-time endpoints for generated blocks. Existing rows remain readable.
alter table public.activities add column time_occurrence text
  check (time_occurrence in ('earlier', 'later'));
alter table public.scheduled_blocks
  add column time_occurrence text check (time_occurrence in ('earlier', 'later')),
  add column start_instant timestamptz,
  add column end_instant timestamptz;
alter table public.scheduled_blocks drop constraint scheduled_blocks_check;
alter table public.scheduled_blocks add constraint scheduled_blocks_elapsed_time_check check (
  (start_instant is null and end_instant is null and end_time > start_time)
  or (start_instant is not null and end_instant is not null and end_instant > start_instant)
);

create or replace function public.confirm_replan(
  p_plan_id uuid,
  p_priority_changes jsonb,
  p_new_blocks jsonb,
  p_commitment_moves jsonb,
  p_removed_block_ids uuid[]
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  removed_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Serialize confirmations for this plan, and reject an archived/deleted plan.
  perform 1 from public.weekly_plans
    where id = p_plan_id and user_id = auth.uid() and status = 'active'
    for update;
  if not found then
    raise exception 'Plan is no longer active' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_priority_changes) is distinct from 'array'
    or jsonb_typeof(p_new_blocks) is distinct from 'array'
    or jsonb_typeof(p_commitment_moves) is distinct from 'array'
    or p_removed_block_ids is null then
    raise exception 'Invalid replan payload' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_priority_changes) loop
    update public.goals set priority = item->>'priority'
      where id = (item->>'goal_id')::uuid and user_id = auth.uid() and status = 'active';
    if not found then
      raise exception 'Goal is no longer available' using errcode = 'P0002';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_new_blocks) loop
    if item->>'time_occurrence' is not null then
      update public.activities set time_occurrence = item->>'time_occurrence'
        where id = (item->>'activity_id')::uuid and user_id = auth.uid();
    end if;
    perform 1 from public.activities
      where id = (item->>'activity_id')::uuid and user_id = auth.uid() and enabled;
    if not found then
      raise exception 'Activity is no longer available' using errcode = 'P0002';
    end if;
    insert into public.scheduled_blocks (
      weekly_plan_id, activity_id, scheduled_date, start_time, end_time,
      rationale, locked, original_scheduled_date, time_occurrence, start_instant, end_instant
    ) values (
      p_plan_id, (item->>'activity_id')::uuid, (item->>'scheduled_date')::date,
      (item->>'start_time')::time, (item->>'end_time')::time,
      item->>'rationale', true, (item->>'original_scheduled_date')::date,
      item->>'time_occurrence', (item->>'start_instant')::timestamptz, (item->>'end_instant')::timestamptz
    );
  end loop;

  for item in select value from jsonb_array_elements(p_commitment_moves) loop
    update public.commitments
      set start_time = (item->>'start_time')::timestamptz,
          end_time = (item->>'end_time')::timestamptz
      where id = (item->>'id')::uuid and user_id = auth.uid() and source = 'Manual';
    if not found then
      raise exception 'Commitment is no longer movable' using errcode = 'P0002';
    end if;
  end loop;

  foreach removed_id in array p_removed_block_ids loop
    delete from public.scheduled_blocks
      where id = removed_id and weekly_plan_id = p_plan_id and status = 'scheduled';
    if not found then
      raise exception 'Block is no longer scheduled' using errcode = 'P0002';
    end if;
  end loop;
end;
$$;

create or replace function public.replace_weekly_plan(
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
    if item->>'time_occurrence' is not null then
      update public.activities set time_occurrence = item->>'time_occurrence'
        where id = (item->>'activity_id')::uuid and user_id = auth.uid();
    end if;
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
      (weekly_plan_id, activity_id, scheduled_date, start_time, end_time, rationale, time_occurrence, start_instant, end_instant)
      values (new_id, (item->>'activity_id')::uuid, (item->>'scheduled_date')::date,
        (item->>'start_time')::time, (item->>'end_time')::time, item->>'rationale',
        item->>'time_occurrence', (item->>'start_instant')::timestamptz, (item->>'end_instant')::timestamptz);
  end loop;
  return new_id;
end;
$$;


create or replace function public.replace_google_calendar_events(
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
    and start_time < p_week_end and end_time > p_week_start;
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
