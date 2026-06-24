import type { AppState } from "../types";
import { inWeekOf, todayISO } from "../lib/date";

/** Total and this-week study minutes, rolled from logged `minutes`. */
export function studyMinutes(state: AppState, today: string = todayISO()) {
  let total = 0;
  let thisWeek = 0;
  for (const e of state.log) {
    const m = e.minutes ?? 0;
    total += m;
    if (inWeekOf(e.date, today)) thisWeek += m;
  }
  return { total, thisWeek };
}

/** Daily goal progress for questions today. */
export function questionsToday(state: AppState, today: string = todayISO()) {
  const done = state.log
    .filter((e) => e.type === "questions" && e.date === today)
    .reduce((s, e) => s + e.count, 0);
  const target = state.profile.dailyQuestionTarget;
  return { done, target, met: done >= target };
}
