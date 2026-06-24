import type { AppState } from "../types";
import { phases } from "../content";
import { addDays, daysBetween, todayISO } from "../lib/date";

export type PhaseSpan = {
  id: string;
  name: string;
  blurb: string;
  checklist: string[];
  fraction: number;
  start: string;
  end: string;
  current: boolean;
};

/**
 * Map the 4 study phases to real date ranges spanning a study start → exam date,
 * split by each phase's `fraction`. The study window starts today (or earlier if
 * logs predate today) and ends at the exam date.
 */
export function phaseSpans(state: AppState, today: string = todayISO()): PhaseSpan[] {
  const exam = state.profile.examDate;
  const earliestLog = state.log.reduce<string | null>(
    (min, e) => (min == null || e.date < min ? e.date : min),
    null,
  );
  // Anchor the plan to whichever is earlier: today or first logged day.
  const start = earliestLog && earliestLog < today ? earliestLog : today;
  const totalDays = Math.max(1, daysBetween(start, exam));

  let cursor = start;
  const spans: PhaseSpan[] = [];
  phases.forEach((p, i) => {
    const len = Math.max(1, Math.round(totalDays * p.fraction));
    const isLast = i === phases.length - 1;
    const segStart = cursor;
    const segEnd = isLast ? exam : addDays(segStart, len - 1);
    cursor = addDays(segEnd, 1);
    spans.push({
      id: p.id,
      name: p.name,
      blurb: p.blurb,
      checklist: p.checklist,
      fraction: p.fraction,
      start: segStart,
      end: segEnd,
      current: today >= segStart && today <= segEnd,
    });
  });

  // If today is past the last computed end (exam imminent), mark the final phase current.
  if (!spans.some((s) => s.current) && spans.length) {
    if (today > spans[spans.length - 1].end) spans[spans.length - 1].current = true;
    else spans[0].current = true;
  }
  return spans;
}

/** Days remaining to the exam (clamped at 0). */
export function daysToExam(state: AppState, today: string = todayISO()): number {
  return Math.max(0, daysBetween(today, state.profile.examDate));
}
