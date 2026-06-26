import { describe, it, expect } from "vitest";
import type { AppState, LogEntry } from "../types";
import { freshState } from "../state/defaults";
import { mergeStates } from "./merge";

function state(updatedAt: string, log: LogEntry[], patch: Partial<AppState> = {}): AppState {
  return { ...freshState(), updatedAt, log, ...patch };
}

const L = (id: string, updatedAt?: string): LogEntry => ({
  id,
  date: "2026-06-20",
  type: "questions",
  count: 10,
  correct: 6,
  updatedAt,
});

describe("mergeStates", () => {
  it("unions log entries by id (no data loss across devices)", () => {
    const local = state("2026-06-23T10:00:00Z", [L("a"), L("b")]);
    const remote = state("2026-06-23T09:00:00Z", [L("a"), L("c")]);
    const merged = mergeStates(local, remote);
    expect(merged.log.map((e) => e.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("keeps the newer entry on id collision", () => {
    const local = state("2026-06-23T10:00:00Z", [
      { ...L("a", "2026-06-23T10:00:00Z"), count: 99 },
    ]);
    const remote = state("2026-06-23T11:00:00Z", [
      { ...L("a", "2026-06-22T00:00:00Z"), count: 1 },
    ]);
    const merged = mergeStates(local, remote);
    expect(merged.log.find((e) => e.id === "a")?.count).toBe(99);
  });

  it("profile follows whole-doc last-write-wins", () => {
    const local = state("2026-06-23T10:00:00Z", [], {
      profile: { ...freshState().profile, dailyQuestionTarget: 30 },
    });
    const remote = state("2026-06-23T09:00:00Z", [], {
      profile: { ...freshState().profile, dailyQuestionTarget: 10 },
    });
    expect(mergeStates(local, remote).profile.dailyQuestionTarget).toBe(30);
  });

  it("a cleared (epoch) local doc never clobbers the remote profile", () => {
    // Mirrors engine.clearLocal(): adopting a user wipes local and stamps epoch,
    // so the remote's saved profile must win the merge (not get reset to default).
    const cleared = state(new Date(0).toISOString(), []); // empty, epoch-stamped
    const remote = state("2026-06-23T09:00:00Z", [L("a")], {
      profile: { ...freshState().profile, dailyQuestionTarget: 42, examDate: "2099-01-01" },
    });
    const merged = mergeStates(cleared, remote);
    expect(merged.profile.dailyQuestionTarget).toBe(42);
    expect(merged.profile.examDate).toBe("2099-01-01");
    expect(merged.log.map((e) => e.id)).toContain("a"); // remote data preserved too
  });

  it("merges syllabus keys from both sides", () => {
    const local = state("2026-06-23T10:00:00Z", [], { syllabus: { "cardio:0": "solid" } });
    const remote = state("2026-06-23T09:00:00Z", [], { syllabus: { "neuro:1": "learning" } });
    const merged = mergeStates(local, remote);
    expect(merged.syllabus["cardio:0"]).toBe("solid");
    expect(merged.syllabus["neuro:1"]).toBe("learning");
  });
});
