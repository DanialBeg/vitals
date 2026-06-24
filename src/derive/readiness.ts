import type { AppState } from "../types";
import { weightedCoverage } from "./coverage";
import { overallAccuracy, totalQuestions } from "./accuracy";

// A steering estimate, NOT a pass prediction. Blends coverage, accuracy and
// volume. Weights/anchors are deliberate and tunable.
const W_COVERAGE = 0.4;
const W_ACCURACY = 0.35;
const W_VOLUME = 0.25;

const ACC_FLOOR = 0.3; // 30% accuracy -> 0
const ACC_CEIL = 0.7; // 70% accuracy -> 100
const VOLUME_TARGET = 1500; // questions for a "full" volume signal

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export type Readiness = {
  score: number; // 0–100
  coverage: number; // 0–100 components, for the breakdown
  accuracy: number;
  volume: number;
  hasSignal: boolean;
};

export function readiness(state: AppState): Readiness {
  const coverageC = weightedCoverage(state) * 100;

  const acc = overallAccuracy(state).acc;
  const accuracyC = acc == null ? 0 : clamp01((acc - ACC_FLOOR) / (ACC_CEIL - ACC_FLOOR)) * 100;

  const volumeC = clamp01(totalQuestions(state) / VOLUME_TARGET) * 100;

  const score = Math.round(
    W_COVERAGE * coverageC + W_ACCURACY * accuracyC + W_VOLUME * volumeC,
  );

  return {
    score,
    coverage: Math.round(coverageC),
    accuracy: Math.round(accuracyC),
    volume: Math.round(volumeC),
    hasSignal: acc != null || coverageC > 0,
  };
}
