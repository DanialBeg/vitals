import { useState } from "react";
import { Sheet, Button } from "./ui";
import { useStore } from "../state/store";
import { specialties } from "../content";
import { todayISO } from "../lib/date";
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
  const addLog = useStore((s) => s.addLog);
  const dailyTarget = useStore((s) => s.profile.dailyQuestionTarget);
  const [type, setType] = useState<LogType>(initialType ?? "questions");
  const [count, setCount] = useState<number>(dailyTarget);
  const [correct, setCorrect] = useState<number | "">("");
  const [specialtyId, setSpecialtyId] = useState<string>("");
  const [minutes, setMinutes] = useState<number | "">("");

  const pickType = (t: LogType) => {
    setType(t);
    setCount(TYPES.find((x) => x.type === t)!.defaultCount);
    setCorrect("");
  };

  const submit = () => {
    addLog({
      date: todayISO(),
      type,
      count: Math.max(0, count || 0),
      specialtyId: specialtyId || undefined,
      correct: type === "questions" && correct !== "" ? Number(correct) : undefined,
      minutes: minutes !== "" ? Number(minutes) : undefined,
    });
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

      <label className={styles.field}>
        <span>{type === "lecture" ? "Lectures" : type === "cards" ? "Cards made" : type === "review" ? "Cards reviewed" : "Questions done"}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </label>

      {type === "questions" && (
        <label className={styles.field}>
          <span>Correct (optional)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={count}
            value={correct}
            placeholder="—"
            onChange={(e) => setCorrect(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </label>
      )}

      <label className={styles.field}>
        <span>Topic (optional)</span>
        <select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
          <option value="">No tag</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Minutes (optional)</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={minutes}
          placeholder="—"
          onChange={(e) => setMinutes(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </label>

      <Button variant="primary" block onClick={submit} style={{ marginTop: 8 }}>
        Log it
      </Button>
    </Sheet>
  );
}
