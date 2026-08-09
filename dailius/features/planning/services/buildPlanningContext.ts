import type {
  EngineInput,
  PlanningContext,
  PlanningContextActivity,
  PlanningContextBlock,
  PlanningTrigger,
  Violation,
  WeeklyPlan,
} from "../types";
import { toISODate } from "./dateUtils";

const DEFAULT_ACTIVITY_DURATION_MINUTES = 30;

// Compact, purpose-built representation of the current planning problem
// (docs/requirements/scheduling refactoring.md §7-8) — deliberately NOT
// the full EngineInput or WeeklyPlan: no historical/completed blocks
// beyond the current week, no unrelated conversations, no database
// internals (row ids beyond what's needed to reference a block/activity/
// goal in a PlanningOperation).
export function buildPlanningContext(
  input: EngineInput,
  plan: WeeklyPlan,
  trigger: PlanningTrigger,
  userMessage: string,
  priorViolations?: Violation[],
): PlanningContext {
  const goalTitlesById = new Map(input.goals.map((goal) => [goal.id, goal.title]));

  const activities: PlanningContextActivity[] = input.activities.map((activity) => ({
    id: activity.id,
    name: activity.name,
    durationMinutes: activity.defaultDurationMinutes ?? DEFAULT_ACTIVITY_DURATION_MINUTES,
    flexible: activity.flexible,
    preferredDays: activity.preferredDays,
    preferredTimeOfDay: activity.preferredTimeOfDay,
    goalTitles: activity.goalIds.map((id) => goalTitlesById.get(id)).filter((title): title is string => Boolean(title)),
  }));

  const scheduledBlocks: PlanningContextBlock[] = plan.blocks.map((block) => ({
    blockId: block.id,
    activityId: block.activityId,
    activityName: block.activityName,
    scheduledDate: block.scheduledDate,
    startTime: block.startTime,
    endTime: block.endTime,
    status: block.status,
  }));

  return {
    today: toISODate(input.today),
    trigger,
    userMessage,
    goals: input.goals.map((goal) => ({ id: goal.id, title: goal.title, priority: goal.priority })),
    activities,
    constraints: input.constraints,
    scheduledBlocks,
    commitments: input.commitments.map((commitment) => ({
      title: commitment.title,
      scheduledDate: commitment.scheduledDate,
      startTime: commitment.startTime,
      endTime: commitment.endTime,
    })),
    ...(priorViolations && priorViolations.length > 0 ? { priorViolations } : {}),
  };
}
