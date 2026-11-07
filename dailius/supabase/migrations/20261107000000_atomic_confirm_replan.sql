-- PostgREST executes this function in a single transaction. An exception in
-- ANY step rolls back priorities, placements, commitment moves and removals.
-- Invoker security preserves RLS; also scope every target explicitly so a
-- stale/missing/foreign row cannot silently turn an update into a no-op.
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
    perform 1 from public.activities
      where id = (item->>'activity_id')::uuid and user_id = auth.uid() and enabled;
    if not found then
      raise exception 'Activity is no longer available' using errcode = 'P0002';
    end if;
    insert into public.scheduled_blocks (
      weekly_plan_id, activity_id, scheduled_date, start_time, end_time,
      rationale, locked, original_scheduled_date
    ) values (
      p_plan_id, (item->>'activity_id')::uuid, (item->>'scheduled_date')::date,
      (item->>'start_time')::time, (item->>'end_time')::time,
      item->>'rationale', true, (item->>'original_scheduled_date')::date
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

revoke all on function public.confirm_replan(uuid, jsonb, jsonb, jsonb, uuid[]) from public, anon;
grant execute on function public.confirm_replan(uuid, jsonb, jsonb, jsonb, uuid[]) to authenticated;
