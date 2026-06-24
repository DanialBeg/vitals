import type { AppState } from "../types";
import { daysBetween, todayISO, withinLastDays } from "../lib/date";

const STALE_REVIEW_DAYS = 3;

export type AnkiState = {
  cardsMade7d: number; // cards made in the last 7 days
  reviews7d: number; // reviews done in the last 7 days
  lastReview: string | null;
  daysSinceReview: number | null;
  trap: boolean; // cards made but not reviewed recently
  message: string | null;
};

/**
 * The Anki trap, made visible: track cards-made vs reviews-done as separate
 * counters and call it out when cards pile up without recent review.
 */
export function ankiState(state: AppState, today: string = todayISO()): AnkiState {
  let cardsMade7d = 0;
  let reviews7d = 0;
  let lastReview: string | null = null;

  for (const e of state.log) {
    if (e.type === "cards" && withinLastDays(e.date, 7, today)) cardsMade7d += e.count;
    if (e.type === "review") {
      if (withinLastDays(e.date, 7, today)) reviews7d += e.count;
      if (lastReview == null || e.date > lastReview) lastReview = e.date;
    }
  }

  const daysSinceReview = lastReview ? daysBetween(lastReview, today) : null;
  const trap =
    cardsMade7d > 0 && (lastReview == null || (daysSinceReview ?? 0) >= STALE_REVIEW_DAYS);

  let message: string | null = null;
  if (trap) {
    if (lastReview == null) {
      message = `You've made ${cardsMade7d} card${cardsMade7d === 1 ? "" : "s"} this week and reviewed none — unreviewed cards are wasted effort.`;
    } else {
      message = `You've made ${cardsMade7d} card${cardsMade7d === 1 ? "" : "s"}; last reviewed ${daysSinceReview} day${daysSinceReview === 1 ? "" : "s"} ago — unreviewed cards are wasted effort.`;
    }
  }

  return { cardsMade7d, reviews7d, lastReview, daysSinceReview, trap, message };
}
