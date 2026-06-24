import { useMemo } from "react";

type Point = { date: string; acc: number | null };

/**
 * Accuracy trend line with the 60% pass-mark reference line. Gaps (days with no
 * questions) break the line rather than dropping to zero.
 */
export function TrendChart({
  points,
  referenceLine = 0.6,
  height = 120,
}: {
  points: Point[];
  referenceLine?: number;
  height?: number;
}) {
  const w = 320;
  const h = height;
  const pad = { l: 6, r: 6, t: 10, b: 14 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const segments = useMemo(() => {
    const xs = (i: number) =>
      pad.l + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW);
    const ys = (v: number) => pad.t + (1 - v) * innerH;
    const segs: string[] = [];
    let cur: string[] = [];
    points.forEach((p, i) => {
      if (p.acc == null) {
        if (cur.length) segs.push(cur.join(" "));
        cur = [];
      } else {
        cur.push(`${cur.length ? "L" : "M"}${xs(i).toFixed(1)},${ys(p.acc).toFixed(1)}`);
      }
    });
    if (cur.length) segs.push(cur.join(" "));
    return segs;
  }, [points, innerW, innerH]);

  const refY = pad.t + (1 - referenceLine) * innerH;
  const hasData = points.some((p) => p.acc != null);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      role="img"
      aria-label={`Accuracy trend with a ${Math.round(referenceLine * 100)}% reference line`}
    >
      {/* grid */}
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad.l}
          x2={w - pad.r}
          y1={pad.t + (1 - g) * innerH}
          y2={pad.t + (1 - g) * innerH}
          stroke="var(--line)"
          strokeWidth="1"
        />
      ))}
      {/* 60% reference */}
      <line
        x1={pad.l}
        x2={w - pad.r}
        y1={refY}
        y2={refY}
        stroke="var(--passive)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <text x={w - pad.r} y={refY - 3} textAnchor="end" fontSize="9" fill="var(--passive)">
        {Math.round(referenceLine * 100)}% pass ref
      </text>
      {/* trend */}
      {segments.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="var(--retrieval)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {!hasData && (
        <text x={w / 2} y={h / 2} textAnchor="middle" fontSize="11" fill="var(--muted)">
          No scored questions yet
        </text>
      )}
    </svg>
  );
}
