/** Format a 0–1 fraction as a whole-number percent string, e.g. 0.62 → "62". */
export function pct(frac: number): string {
  if (!isFinite(frac)) return "—";
  return String(Math.round(frac * 100));
}

/** Format a 0–1 fraction as "62%". */
export function pctLabel(frac: number | null): string {
  if (frac == null || !isFinite(frac)) return "—";
  return `${Math.round(frac * 100)}%`;
}

/** Hours from minutes, one decimal, e.g. 95 → "1.6". */
export function hours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

/** Pluralise a unit: plural(1, "day") → "1 day". */
export function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** Signed delta with arrow, e.g. +4 → "▲ 4", -3 → "▼ 3", 0 → "– 0". */
export function trend(delta: number): { glyph: string; tone: "up" | "down" | "flat" } {
  if (delta > 0) return { glyph: `▲ ${Math.abs(delta)}`, tone: "up" };
  if (delta < 0) return { glyph: `▼ ${Math.abs(delta)}`, tone: "down" };
  return { glyph: `– 0`, tone: "flat" };
}
