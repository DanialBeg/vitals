import type { AppState, LogEntry } from "../types";
import { specialties, getSpecialty } from "../content";
import { lastNDays, todayISO } from "../lib/date";

export type SpecialtySummary = {
  id: string;
  name: string;
  items: number;
  questions: number;
  acc: number | null;
  lectures: number;
  cards: number;
  reviews: number;
  minutes: number;
  entries: number; // total tagged log entries
};

function summarise(entries: LogEntry[]): Omit<SpecialtySummary, "id" | "name" | "items"> {
  let questions = 0,
    correct = 0,
    attempted = 0,
    lectures = 0,
    cards = 0,
    reviews = 0,
    minutes = 0;
  for (const e of entries) {
    minutes += e.minutes ?? 0;
    if (e.type === "questions") {
      questions += e.count;
      if (typeof e.correct === "number") {
        correct += e.correct;
        attempted += e.count;
      }
    } else if (e.type === "lecture") lectures += e.count;
    else if (e.type === "cards") cards += e.count;
    else if (e.type === "review") reviews += e.count;
  }
  return {
    questions,
    acc: attempted > 0 ? correct / attempted : null,
    lectures,
    cards,
    reviews,
    minutes,
    entries: entries.length,
  };
}

/** Every specialty that has at least one tagged log entry, busiest first. */
export function loggedSpecialties(state: AppState): SpecialtySummary[] {
  return specialties
    .map((sp) => {
      const entries = state.log.filter((e) => e.specialtyId === sp.id);
      return { id: sp.id, name: sp.name, items: sp.items, ...summarise(entries) };
    })
    .filter((s) => s.entries > 0)
    .sort((a, b) => b.questions - a.questions || b.minutes - a.minutes);
}

export type SpecialtyRecord = SpecialtySummary & {
  attempted: number;
  correct: number;
  sessions: LogEntry[]; // newest first
  trend: { date: string; acc: number | null; attempted: number }[];
};

/** Full activity record for one specialty. */
export function specialtyRecord(
  state: AppState,
  specialtyId: string,
  windowDays = 30,
  today: string = todayISO(),
): SpecialtyRecord {
  const sp = getSpecialty(specialtyId);
  const entries = state.log.filter((e) => e.specialtyId === specialtyId);
  const base = summarise(entries);

  let correct = 0,
    attempted = 0;
  for (const e of entries) {
    if (e.type === "questions" && typeof e.correct === "number") {
      correct += e.correct;
      attempted += e.count;
    }
  }

  const sessions = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const trend = lastNDays(windowDays, today).map((d) => {
    let c = 0,
      a = 0;
    for (const e of entries) {
      if (e.date === d && e.type === "questions" && typeof e.correct === "number") {
        c += e.correct;
        a += e.count;
      }
    }
    return { date: d, acc: a > 0 ? c / a : null, attempted: a };
  });

  return {
    id: specialtyId,
    name: sp?.name ?? "General",
    items: sp?.items ?? 0,
    ...base,
    correct,
    attempted,
    sessions,
    trend,
  };
}
