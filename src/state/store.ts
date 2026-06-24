import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type { AppState, ErrorEntry, LogEntry, Profile, Status } from "../types";
import { freshState, CURRENT_SCHEMA_VERSION } from "./defaults";
import { migrate } from "./migrations";
import { addDays, todayISO } from "../lib/date";

const STORAGE_KEY = "vitals.v1";

// Resilient storage: use localStorage when it's a real, working Web Storage,
// otherwise fall back to an in-memory map. Guards against Safari private mode
// (which throws on write) and non-browser/test environments.
const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      const ls = globalThis.localStorage;
      if (ls && typeof ls.getItem === "function") return ls.getItem(name);
    } catch {
      /* fall through */
    }
    return memory.get(name) ?? null;
  },
  setItem: (name, value) => {
    try {
      const ls = globalThis.localStorage;
      if (ls && typeof ls.setItem === "function") {
        ls.setItem(name, value);
        return;
      }
    } catch {
      /* fall through */
    }
    memory.set(name, value);
  },
  removeItem: (name) => {
    try {
      const ls = globalThis.localStorage;
      if (ls && typeof ls.removeItem === "function") {
        ls.removeItem(name);
        return;
      }
    } catch {
      /* fall through */
    }
    memory.delete(name);
  },
};

const STATUS_CYCLE: Status[] = ["none", "learning", "solid"];

function uid(): string {
  return crypto?.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export type DataState = AppState;

export type Actions = {
  addLog: (entry: Omit<LogEntry, "id" | "updatedAt">) => void;
  deleteLog: (id: string) => void;
  cycleSyllabus: (key: string) => void;
  setSyllabus: (key: string, status: Status) => void;
  addError: (
    entry: Omit<ErrorEntry, "id" | "reattemptDate" | "resolved" | "missedAgain" | "updatedAt">,
  ) => void;
  resolveError: (id: string) => void;
  missedAgain: (id: string) => void;
  reopenError: (id: string) => void;
  setAnkiCleared: (date: string, cleared: boolean) => void;
  setPhaseCheck: (key: string, checked: boolean) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  /** Replace the whole document (import / sync reconcile). Runs migration. */
  replaceState: (next: unknown) => void;
  /** Snapshot the persisted document for export/sync. */
  snapshot: () => AppState;
};

type Store = DataState & Actions;

const DATA_KEYS: (keyof AppState)[] = [
  "schemaVersion",
  "profile",
  "log",
  "syllabus",
  "errors",
  "dailyChecks",
  "phaseChecks",
  "updatedAt",
];

function pickData(s: Store): AppState {
  const out = {} as AppState;
  for (const k of DATA_KEYS) (out as any)[k] = (s as any)[k];
  return out;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      // Every mutation funnels through here: stamps the top-level updatedAt.
      const commit = (patch: Partial<AppState>) =>
        set({ ...patch, updatedAt: new Date().toISOString() } as Partial<Store>);

      return {
        ...freshState(),

        addLog: (entry) => {
          const now = new Date().toISOString();
          const e: LogEntry = { ...entry, id: uid(), updatedAt: now };
          commit({ log: [...get().log, e] });
        },

        deleteLog: (id) => commit({ log: get().log.filter((l) => l.id !== id) }),

        cycleSyllabus: (key) => {
          const cur = get().syllabus[key] ?? "none";
          const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % 3];
          commit({ syllabus: { ...get().syllabus, [key]: next } });
        },

        setSyllabus: (key, status) =>
          commit({ syllabus: { ...get().syllabus, [key]: status } }),

        addError: (entry) => {
          const now = new Date().toISOString();
          const e: ErrorEntry = {
            ...entry,
            id: uid(),
            reattemptDate: addDays(entry.date, 10), // re-attempt ≈ +10 days
            resolved: false,
            missedAgain: false,
            updatedAt: now,
          };
          commit({ errors: [...get().errors, e] });
        },

        resolveError: (id) =>
          commit({
            errors: get().errors.map((e) =>
              e.id === id
                ? { ...e, resolved: true, updatedAt: new Date().toISOString() }
                : e,
            ),
          }),

        missedAgain: (id) =>
          commit({
            errors: get().errors.map((e) =>
              e.id === id
                ? {
                    ...e,
                    missedAgain: true,
                    resolved: false,
                    reattemptDate: addDays(todayISO(), 7), // reschedule +7 days
                    updatedAt: new Date().toISOString(),
                  }
                : e,
            ),
          }),

        reopenError: (id) =>
          commit({
            errors: get().errors.map((e) =>
              e.id === id
                ? { ...e, resolved: false, updatedAt: new Date().toISOString() }
                : e,
            ),
          }),

        setAnkiCleared: (date, cleared) =>
          commit({
            dailyChecks: {
              ...get().dailyChecks,
              [date]: { ankiCleared: cleared, updatedAt: new Date().toISOString() },
            },
          }),

        setPhaseCheck: (key, checked) =>
          commit({ phaseChecks: { ...get().phaseChecks, [key]: checked } }),

        updateProfile: (patch) =>
          commit({ profile: { ...get().profile, ...patch } }),

        replaceState: (next) => {
          const migrated = migrate(next);
          set({ ...migrated } as Partial<Store>);
        },

        snapshot: () => pickData(get()),
      };
    },
    {
      name: STORAGE_KEY,
      version: CURRENT_SCHEMA_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => pickData(s as Store),
      // Run our own migration on every rehydrate so old blobs upgrade safely.
      migrate: (persisted) => migrate(persisted) as unknown as Store,
      merge: (persisted, current) => ({
        ...current,
        ...(migrate(persisted) as object),
      }),
    },
  ),
);
