import { useState } from "react";
import { useStore } from "../state/store";
import { questionsToday } from "../derive/hours";
import { todayISO } from "../lib/date";
import { useNow } from "../lib/useNow";
import styles from "./ReminderBanner.module.css";

const EVENING_HOUR = 17;

/**
 * In-app evening reminder. After 17:00 local, if the daily question target
 * isn't met, show a dismissible banner. Clears itself when the target is hit.
 * (A web app cannot fire OS push notifications — this is in-app only.)
 */
export function ReminderBanner() {
  const now = useNow(60_000); // re-evaluate every minute so it appears without reload
  const state = useStore();
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);

  const today = todayISO(now);
  const { done, target, met } = questionsToday(state, today);

  const isEvening = now.getHours() >= EVENING_HOUR;
  const dismissedToday = dismissedAt === today;

  if (!isEvening || met || dismissedToday) return null;

  const remaining = target - done;
  const msg =
    done === 0
      ? `Evening check: no questions logged today. Even 10 reps beats zero.`
      : `Evening check: ${done}/${target} questions — ${remaining} to hit today's goal.`;

  return (
    <div className={styles.banner} role="status">
      <span className={styles.dot} />
      <span className={styles.text}>{msg}</span>
      <button
        className={styles.close}
        onClick={() => setDismissedAt(today)}
        aria-label="Dismiss reminder"
      >
        ✕
      </button>
    </div>
  );
}
