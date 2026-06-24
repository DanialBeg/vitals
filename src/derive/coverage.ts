import type { AppState, Status } from "../types";
import { specialties, totalItems, totalConditions, syllabusKey } from "../content";
import { daysBetween, todayISO } from "../lib/date";

const STATUS_SCORE: Record<Status, number> = { none: 0, learning: 0.5, solid: 1 };

/** Mean condition score for one specialty (0–1). */
export function specialtyConfidence(state: AppState, specialtyId: string): number {
  const sp = specialties.find((s) => s.id === specialtyId);
  if (!sp) return 0;
  let sum = 0;
  for (let i = 0; i < sp.conditions.length; i++) {
    sum += STATUS_SCORE[state.syllabus[syllabusKey(specialtyId, i)] ?? "none"];
  }
  return sp.conditions.length ? sum / sp.conditions.length : 0;
}

/** Confidence-weighted blueprint coverage (weighted by `items`), 0–1. */
export function weightedCoverage(state: AppState): number {
  let sum = 0;
  for (const sp of specialties) sum += sp.items * specialtyConfidence(state, sp.id);
  return totalItems ? sum / totalItems : 0;
}

/** Raw conditions-covered tally (touched = learning|solid), plus solid count. */
export function conditionsTally(state: AppState): {
  covered: number;
  solid: number;
  total: number;
} {
  let covered = 0;
  let solid = 0;
  for (const sp of specialties) {
    for (let i = 0; i < sp.conditions.length; i++) {
      const st = state.syllabus[syllabusKey(sp.id, i)] ?? "none";
      if (st !== "none") covered++;
      if (st === "solid") solid++;
    }
  }
  return { covered, solid, total: totalConditions };
}

/** Most recent date any activity was logged against a specialty, or null. */
function lastTouched(state: AppState, specialtyId: string): string | null {
  let latest: string | null = null;
  for (const e of state.log) {
    if (e.specialtyId === specialtyId && (latest == null || e.date > latest)) latest = e.date;
  }
  return latest;
}

function domainAccuracy(state: AppState, specialtyId: string): number | null {
  let attempted = 0;
  let correct = 0;
  for (const e of state.log) {
    if (e.specialtyId === specialtyId && e.type === "questions" && typeof e.correct === "number") {
      attempted += e.count;
      correct += e.correct;
    }
  }
  return attempted > 0 ? correct / attempted : null;
}

export type FocusDomain = {
  specialtyId: string;
  name: string;
  items: number;
  coverage: number; // 0–1 confidence
  accuracy: number | null;
  reason: string;
  need: number;
};

const STALE_DAYS = 14;

/**
 * Focus domains: weakest high-yield specialties. need = items × blended deficit,
 * with a boost for stale (un-revisited) topics. Returns the top `n`.
 */
export function focusDomains(
  state: AppState,
  n = 3,
  today: string = todayISO(),
): FocusDomain[] {
  const scored = specialties.map((sp) => {
    const coverage = specialtyConfidence(state, sp.id);
    const acc = domainAccuracy(state, sp.id);
    const accFrac = acc ?? 0.5; // unknown accuracy treated as middling
    const last = lastTouched(state, sp.id);
    const stale = last != null && daysBetween(last, today) > STALE_DAYS;
    const deficit = 0.5 * (1 - coverage) + 0.5 * (1 - accFrac);
    const need = sp.items * deficit * (stale ? 1.2 : 1);

    let reason: string;
    if (acc != null && acc < 0.5) reason = `${Math.round(acc * 100)}% in questions — needs work`;
    else if (coverage < 0.34) reason = "Low coverage on a high-yield domain";
    else if (stale) reason = "Not revisited recently";
    else reason = "High weight, room to push";

    return { specialtyId: sp.id, name: sp.name, items: sp.items, coverage, accuracy: acc, reason, need };
  });

  return scored.sort((a, b) => b.need - a.need).slice(0, n);
}
