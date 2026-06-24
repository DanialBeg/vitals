import type { AppState } from "../types";
import { exam } from "../content";

export const CURRENT_SCHEMA_VERSION = 1;

export function freshState(now: Date = new Date()): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: {
      stream: "adult",
      examDate: exam.date, // default from content.json, editable
      dailyQuestionTarget: 20,
      studyDaysPerWeek: 6,
    },
    log: [],
    syllabus: {},
    errors: [],
    dailyChecks: {},
    phaseChecks: {},
    updatedAt: now.toISOString(),
  };
}
