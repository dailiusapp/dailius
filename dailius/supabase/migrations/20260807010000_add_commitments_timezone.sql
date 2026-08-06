-- Bug fix: commitments were being converted to a display date/time using
-- the server's local timezone (UTC in production/dev), not the timezone
-- the event was actually created in. A 5pm Pacific event landed as
-- midnight the next day. Google Calendar returns each event's own
-- `start.timeZone` (falls back to the calendar's default), which is the
-- most correct signal available without building any timezone-capture UI
-- of our own — store it per commitment and use it for every
-- instant-to-calendar-day/time conversion from here on.

alter table public.commitments add column timezone text not null default 'UTC';
