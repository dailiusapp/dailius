import { getWeekStart, toISODate, todayInTimezone } from "./dateUtils";
import { getPlanForWeek } from "./getPlanForWeek";
import { getUserTimezone } from "@/features/auth/services/getUserTimezone";
import type { WeeklyPlan } from "../types";

export async function getCurrentPlan(userId: string): Promise<WeeklyPlan | null> {
  const timezone = await getUserTimezone(userId);
  return getPlanForWeek(userId, toISODate(getWeekStart(todayInTimezone(timezone))));
}
