// All date logic in one place, computed in the device's LOCAL time zone.
// Dates are stored as ISO calendar days "YYYY-MM-DD".

/** Local calendar day as YYYY-MM-DD. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's local calendar day. */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** Parse a YYYY-MM-DD as a local midnight Date (avoids UTC off-by-one). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Whole calendar days from a→b (b - a). Negative if b is before a. */
export function daysBetween(aISO: string, bISO: string): number {
  const a = parseISODate(aISO).getTime();
  const b = parseISODate(bISO).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Add n days to an ISO date, returning ISO. */
export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** ISO dates for the last `n` days ending today (oldest first). */
export function lastNDays(n: number, today: string = todayISO()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}

/** True if `iso` is within the last `n` days (inclusive of today). */
export function withinLastDays(iso: string, n: number, today: string = todayISO()): boolean {
  const diff = daysBetween(iso, today);
  return diff >= 0 && diff < n;
}

/** Monday-based ISO week start for a given date. */
export function weekStartISO(iso: string): string {
  const d = parseISODate(iso);
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(iso, -dow);
}

/** Inclusive [start, end] ISO bounds of the Mon–Sun week containing `iso`. */
export function weekRange(iso: string): { start: string; end: string } {
  const start = weekStartISO(iso);
  return { start, end: addDays(start, 6) };
}

/** True if `iso` falls within the Mon–Sun week containing `ref`. */
export function inWeekOf(iso: string, ref: string): boolean {
  const { start, end } = weekRange(ref);
  return iso >= start && iso <= end;
}

const FMT = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
export function formatShort(iso: string): string {
  return FMT.format(parseISODate(iso));
}
