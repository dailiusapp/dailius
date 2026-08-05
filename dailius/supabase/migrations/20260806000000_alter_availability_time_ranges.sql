-- Replaces availability's 6 boolean flags with real clock-time ranges, so
-- the planning engine (see 20260806010000_create_planning_schema.sql) can
-- place activities at actual times instead of guessing within a block.
-- A block is "disabled" when both its start and end are null.

alter table public.availability
  add column weekday_morning_start time,
  add column weekday_morning_end time,
  add column weekday_afternoon_start time,
  add column weekday_afternoon_end time,
  add column weekday_evening_start time,
  add column weekday_evening_end time,
  add column weekend_morning_start time,
  add column weekend_morning_end time,
  add column weekend_afternoon_start time,
  add column weekend_afternoon_end time,
  add column weekend_evening_start time,
  add column weekend_evening_end time;

-- Backfill any existing rows from the old booleans using the same default
-- windows the redesigned onboarding UI offers (Morning 06:00-12:00,
-- Afternoon 12:00-17:00, Evening 17:00-21:00, same for weekday/weekend).
update public.availability
set
  weekday_morning_start = case when weekday_morning then time '06:00' else null end,
  weekday_morning_end = case when weekday_morning then time '12:00' else null end,
  weekday_afternoon_start = case when weekday_afternoon then time '12:00' else null end,
  weekday_afternoon_end = case when weekday_afternoon then time '17:00' else null end,
  weekday_evening_start = case when weekday_evening then time '17:00' else null end,
  weekday_evening_end = case when weekday_evening then time '21:00' else null end,
  weekend_morning_start = case when weekend_morning then time '06:00' else null end,
  weekend_morning_end = case when weekend_morning then time '12:00' else null end,
  weekend_afternoon_start = case when weekend_afternoon then time '12:00' else null end,
  weekend_afternoon_end = case when weekend_afternoon then time '17:00' else null end,
  weekend_evening_start = case when weekend_evening then time '17:00' else null end,
  weekend_evening_end = case when weekend_evening then time '21:00' else null end;

alter table public.availability
  add constraint weekday_morning_range check (
    weekday_morning_start is null or weekday_morning_end is null or weekday_morning_end > weekday_morning_start
  ),
  add constraint weekday_afternoon_range check (
    weekday_afternoon_start is null or weekday_afternoon_end is null or weekday_afternoon_end > weekday_afternoon_start
  ),
  add constraint weekday_evening_range check (
    weekday_evening_start is null or weekday_evening_end is null or weekday_evening_end > weekday_evening_start
  ),
  add constraint weekend_morning_range check (
    weekend_morning_start is null or weekend_morning_end is null or weekend_morning_end > weekend_morning_start
  ),
  add constraint weekend_afternoon_range check (
    weekend_afternoon_start is null or weekend_afternoon_end is null or weekend_afternoon_end > weekend_afternoon_start
  ),
  add constraint weekend_evening_range check (
    weekend_evening_start is null or weekend_evening_end is null or weekend_evening_end > weekend_evening_start
  );

alter table public.availability
  drop column weekday_morning,
  drop column weekday_afternoon,
  drop column weekday_evening,
  drop column weekend_morning,
  drop column weekend_afternoon,
  drop column weekend_evening;
