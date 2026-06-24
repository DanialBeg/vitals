import type { AppState, ErrorEntry } from "../types";
import { todayISO } from "../lib/date";

export type ErrorFilter = "open" | "due" | "resolved";

/** Errors due for re-attempt: not resolved and reattemptDate ≤ today. */
export function dueErrors(state: AppState, today: string = todayISO()): ErrorEntry[] {
  return state.errors
    .filter((e) => !e.resolved && e.reattemptDate <= today)
    .sort((a, b) => (a.reattemptDate < b.reattemptDate ? -1 : 1));
}

export function filterErrors(
  state: AppState,
  filter: ErrorFilter,
  today: string = todayISO(),
): ErrorEntry[] {
  const byDateDesc = (a: ErrorEntry, b: ErrorEntry) => (a.date < b.date ? 1 : -1);
  switch (filter) {
    case "open":
      return state.errors.filter((e) => !e.resolved).sort(byDateDesc);
    case "due":
      return dueErrors(state, today);
    case "resolved":
      return state.errors.filter((e) => e.resolved).sort(byDateDesc);
  }
}

/** Counts for the filter chips. */
export function errorCounts(state: AppState, today: string = todayISO()) {
  return {
    open: state.errors.filter((e) => !e.resolved).length,
    due: dueErrors(state, today).length,
    resolved: state.errors.filter((e) => e.resolved).length,
    total: state.errors.length,
  };
}

/** Error-type mix so technique problems vs content gaps are visible. */
export function errorTypeMix(
  state: AppState,
): { type: ErrorEntry["errorType"]; count: number }[] {
  const counts = new Map<ErrorEntry["errorType"], number>();
  for (const e of state.errors) counts.set(e.errorType, (counts.get(e.errorType) ?? 0) + 1);
  return [...counts.entries()].map(([type, count]) => ({ type, count }));
}
