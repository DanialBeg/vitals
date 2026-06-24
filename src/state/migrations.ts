// Forward-compatible migrations. MUST: updating the app never wipes logs,
// syllabus ticks, or the error log. Every load path (localStorage, import,
// remote pull) runs `migrate` so old documents are upgraded, never dropped.
import type { AppState } from "../types";
import { CURRENT_SCHEMA_VERSION, freshState } from "./defaults";

// Each step upgrades from version N to N+1. Keyed by the *source* version.
// Add new steps here when bumping CURRENT_SCHEMA_VERSION — never edit old ones.
const steps: Record<number, (s: any) => any> = {
  // 0 → 1: baseline. Backfill fields that may be missing from pre-versioned blobs.
  0: (s) => ({
    ...s,
    phaseChecks: s.phaseChecks ?? {},
    dailyChecks: s.dailyChecks ?? {},
    schemaVersion: 1,
  }),
};

/**
 * Bring any partial/old state up to the current schema, filling defaults for
 * missing fields without dropping unknown data. Safe on `null`/`undefined`.
 */
export function migrate(input: unknown): AppState {
  const base = freshState();
  if (!input || typeof input !== "object") return base;

  let s: any = { ...base, ...(input as object) };

  // Deep-merge profile so newly-added profile fields get defaults.
  s.profile = { ...base.profile, ...(s.profile ?? {}) };

  // Apply ordered migration steps.
  let v: number = typeof s.schemaVersion === "number" ? s.schemaVersion : 0;
  while (v < CURRENT_SCHEMA_VERSION) {
    const step = steps[v];
    s = step ? step(s) : { ...s, schemaVersion: v + 1 };
    v = s.schemaVersion ?? v + 1;
  }

  // Coerce collection shapes defensively (never throw on a malformed blob).
  s.log = Array.isArray(s.log) ? s.log : [];
  s.errors = Array.isArray(s.errors) ? s.errors : [];
  s.syllabus = s.syllabus && typeof s.syllabus === "object" ? s.syllabus : {};
  s.dailyChecks =
    s.dailyChecks && typeof s.dailyChecks === "object" ? s.dailyChecks : {};
  s.phaseChecks =
    s.phaseChecks && typeof s.phaseChecks === "object" ? s.phaseChecks : {};
  s.schemaVersion = CURRENT_SCHEMA_VERSION;
  return s as AppState;
}
