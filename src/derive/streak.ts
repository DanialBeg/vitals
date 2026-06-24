import type { AppState } from "../types";
import { addDays, inWeekOf, todayISO } from "../lib/date";

/** A day "counts" for the streak only if it has questions OR reviews logged. */
function isActiveDay(state: AppState, iso: string): boolean {
  return state.log.some(
    (e) => e.date === iso && (e.type === "questions" || e.type === "review") && e.count > 0,
  );
}

/**
 * Streak: consecutive active days walking back from today. Grace: if today has
 * no qualifying activity yet, we count back from yesterday so it doesn't "break"
 * mid-day. Passive activity (lectures, card-making) does NOT keep it alive.
 */
export function currentStreak(state: AppState, today: string = todayISO()): number {
  let cursor = isActiveDay(state, today) ? today : addDays(today, -1);
  let streak = 0;
  // hard cap to avoid pathological loops
  for (let i = 0; i < 3650; i++) {
    if (isActiveDay(state, cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

/** Distinct active days in the current Mon–Sun week, against the weekly target. */
export function activeDaysThisWeek(
  state: AppState,
  today: string = todayISO(),
): { count: number; target: number } {
  const days = new Set<string>();
  for (const e of state.log) {
    if ((e.type === "questions" || e.type === "review") && e.count > 0 && inWeekOf(e.date, today)) {
      days.add(e.date);
    }
  }
  return { count: days.size, target: state.profile.studyDaysPerWeek };
}
