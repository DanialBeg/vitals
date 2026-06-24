// Reconcile two copies of the document. Baseline is whole-doc last-write-wins by
// `updatedAt` (acceptable per brief), but we additionally do a cheap field-aware
// merge of the append-mostly collections so an offline edit on one device does
// not silently clobber an edit on the other.
import type { AppState, LogEntry, ErrorEntry, DailyCheck, Status } from "../types";

function newer(a?: string, b?: string): boolean {
  // returns true if `a` is newer-or-equal to `b`
  if (!a) return false;
  if (!b) return true;
  return a >= b;
}

/** Union two id-keyed arrays; on id collision keep the entry with newer updatedAt. */
function mergeById<T extends { id: string; updatedAt?: string }>(
  local: T[],
  remote: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const e of remote) byId.set(e.id, e);
  for (const e of local) {
    const prev = byId.get(e.id);
    if (!prev || newer(e.updatedAt, prev.updatedAt)) byId.set(e.id, e);
  }
  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Merge two key→record maps where each record carries its own updatedAt. */
function mergeStampedMap<T extends { updatedAt?: string }>(
  local: Record<string, T>,
  remote: Record<string, T>,
): Record<string, T> {
  const out: Record<string, T> = { ...remote };
  for (const [k, v] of Object.entries(local)) {
    const prev = out[k];
    if (!prev || newer(v.updatedAt, prev.updatedAt)) out[k] = v;
  }
  return out;
}

/** Syllabus values are bare strings; fall back to doc-level winner per key. */
function mergeSyllabus(
  local: Record<string, Status>,
  remote: Record<string, Status>,
  localWins: boolean,
): Record<string, Status> {
  const out: Record<string, Status> = { ...(localWins ? remote : local) };
  const primary = localWins ? local : remote;
  for (const [k, v] of Object.entries(primary)) out[k] = v;
  return out;
}

/**
 * Merge `local` and `remote` into one document.
 * - Scalars (profile, examDate, targets): whole-doc LWW by top-level updatedAt.
 * - log / errors: union by id, per-entity LWW.
 * - dailyChecks: union by key, per-entity LWW.
 * - syllabus: union by key, doc-level winner breaks ties.
 */
export function mergeStates(local: AppState, remote: AppState): AppState {
  const localWins = newer(local.updatedAt, remote.updatedAt);
  const winner = localWins ? local : remote;

  return {
    schemaVersion: Math.max(local.schemaVersion, remote.schemaVersion),
    profile: winner.profile,
    phaseChecks: { ...remote.phaseChecks, ...local.phaseChecks, ...(localWins ? local.phaseChecks : remote.phaseChecks) },
    log: mergeById<LogEntry>(local.log, remote.log),
    errors: mergeById<ErrorEntry>(local.errors, remote.errors),
    dailyChecks: mergeStampedMap<DailyCheck>(local.dailyChecks, remote.dailyChecks),
    syllabus: mergeSyllabus(local.syllabus, remote.syllabus, localWins),
    updatedAt: winner.updatedAt,
  };
}
