-- Widens ai_planning_events' trigger check constraint to include
-- COMMITMENT_MOVE, added alongside PlanningOperation's new MOVE_COMMITMENT
-- variant (see features/planning/services/aiUsage.ts's LoggedTrigger type,
-- which must stay in sync with this constraint).
alter table public.ai_planning_events drop constraint ai_planning_events_trigger_check;
alter table public.ai_planning_events add constraint ai_planning_events_trigger_check
  check (trigger in ('MISSED_ACTIVITY', 'FUTURE_MOVE', 'PRIORITY_CHANGE', 'COMMITMENT_MOVE'));
