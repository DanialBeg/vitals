import { useMemo, useId } from "react";
import styles from "./RatioTrace.module.css";

/**
 * Clean area sparkline for the retrieval ratio: a smooth curve over the last 7
 * days, a soft gradient fill, a subtle 60% target line, and the current-reading
 * point. No grid, no animation — quiet and professional.
 */
export function RatioTrace({
  trace,
  target = 0.6,
  inBand,
  height = 92,
}: {
  trace: number[];
  target?: number;
  inBand: boolean;
  height?: number;
}) {
  const w = 320;
  const h = height;
  const pad = 6; // keep the stroke and end point off the edges
  const color = inBand ? "var(--retrieval)" : "var(--passive)";
  const gid = useId();

  const xs = (i: number) =>
    trace.length <= 1 ? w / 2 : pad + (i / (trace.length - 1)) * (w - pad * 2);
  const ys = (v: number) => pad + (1 - Math.max(0, Math.min(1, v))) * (h - pad * 2);

  const pts = useMemo(() => trace.map((v, i) => [xs(i), ys(v)] as const), [trace, h]);

  // Smooth Catmull-Rom → cubic Bézier for a refined, non-jagged line.
  const line = useMemo(() => {
    if (!pts.length) return "";
    if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }, [pts]);

  const area = line ? `${line} L${w - pad},${h} L${pad},${h} Z` : "";
  const last = pts[pts.length - 1];
  const targetY = ys(target);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      className={styles.trace}
      role="img"
      aria-label="Retrieval ratio over the last 7 days"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`fill-${gid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* subtle 60% target line */}
      <line
        x1={pad}
        x2={w - pad}
        y1={targetY}
        y2={targetY}
        stroke="var(--muted)"
        strokeWidth="1"
        strokeDasharray="2 5"
        opacity="0.5"
      />

      {area && <path d={area} fill={`url(#fill-${gid})`} />}
      {line && (
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {last && (
        <>
          <circle cx={last[0]} cy={last[1]} r="5" fill={color} opacity="0.18" />
          <circle cx={last[0]} cy={last[1]} r="2.8" fill={color} />
          <circle cx={last[0]} cy={last[1]} r="2.8" fill="none" stroke="var(--glass)" strokeWidth="1.4" />
        </>
      )}
    </svg>
  );
}
