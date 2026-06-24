import type { AppState, LogEntry } from "../types";
import { lastNDays, todayISO, withinLastDays } from "../lib/date";
import { specialties } from "../content";

const isScored = (e: LogEntry) =>
  e.type === "questions" && typeof e.correct === "number" && e.count > 0;

function accOf(entries: LogEntry[]): { attempted: number; correct: number; acc: number | null } {
  let attempted = 0;
  let correct = 0;
  for (const e of entries) {
    if (!isScored(e)) continue;
    attempted += e.count;
    correct += e.correct ?? 0;
  }
  return { attempted, correct, acc: attempted > 0 ? correct / attempted : null };
}

/** Rolling accuracy over the last `windowDays`. */
export function rollingAccuracy(
  state: AppState,
  windowDays = 7,
  today: string = todayISO(),
) {
  return accOf(state.log.filter((e) => withinLastDays(e.date, windowDays, today)));
}

/** Overall accuracy across all logged questions. */
export function overallAccuracy(state: AppState) {
  return accOf(state.log);
}

/** Total questions attempted (all time). */
export function totalQuestions(state: AppState): number {
  return state.log.reduce((s, e) => (e.type === "questions" ? s + e.count : s), 0);
}

/** Per-day accuracy points across a window (for the trend chart). */
export function accuracyTrend(
  state: AppState,
  windowDays = 30,
  today: string = todayISO(),
): { date: string; acc: number | null; attempted: number }[] {
  return lastNDays(windowDays, today).map((d) => {
    const { acc, attempted } = accOf(state.log.filter((e) => e.date === d));
    return { date: d, acc, attempted };
  });
}

export type DomainAccuracy = {
  specialtyId: string;
  name: string;
  attempted: number;
  correct: number;
  acc: number | null;
  provisional: boolean; // too few questions to trust
};

/** Accuracy grouped by specialty so weak areas self-surface. */
export function accuracyByDomain(state: AppState): DomainAccuracy[] {
  return specialties
    .map((sp) => {
      const { attempted, correct, acc } = accOf(
        state.log.filter((e) => e.specialtyId === sp.id),
      );
      return {
        specialtyId: sp.id,
        name: sp.name,
        attempted,
        correct,
        acc,
        provisional: attempted > 0 && attempted < 10,
      };
    })
    .filter((d) => d.attempted > 0)
    .sort((a, b) => (a.acc ?? 1) - (b.acc ?? 1));
}
