import { useSync } from "../sync/engine";
import styles from "./SyncBadge.module.css";

const LABEL: Record<string, { text: string; color: string }> = {
  disabled: { text: "Local", color: "var(--muted)" },
  "signed-out": { text: "Local", color: "var(--muted)" },
  offline: { text: "Offline", color: "var(--passive)" },
  syncing: { text: "Syncing", color: "var(--review)" },
  synced: { text: "Synced", color: "var(--retrieval)" },
  error: { text: "Sync error", color: "var(--alert)" },
};

export function SyncBadge({ onClick }: { onClick?: () => void }) {
  const status = useSync((s) => s.status);
  const meta = LABEL[status] ?? LABEL.disabled;
  return (
    <button className={styles.badge} onClick={onClick} aria-label={`Sync status: ${meta.text}`}>
      <span className={styles.dot} style={{ background: meta.color }} />
      <span style={{ color: meta.color }}>{meta.text}</span>
    </button>
  );
}
