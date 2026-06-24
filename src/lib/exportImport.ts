import type { AppState } from "../types";
import { migrate } from "../state/migrations";
import { todayISO } from "./date";

/** Trigger a download of the current state as a JSON backup file. */
export function exportState(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vitals-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parse + migrate an imported file. Throws on unreadable JSON. */
export async function parseImport(file: File): Promise<AppState> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON — pick a Vitals backup file.");
  }
  const migrated = migrate(parsed);
  // Sanity check: a real backup has the expected collections.
  if (!Array.isArray(migrated.log) || typeof migrated.profile !== "object") {
    throw new Error("That file doesn't look like a Vitals backup.");
  }
  return migrated;
}
