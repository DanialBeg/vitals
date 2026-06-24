import { describe, it, expect } from "vitest";
import type { AppState, LogEntry } from "../types";
import { freshState } from "../state/defaults";
import { addDays } from "../lib/date";
import { retrievalReading, TARGET_RATIO } from "./retrieval";
import { currentStreak, activeDaysThisWeek } from "./streak";
import { rollingAccuracy, accuracyByDomain } from "./accuracy";
import { weightedCoverage, conditionsTally, focusDomains } from "./coverage";
import { ankiState } from "./anki";
import { questionsToday } from "./hours";
import { specialties } from "../content";

const TODAY = "2026-06-23"; // a Tuesday

function withLog(entries: Partial<LogEntry>[]): AppState {
  const s = freshState(new Date("2026-06-23T08:00:00"));
  s.log = entries.map((e, i) => ({
    id: `e${i}`,
    date: TODAY,
    type: "questions",
    count: 1,
    ...e,
  })) as LogEntry[];
  return s;
}

describe("retrieval ratio", () => {
  it("is null with no effort", () => {
    expect(retrievalReading(freshState(), 7, TODAY).ratio).toBeNull();
  });

  it("uses minutes when present: 60 active / 40 passive = 0.6", () => {
    const s = withLog([
      { type: "questions", count: 40, minutes: 60 },
      { type: "lecture", count: 1, minutes: 40 },
    ]);
    const r = retrievalReading(s, 7, TODAY);
    expect(r.ratio).toBeCloseTo(0.6, 5);
    expect(r.inBand).toBe(true);
  });

  it("flags below-band when passive dominates", () => {
    const s = withLog([
      { type: "questions", count: 10, minutes: 20 },
      { type: "cards", count: 30, minutes: 80 },
    ]);
    const r = retrievalReading(s, 7, TODAY);
    expect(r.ratio).toBeLessThan(TARGET_RATIO);
    expect(r.inBand).toBe(false);
  });

  it("imputes effort when minutes are missing", () => {
    const s = withLog([{ type: "questions", count: 20 }]); // 20*1.5 = 30 active, 0 passive
    expect(retrievalReading(s, 7, TODAY).ratio).toBe(1);
  });
});

describe("streak", () => {
  it("counts consecutive active days back from today", () => {
    const s = withLog([
      { date: TODAY, type: "questions", count: 5 },
      { date: addDays(TODAY, -1), type: "review", count: 5 },
      { date: addDays(TODAY, -2), type: "questions", count: 5 },
    ]);
    expect(currentStreak(s, TODAY)).toBe(3);
  });

  it("grace: today empty doesn't break a prior streak", () => {
    const s = withLog([
      { date: addDays(TODAY, -1), type: "questions", count: 5 },
      { date: addDays(TODAY, -2), type: "questions", count: 5 },
    ]);
    expect(currentStreak(s, TODAY)).toBe(2);
  });

  it("passive activity does not keep the streak alive", () => {
    const s = withLog([{ date: TODAY, type: "lecture", count: 1 }]);
    expect(currentStreak(s, TODAY)).toBe(0);
  });

  it("counts active days this week", () => {
    const s = withLog([
      { date: TODAY, type: "questions", count: 5 },
      { date: addDays(TODAY, -1), type: "questions", count: 5 },
    ]);
    expect(activeDaysThisWeek(s, TODAY).count).toBe(2);
  });
});

describe("accuracy", () => {
  it("rolling accuracy = correct / attempted", () => {
    const s = withLog([
      { type: "questions", count: 10, correct: 6 },
      { type: "questions", count: 10, correct: 8 },
    ]);
    expect(rollingAccuracy(s, 7, TODAY).acc).toBeCloseTo(0.7, 5);
  });

  it("by-domain sorts weakest first", () => {
    const s = withLog([
      { type: "questions", count: 10, correct: 9, specialtyId: "cardio" },
      { type: "questions", count: 10, correct: 3, specialtyId: "neuro" },
    ]);
    const d = accuracyByDomain(s);
    expect(d[0].specialtyId).toBe("neuro");
  });
});

describe("coverage", () => {
  it("weighted coverage: all solid -> 1", () => {
    const s = freshState();
    // build syllabus map fully solid
    for (const sp of specialties)
      for (let i = 0; i < sp.conditions.length; i++) s.syllabus[`${sp.id}:${i}`] = "solid";
    expect(weightedCoverage(s)).toBeCloseTo(1, 5);
    expect(conditionsTally(s).covered).toBe(conditionsTally(s).total);
  });

  it("learning counts as half", () => {
    const s = freshState();
    s.syllabus["cardio:0"] = "learning";
    expect(weightedCoverage(s)).toBeGreaterThan(0);
    expect(conditionsTally(s).covered).toBe(1);
    expect(conditionsTally(s).solid).toBe(0);
  });

  it("focus domains favour heavy, low-coverage specialties", () => {
    const s = freshState();
    const focus = focusDomains(s, 3, TODAY);
    expect(focus.length).toBe(3);
    // General Medicine (items 12) should rank top when nothing is covered
    expect(focus[0].specialtyId).toBe("gen");
  });
});

describe("anki trap", () => {
  it("fires when cards made but never reviewed", () => {
    const s = withLog([{ type: "cards", count: 20 }]);
    const a = ankiState(s, TODAY);
    expect(a.trap).toBe(true);
    expect(a.message).toMatch(/wasted effort/);
  });

  it("clears when reviewed recently", () => {
    const s = withLog([
      { type: "cards", count: 20, date: addDays(TODAY, -1) },
      { type: "review", count: 20, date: TODAY },
    ]);
    expect(ankiState(s, TODAY).trap).toBe(false);
  });
});

describe("daily goal", () => {
  it("counts questions done today vs target", () => {
    const s = withLog([{ type: "questions", count: 12 }]);
    const g = questionsToday(s, TODAY);
    expect(g.done).toBe(12);
    expect(g.target).toBe(20);
    expect(g.met).toBe(false);
  });
});
