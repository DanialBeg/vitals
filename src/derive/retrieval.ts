import type { AppState, LogEntry, LogType } from "../types";
import { lastNDays, todayISO, withinLastDays } from "../lib/date";

export const ACTIVE_TYPES: LogType[] = ["questions", "review"];
export const PASSIVE_TYPES: LogType[] = ["lecture", "cards"];
export const TARGET_RATIO = 0.6; // the 60% target band

// Imputed effort when an entry has no explicit `minutes`, so the ratio stays
// meaningful for quick-logs. Chosen to reflect rough real effort per unit.
const IMPUTE: Record<LogType, number> = {
  questions: 1.5, // per question
  review: 0.5, // per card reviewed
  cards: 2, // per card made
  lecture: 45, // per lecture
};

/** Effort in minutes for an entry: explicit `minutes`, else a per-type estimate. */
export function effortMinutes(e: LogEntry): number {
  if (typeof e.minutes === "number" && e.minutes > 0) return e.minutes;
  return Math.max(0, e.count) * (IMPUTE[e.type] ?? 1);
}

export type RetrievalReading = {
  ratio: number | null; // 0–1, share of effort that was active retrieval
  activeMin: number;
  passiveMin: number;
  inBand: boolean;
  trace: number[]; // per-day ratio for the window (null days -> NaN-safe 0-baseline)
};

function ratioForEntries(entries: LogEntry[]): {
  ratio: number | null;
  activeMin: number;
  passiveMin: number;
} {
  let activeMin = 0;
  let passiveMin = 0;
  for (const e of entries) {
    const m = effortMinutes(e);
    if (ACTIVE_TYPES.includes(e.type)) activeMin += m;
    else if (PASSIVE_TYPES.includes(e.type)) passiveMin += m;
  }
  const total = activeMin + passiveMin;
  return { ratio: total > 0 ? activeMin / total : null, activeMin, passiveMin };
}

/** Retrieval ratio over the last `windowDays` (default 7), plus a per-day trace. */
export function retrievalReading(
  state: AppState,
  windowDays = 7,
  today: string = todayISO(),
): RetrievalReading {
  const recent = state.log.filter((e) => withinLastDays(e.date, windowDays, today));
  const { ratio, activeMin, passiveMin } = ratioForEntries(recent);

  const days = lastNDays(windowDays, today);
  const trace = days.map((d) => {
    const r = ratioForEntries(state.log.filter((e) => e.date === d)).ratio;
    return r == null ? 0 : r;
  });

  return {
    ratio,
    activeMin,
    passiveMin,
    inBand: ratio != null && ratio >= TARGET_RATIO,
    trace,
  };
}
