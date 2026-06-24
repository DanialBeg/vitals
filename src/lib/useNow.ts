import { useEffect, useState } from "react";

/**
 * Re-renders on an interval so time-dependent UI (the evening reminder, the
 * countdown) updates without a reload. Default tick: 60s.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const onVis = () => document.visibilityState === "visible" && setNow(new Date());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs]);
  return now;
}
