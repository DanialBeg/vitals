import { create } from "zustand";
import { supabase, isSyncConfigured, TABLE } from "./supabase";
import { onAuthChange, type AuthUser } from "./auth";
import { useStore } from "../state/store";
import { migrate } from "../state/migrations";
import { mergeStates } from "./merge";
import { identifyUser, resetAnalytics } from "../lib/analytics";
import type { AppState } from "../types";

export type SyncStatus =
  | "disabled" // env not configured
  | "signed-out"
  | "offline"
  | "syncing"
  | "synced"
  | "error";

type SyncStore = {
  status: SyncStatus;
  user: AuthUser | null;
  lastSyncedAt: string | null;
  error: string | null;
  ready: boolean; // true once the initial auth session has been resolved
};

export const useSync = create<SyncStore>(() => ({
  status: isSyncConfigured ? "signed-out" : "disabled",
  user: null,
  lastSyncedAt: null,
  error: null,
  ready: !isSyncConfigured, // nothing to resolve when sync is off
}));

const set = (patch: Partial<SyncStore>) => useSync.setState(patch);

const PENDING_KEY = "vitals.pendingPush";
let applyingRemote = false; // suppress push while we write a reconciled remote
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function markPending(v: boolean) {
  try {
    if (v) localStorage.setItem(PENDING_KEY, "1");
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage may be unavailable */
  }
}
function hasPending(): boolean {
  try {
    return localStorage.getItem(PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

async function pushNow(): Promise<void> {
  const { user } = useSync.getState();
  if (!supabase || !user) return;
  if (!navigator.onLine) {
    markPending(true);
    set({ status: "offline" });
    return;
  }
  set({ status: "syncing", error: null });
  const data = useStore.getState().snapshot();
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: user.id, data, updated_at: data.updatedAt });
  if (error) {
    markPending(true);
    set({ status: "error", error: error.message });
    return;
  }
  markPending(false);
  set({ status: "synced", lastSyncedAt: new Date().toISOString() });
}

/** Pull the remote row, reconcile with local, write back both ways. */
async function reconcile(): Promise<void> {
  const { user } = useSync.getState();
  if (!supabase || !user) return;
  set({ status: "syncing", error: null });

  const { data: row, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    set({ status: "error", error: error.message });
    return;
  }

  const local = useStore.getState().snapshot();
  let next: AppState = local;
  if (row?.data) {
    const remote = migrate(row.data);
    next = mergeStates(local, remote);
  }

  // Apply merged result locally without re-triggering a push from the subscription.
  applyingRemote = true;
  useStore.getState().replaceState(next);
  applyingRemote = false;

  // Push the reconciled doc up so both sides converge.
  await pushNow();
}

function schedulePush() {
  if (applyingRemote) return;
  const { user } = useSync.getState();
  if (!supabase || !user) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushNow(), 1500); // debounce ~1.5s
}

let started = false;

/** Wire up auth, store subscription, and connectivity listeners. Call once. */
export function initSync(): void {
  if (started || !isSyncConfigured) return;
  started = true;

  // Backstop so the loading splash can never hang. The normal path is the
  // onAuthChange event below — it fires within milliseconds on a clean load, so
  // there's no flash and this timer is cleared. But an OAuth *return* with an
  // unresolved code/error can stall that event; if so, force readiness after a
  // short delay so the user reaches the gate to retry or use email.
  const backstop = setTimeout(() => {
    if (!useSync.getState().ready) set({ ready: true, status: "signed-out" });
  }, 3000);

  let identified = false;
  onAuthChange((user) => {
    clearTimeout(backstop);
    set({ user, status: user ? "syncing" : "signed-out", ready: true });
    if (user) {
      identifyUser(user); // link analytics to the signed-in user (idempotent)
      identified = true;
      void reconcile();
    } else if (identified) {
      resetAnalytics(); // sign-out: stop attributing events to the prior user
      identified = false;
    }
  });

  // Local edits → debounced push (and queued while offline).
  useStore.subscribe(() => schedulePush());

  window.addEventListener("online", () => {
    if (useSync.getState().user && hasPending()) void pushNow();
    else if (useSync.getState().user) void reconcile();
  });
  window.addEventListener("offline", () => {
    if (useSync.getState().user) set({ status: "offline" });
  });
}

/** Force a manual pull+reconcile (used by a "retry" affordance). */
export function retrySync(): void {
  if (useSync.getState().user) void reconcile();
}
