import { getWeekStart, toISODate } from "./dateUtils";
import { getPlanForWeek } from "./getPlanForWeek";
import type { WeeklyPlan } from "../types";

export async function getCurrentPlan(userId: string): Promise<WeeklyPlan | null> {
  return getPlanForWeek(userId, toISODate(getWeekStart(new Date())));
}
