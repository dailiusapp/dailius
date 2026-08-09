import type { EngineInput, PlanningLoopResult, PlanningTrigger, Violation, WeeklyPlan } from "../types";
import { AI_PLANNER_MODEL, MAX_PLANNING_ATTEMPTS } from "../constants";
import { buildPlanningContext } from "./buildPlanningContext";
import { callAIPlanner } from "./aiPlanner";
import { applyPlanningOperations } from "./applyPlanningOperations";
import { validateSchedule } from "./planningValidator";
import { logPlanningEvent, type LoggedTrigger } from "./aiUsage";

// Bounded AI ↔ deterministic-validator retry loop (docs/requirements/
// scheduling refactoring.md §9/§17/§18) — never touches the database.
// Reuses buildPlanningContext (compact, purpose-built) → callAIPlanner
// (proposes operations) → applyPlanningOperations (ops → hypothetical
// blocks, using engine.ts's own placement) → validateSchedule (hard
// constraints). An invalid attempt's violations are fed back into the next
// aiPlanner call, not a full context resend (§17).
export async function runPlanningLoop(
  userId: string,
  trigger: PlanningTrigger,
  loggedTrigger: LoggedTrigger,
  userMessage: string,
  input: EngineInput,
  plan: WeeklyPlan,
): Promise<PlanningLoopResult> {
  const requestId = crypto.randomUUID();
  let priorViolations: Violation[] | undefined;
  let lastViolations: Violation[] = [];

  for (let attempt = 1; attempt <= MAX_PLANNING_ATTEMPTS; attempt++) {
    const startedAt = Date.now();
    const context = buildPlanningContext(input, plan, trigger, userMessage, priorViolations);
    const planned = await callAIPlanner(context);

    if (!planned.ok) {
      await logPlanningEvent({
        userId,
        requestId,
        trigger: loggedTrigger,
        attemptNumber: attempt,
        model: AI_PLANNER_MODEL,
        inputTokens: null,
        outputTokens: null,
        result: "MALFORMED",
        latencyMs: Date.now() - startedAt,
      });
      lastViolations = [];
      continue;
    }

    const applied = applyPlanningOperations(planned.output.operations, plan.blocks, input);

    if (!applied.ok) {
      await logPlanningEvent({
        userId,
        requestId,
        trigger: loggedTrigger,
        attemptNumber: attempt,
        model: AI_PLANNER_MODEL,
        inputTokens: planned.inputTokens,
        outputTokens: planned.outputTokens,
        result: "INVALID",
        latencyMs: Date.now() - startedAt,
      });
      lastViolations = [{ type: "AVAILABILITY", activityName: "", detail: applied.reason }];
      priorViolations = lastViolations;
      continue;
    }

    const validation = validateSchedule(applied.resultingBlocks, input);

    if (validation.valid) {
      await logPlanningEvent({
        userId,
        requestId,
        trigger: loggedTrigger,
        attemptNumber: attempt,
        model: AI_PLANNER_MODEL,
        inputTokens: planned.inputTokens,
        outputTokens: planned.outputTokens,
        result: "VALID",
        latencyMs: Date.now() - startedAt,
      });
      return {
        ok: true,
        summary: planned.output.summary,
        operations: planned.output.operations,
        previewBlocks: applied.resultingBlocks,
        attempts: attempt,
      };
    }

    await logPlanningEvent({
      userId,
      requestId,
      trigger: loggedTrigger,
      attemptNumber: attempt,
      model: AI_PLANNER_MODEL,
      inputTokens: planned.inputTokens,
      outputTokens: planned.outputTokens,
      result: "INVALID",
      latencyMs: Date.now() - startedAt,
    });
    lastViolations = validation.violations;
    priorViolations = validation.violations;
  }

  return {
    ok: false,
    reason: "Couldn't find a valid way to reorganize your week after several attempts.",
    attempts: MAX_PLANNING_ATTEMPTS,
    lastViolations,
  };
}
