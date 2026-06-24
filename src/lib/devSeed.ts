// Dev-only sample data. Loaded lazily and ONLY when the app is run with `?seed=1`
// in development — never bundled into a user's normal session. Handy for previews.
import { useStore } from "../state/store";
import { freshState } from "../state/defaults";
import { specialties } from "../content";
import { addDays, todayISO } from "../lib/date";
import type { AppState, LogEntry, ErrorEntry, Status } from "../types";

function mkLog(p: Partial<LogEntry>, i: number): LogEntry {
  return { id: `seed-l${i}`, date: todayISO(), type: "questions", count: 20, ...p };
}

export function seed(): void {
  const s: AppState = freshState();
  const T = todayISO();
  const log: LogEntry[] = [];
  let n = 0;

  // ~12 days of mixed activity, retrieval-leaning but with an input-heavy stretch.
  const days = [
    { d: 0, q: 18, c: 12, rev: 30, lec: 0, cards: 0, min: 70, sp: "cardio" },
    { d: 1, q: 22, c: 15, rev: 20, lec: 1, cards: 0, min: 95, sp: "resp" },
    { d: 2, q: 0, c: 0, rev: 0, lec: 2, cards: 25, min: 120, sp: "neuro" },
    { d: 3, q: 12, c: 6, rev: 0, lec: 1, cards: 18, min: 80, sp: "neuro" },
    { d: 4, q: 25, c: 18, rev: 40, lec: 0, cards: 0, min: 100, sp: "endo" },
    { d: 5, q: 20, c: 13, rev: 0, lec: 1, cards: 0, min: 75, sp: "gastro" },
    { d: 6, q: 0, c: 0, rev: 0, lec: 0, cards: 0, min: 0, sp: undefined },
    { d: 7, q: 24, c: 17, rev: 25, lec: 0, cards: 0, min: 90, sp: "haem" },
    { d: 8, q: 16, c: 8, rev: 0, lec: 2, cards: 22, min: 110, sp: "id" },
    { d: 9, q: 21, c: 14, rev: 30, lec: 0, cards: 0, min: 85, sp: "cardio" },
    { d: 10, q: 19, c: 11, rev: 15, lec: 1, cards: 0, min: 80, sp: "rheum" },
    { d: 11, q: 23, c: 16, rev: 35, lec: 0, cards: 0, min: 95, sp: "endo" },
  ];

  for (const day of days) {
    const date = addDays(T, -day.d);
    if (day.q) log.push(mkLog({ date, type: "questions", count: day.q, correct: day.c, minutes: day.min, specialtyId: day.sp }, n++));
    if (day.rev) log.push(mkLog({ date, type: "review", count: day.rev, minutes: 15 }, n++));
    if (day.lec) log.push(mkLog({ date, type: "lecture", count: day.lec, minutes: 45, specialtyId: day.sp }, n++));
    if (day.cards) log.push(mkLog({ date, type: "cards", count: day.cards, minutes: 20, specialtyId: day.sp }, n++));
  }
  s.log = log;

  // Syllabus: solid on strong domains, learning on mid, untouched on the rest.
  const statusPlan: Record<string, [number, Status]> = {
    cardio: [0.85, "solid"],
    resp: [0.7, "solid"],
    endo: [0.65, "learning"],
    gastro: [0.5, "learning"],
    haem: [0.45, "learning"],
    neuro: [0.3, "learning"],
    gen: [0.4, "learning"],
  };
  for (const sp of specialties) {
    const plan = statusPlan[sp.id];
    if (!plan) continue;
    const [frac, st] = plan;
    const upTo = Math.round(sp.conditions.length * frac);
    for (let i = 0; i < upTo; i++) s.syllabus[`${sp.id}:${i}`] = i < upTo - 2 ? st : "learning";
  }

  // Errors: a couple due, one resolved, one missed-again.
  const errs: ErrorEntry[] = [
    { id: "seed-e1", date: addDays(T, -14), specialtyId: "cardio", errorType: "knowledge", takeaway: "ARNI contraindicated within 36h of an ACE inhibitor.", correctAnswer: "Sacubitril/valsartan", reattemptDate: addDays(T, -2), resolved: false, missedAgain: false },
    { id: "seed-e2", date: addDays(T, -12), specialtyId: "neuro", errorType: "misread", takeaway: "Stem said 'worst at night' — read it as morning.", reattemptDate: addDays(T, -1), resolved: false, missedAgain: true },
    { id: "seed-e3", date: addDays(T, -20), specialtyId: "endo", errorType: "distractor", takeaway: "Picked TSH first; free T4 was the discriminator here.", reattemptDate: addDays(T, -3), resolved: true, missedAgain: false },
    { id: "seed-e4", date: addDays(T, -2), specialtyId: "id", errorType: "reasoning", takeaway: "Knew the bug, wrong empirical cover for the source.", reattemptDate: addDays(T, 8), resolved: false, missedAgain: false },
  ];
  s.errors = errs;

  s.dailyChecks[addDays(T, -1)] = { ankiCleared: true };
  s.dailyChecks[addDays(T, -4)] = { ankiCleared: true };

  useStore.getState().replaceState(s);
  // eslint-disable-next-line no-console
  console.info("[vitals] seeded demo data");
}
