import { useEffect, useState } from "react";
import { usePostHog } from "@posthog/react";
import { Sheet, Button } from "./ui";
import { NumberStepper } from "./NumberStepper";
import { useStore } from "../state/store";
import { specialties } from "../content";
import { todayISO } from "../lib/date";
import { questionsToday } from "../derive/hours";
import type { LogType } from "../types";
import styles from "./QuickLog.module.css";

const TYPES: { type: LogType; label: string; defaultCount: number; color: string }[] = [
  { type: "questions", label: "Questions", defaultCount: 20, color: "var(--retrieval)" },
  { type: "review", label: "Reviews", defaultCount: 20, color: "var(--review)" },
  { type: "lecture", label: "Lecture", defaultCount: 1, color: "var(--passive)" },
  { type: "cards", label: "Cards made", defaultCount: 10, color: "var(--passive)" },
];

export function QuickLog({
  open,
  onClose,
  initialType,
}: {
  open: boolean;
  onClose: () => void;
  initialType?: LogType;
}) {
  const posthog = usePostHog();
  const addLog = useStore((s) => s.addLog);
  const dailyTarget = useStore((s) => s.profile.dailyQuestionTarget);
  const [type, setType] = useState<LogType>(initialType ?? "questions");
  const [count, setCount] = useState<number>(dailyTarget);
  const [correct, setCorrect] = useState<number | "">("");
  const [specialtyId, setSpecialtyId] = useState<string>("");
  const [minutes, setMinutes] = useState<number | "">("");

  const defaultCount = (t: LogType) =>
    t === "questions" ? dailyTarget : TYPES.find((x) => x.type === t)!.defaultCount;

  // Each time the sheet opens, reflect the requested type with a sensible
  // default and clear volatile fields. (The component stays mounted, so this
  // can't live in useState initialisers.)
  useEffect(() => {
    if (!open) return;
    const t = initialType ?? "questions";
    setType(t);
    setCount(defaultCount(t));
    setCorrect("");
    setMinutes("");
    setSpecialtyId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialType]);

  const pickType = (t: LogType) => {
    setType(t);
    setCount(defaultCount(t));
    setCorrect("");
  };

  const submit = () => {
    const n = Math.max(0, count || 0);
    const prevDone = questionsToday(useStore.getState(), todayISO()).done;

    addLog({
      date: todayISO(),
      type,
      count: n,
      specialtyId: specialtyId || undefined,
      correct: type === "questions" && correct !== "" ? Number(correct) : undefined,
      minutes: minutes !== "" ? Number(minutes) : undefined,
    });

    posthog?.capture("study_session_logged", {
      type,
      count: n,
      has_correct: type === "questions" && correct !== "",
      has_specialty: !!specialtyId,
      minutes: minutes !== "" ? Number(minutes) : null,
    });

    // Fire once, when today's questions first cross the daily target.
    if (type === "questions" && prevDone < dailyTarget && prevDone + n >= dailyTarget) {
      posthog?.capture("daily_goal_reached", { target: dailyTarget, total: prevDone + n });
    }
    // reset volatile fields, keep type
    setCorrect("");
    setMinutes("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Quick log">
      <div className={styles.types}>
        {TYPES.map((t) => (
          <button
            key={t.type}
            className={`${styles.typeBtn} ${type === t.type ? styles.typeActive : ""}`}
            style={type === t.type ? { borderColor: t.color, color: t.color } : undefined}
            onClick={() => pickType(t.type)}
            aria-pressed={type === t.type}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.field}>
        <span>{type === "lecture" ? "Lectures" : type === "cards" ? "Cards made" : type === "review" ? "Cards reviewed" : "Questions done"}</span>
        <NumberStepper
          value={count}
          onChange={(v) => setCount(v === "" ? 0 : v)}
          min={0}
          ariaLabel="Count"
        />
      </div>

      {type === "questions" && (
        <div className={styles.field}>
          <span>Correct (optional)</span>
          <NumberStepper
            value={correct}
            onChange={setCorrect}
            min={0}
            max={count}
            allowEmpty
            ariaLabel="Correct answers"
          />
        </div>
      )}

      <label className={styles.field}>
        <span>Topic (optional)</span>
        <div className={styles.selectWrap}>
          <select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
            <option value="">No tag</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <svg className={styles.chevron} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </label>

      <div className={styles.field}>
        <span>Minutes (optional)</span>
        <NumberStepper
          value={minutes}
          onChange={setMinutes}
          min={0}
          step={5}
          allowEmpty
          ariaLabel="Minutes"
        />
      </div>

      <Button variant="primary" block onClick={submit} style={{ marginTop: 8 }}>
        Log it
      </Button>
    </Sheet>
  );
}
