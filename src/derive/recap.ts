import type { AppState, LogEntry } from "../types";
import { addDays, todayISO, weekRange } from "../lib/date";
import { retrievalReading } from "./retrieval";
import { weightedCoverage, conditionsTally } from "./coverage";
import { focusDomains } from "./coverage";

function inRange(iso: string, start: string, end: string) {
  return iso >= start && iso <= end;
}

type WeekSlice = {
  questions: number;
  correct: number;
  acc: number | null;
  lectures: number;
  cards: number;
  reviews: number;
  minutes: number;
  activeDays: number;
};

function sliceWeek(log: LogEntry[], start: string, end: string): WeekSlice {
  let questions = 0,
    correct = 0,
    attempted = 0,
    lectures = 0,
    cards = 0,
    reviews = 0,
    minutes = 0;
  const activeDays = new Set<string>();
  for (const e of log) {
    if (!inRange(e.date, start, end)) continue;
    minutes += e.minutes ?? 0;
    if (e.type === "questions") {
      questions += e.count;
      if (typeof e.correct === "number") {
        correct += e.correct;
        attempted += e.count;
      }
      activeDays.add(e.date);
    } else if (e.type === "review") {
      reviews += e.count;
      activeDays.add(e.date);
    } else if (e.type === "lecture") lectures += e.count;
    else if (e.type === "cards") cards += e.count;
  }
  return {
    questions,
    correct,
    acc: attempted > 0 ? correct / attempted : null,
    lectures,
    cards,
    reviews,
    minutes,
    activeDays: activeDays.size,
  };
}

export type WeeklyRecap = {
  start: string;
  end: string;
  this: WeekSlice;
  last: WeekSlice;
  deltaQuestions: number;
  deltaAccPts: number | null; // percentage points vs last week
  retrievalRatio: number | null;
  activeTarget: number;
  coverage: number; // 0–1
  conditions: { covered: number; total: number };
  errorsLogged: number;
  errorsDue: number;
  nextWeekFocus: string | null;
  stream: string;
  daysToExam: number;
};

/** Screenshot-ready weekly recap with week-over-week deltas. */
export function weeklyRecap(state: AppState, today: string = todayISO()): WeeklyRecap {
  const { start, end } = weekRange(today);
  const prevStart = addDays(start, -7);
  const prevEnd = addDays(end, -7);

  const thisW = sliceWeek(state.log, start, end);
  const lastW = sliceWeek(state.log, prevStart, prevEnd);

  const deltaAccPts =
    thisW.acc != null && lastW.acc != null
      ? Math.round((thisW.acc - lastW.acc) * 100)
      : null;

  const tally = conditionsTally(state);
  const errorsDue = state.errors.filter((e) => !e.resolved && e.reattemptDate <= today).length;
  const errorsLogged = state.errors.filter((e) => inRange(e.date, start, end)).length;
  const focus = focusDomains(state, 1, today)[0];

  return {
    start,
    end,
    this: thisW,
    last: lastW,
    deltaQuestions: thisW.questions - lastW.questions,
    deltaAccPts,
    retrievalRatio: retrievalReading(state, 7, today).ratio,
    activeTarget: state.profile.studyDaysPerWeek,
    coverage: weightedCoverage(state),
    conditions: { covered: tally.covered, total: tally.total },
    errorsLogged,
    errorsDue,
    nextWeekFocus: focus?.name ?? null,
    stream: "Adult Medicine",
    daysToExam: Math.max(0, daysTo(state.profile.examDate, today)),
  };
}

function daysTo(examDate: string, today: string): number {
  const [ey, em, ed] = examDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return Math.round(
    (new Date(ey, em - 1, ed).getTime() - new Date(ty, tm - 1, td).getTime()) / 86_400_000,
  );
}
