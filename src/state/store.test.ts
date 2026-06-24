// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";
import { freshState } from "./defaults";
import { addDays, todayISO } from "../lib/date";
import { dueErrors } from "../derive/errors";

beforeEach(() => {
  useStore.getState().replaceState(freshState());
});

describe("store actions", () => {
  it("logs a question and exposes it in state", () => {
    useStore.getState().addLog({ date: todayISO(), type: "questions", count: 20, correct: 14 });
    const log = useStore.getState().log;
    expect(log).toHaveLength(1);
    expect(log[0].count).toBe(20);
    expect(log[0].updatedAt).toBeTruthy();
  });

  it("schedules a new error ~10 days out", () => {
    useStore.getState().addError({ date: todayISO(), errorType: "knowledge", takeaway: "x" });
    const e = useStore.getState().errors[0];
    expect(e.reattemptDate).toBe(addDays(todayISO(), 10));
    expect(e.resolved).toBe(false);
  });

  it("'missed again' reschedules +7 days and flags it", () => {
    useStore.getState().addError({ date: addDays(todayISO(), -20), errorType: "misread", takeaway: "y" });
    const id = useStore.getState().errors[0].id;
    expect(dueErrors(useStore.getState(), todayISO()).length).toBe(1); // overdue, surfaces as due
    useStore.getState().missedAgain(id);
    const e = useStore.getState().errors[0];
    expect(e.missedAgain).toBe(true);
    expect(e.reattemptDate).toBe(addDays(todayISO(), 7));
  });

  it("'got it' resolves an error out of the due queue", () => {
    useStore.getState().addError({ date: addDays(todayISO(), -20), errorType: "careless", takeaway: "z" });
    const id = useStore.getState().errors[0].id;
    useStore.getState().resolveError(id);
    expect(dueErrors(useStore.getState(), todayISO()).length).toBe(0);
  });

  it("cycles a syllabus condition none → learning → solid → none", () => {
    const key = "cardio:0";
    const cycle = useStore.getState().cycleSyllabus;
    cycle(key);
    expect(useStore.getState().syllabus[key]).toBe("learning");
    cycle(key);
    expect(useStore.getState().syllabus[key]).toBe("solid");
    cycle(key);
    expect(useStore.getState().syllabus[key]).toBe("none");
  });
});
