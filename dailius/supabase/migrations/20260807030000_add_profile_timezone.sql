-- IANA timezone (e.g. "America/New_York"), captured automatically from the
-- browser once the user is logged in — see TimezoneSync. Null until then;
-- every "today"/"now" computation falls back to server-local time (UTC)
-- when null, same as before this column existed.
alter table public.profiles add column timezone text;
