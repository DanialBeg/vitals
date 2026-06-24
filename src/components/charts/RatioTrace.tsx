import { useMemo } from "react";
import styles from "./RatioTrace.module.css";

/**
 * Bedside-monitor trace for the retrieval ratio: a grid, the 60% target band,
 * the last-7-days ratio trace, and a faint sweeping highlight that reads as
 * "live". The sweep animation is killed by prefers-reduced-motion (global CSS).
 */
export function RatioTrace({
  trace,
  target = 0.6,
  inBand,
  height = 96,
}: {
  trace: number[];
  target?: number;
  inBand: boolean;
  height?: number;
}) {
  const w = 320;
  const h = height;
  const color = inBand ? "var(--retrieval)" : "var(--passive)";

  const xs = (i: number) => (trace.length <= 1 ? w / 2 : (i / (trace.length - 1)) * w);
  const ys = (v: number) => (1 - Math.max(0, Math.min(1, v))) * h;

  const path = useMemo(() => {
    if (!trace.length) return "";
    return trace.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  }, [trace, h]);

  const area = useMemo(() => {
    if (!trace.length) return "";
    return `${path} L${w},${h} L0,${h} Z`;
  }, [path, h]);

  const lastX = xs(trace.length - 1);
  const lastY = ys(trace[trace.length - 1] ?? 0);

  const bandTop = (1 - (target + 0.1)) * h;
  const bandH = 0.2 * h;
  const targetY = (1 - target) * h;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      className={styles.trace}
      role="img"
      aria-label="Retrieval ratio trace over the last 7 days"
      preserveAspectRatio="none"
    >
      {/* monitor grid */}
      {Array.from({ length: 7 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={(i / 6) * w}
          x2={(i / 6) * w}
          y1={0}
          y2={h}
          stroke="var(--line)"
          strokeWidth="1"
        />
      ))}
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={`h${g}`} x1={0} x2={w} y1={g * h} y2={g * h} stroke="var(--line)" strokeWidth="1" />
      ))}

      {/* 60% target band */}
      <rect x={0} y={bandTop} width={w} height={bandH} fill="var(--retrieval)" opacity="0.07" />
      <line x1={0} x2={w} y1={targetY} y2={targetY} stroke="var(--retrieval)" strokeWidth="1" strokeDasharray="3 5" opacity="0.5" />

      {/* area fill under the trace */}
      {area && <path d={area} fill={color} opacity="0.08" />}

      {/* trace */}
      {path && (
        <path d={path} fill="none" stroke={color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* current-reading blip */}
      {path && (
        <>
          <circle cx={lastX} cy={lastY} r="5.5" fill={color} opacity="0.22" />
          <circle cx={lastX} cy={lastY} r="2.6" fill={color} />
        </>
      )}

      {/* faint live sweep */}
      <rect className={styles.sweep} x={0} y={0} width={36} height={h} fill="url(#sweepGrad)" />
      <defs>
        <linearGradient id="sweepGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor={color} stopOpacity="0.18" />
        </linearGradient>
      </defs>
    </svg>
  );
}
