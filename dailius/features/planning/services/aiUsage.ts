"use server";

import { createClient } from "@/lib/supabase/server";

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 20);
const MONTHLY_LIMIT = Number(process.env.AI_MONTHLY_LIMIT ?? 200);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

// Real, server-side usage limiting (docs/requirements/scheduling
// refactoring.md §19: "never rely exclusively on the client") — simple by
// design: env-configurable flat daily/monthly caps per user, no tiers, no
// admin UI. Checked before any AI call is made, not after.
export async function checkUsageLimit(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const now = Date.now();

  const [dailyRes, monthlyRes] = await Promise.all([
    supabase
      .from("ai_planning_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(now - ONE_DAY_MS).toISOString()),
    supabase
      .from("ai_planning_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(now - THIRTY_DAYS_MS).toISOString()),
  ]);

  if (dailyRes.error || monthlyRes.error) {
    // Fail open on a logging-infra error — an outage in the usage table
    // shouldn't block a user's actual planning request. The DB write in
    // logPlanningEvent below fails the same way (logged, non-fatal).
    console.error("Failed to check AI usage limit:", dailyRes.error ?? monthlyRes.error);
    return { ok: true };
  }

  if ((dailyRes.count ?? 0) >= DAILY_LIMIT) {
    return { ok: false, message: "You've reached your planning request limit for today — try again tomorrow." };
  }
  if ((monthlyRes.count ?? 0) >= MONTHLY_LIMIT) {
    return { ok: false, message: "You've reached your planning request limit for this month." };
  }
  return { ok: true };
}

export type PlanningEventResult = "VALID" | "INVALID" | "MALFORMED" | "ERROR" | "LIMIT_EXCEEDED";

// Matches ai_planning_events' trigger CHECK constraint exactly — narrower
// than PlanningTrigger["type"], which also has "UNKNOWN" (never logged,
// since sendChatMessage.ts returns before calling proposeReplan for it).
export type LoggedTrigger = "MISSED_ACTIVITY" | "FUTURE_MOVE" | "PRIORITY_CHANGE" | "COMMITMENT_MOVE";

export async function logPlanningEvent(event: {
  userId: string;
  requestId: string;
  trigger: LoggedTrigger;
  attemptNumber: number;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  result: PlanningEventResult;
  latencyMs: number;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_planning_events").insert({
    user_id: event.userId,
    request_id: event.requestId,
    trigger: event.trigger,
    attempt_number: event.attemptNumber,
    model: event.model,
    input_tokens: event.inputTokens,
    output_tokens: event.outputTokens,
    result: event.result,
    latency_ms: event.latencyMs,
  });
  if (error) {
    // Non-fatal: same tolerance-for-partial-failure pattern already used
    // for the goal-linking insert in createActivity.ts — a logging write
    // failing must never block or corrupt the actual planning result.
    console.error("Failed to log AI planning event:", error);
  }
}
