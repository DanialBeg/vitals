import { useState } from "react";
import { usePostHog } from "@posthog/react";
import { Card, Button, Chip, Sheet, EmptyState } from "./ui";
import { useStore } from "../state/store";
import { specialties, errorTypes, specialtyName } from "../content";
import { todayISO, formatShort } from "../lib/date";
import { filterErrors, errorCounts, errorTypeMix } from "../derive/errors";
import type { ErrorFilter } from "../derive/errors";
import type { ErrorType } from "../types";
import s from "../screens/screens.module.css";
import e from "./ErrorLog.module.css";

export function ErrorLog() {
  const posthog = usePostHog();
  const state = useStore();
  const addError = useStore((st) => st.addError);
  const resolveError = useStore((st) => st.resolveError);
  const missedAgain = useStore((st) => st.missedAgain);

  const today = todayISO();
  const [filter, setFilter] = useState<ErrorFilter>("due");
  const [adding, setAdding] = useState(false);

  // new-error form
  const [specialtyId, setSpecialtyId] = useState("");
  const [errorType, setErrorType] = useState<ErrorType>("knowledge");
  const [takeaway, setTakeaway] = useState("");
  const [yourAnswer, setYourAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");

  const counts = errorCounts(state, today);
  const list = filterErrors(state, filter, today);
  const mix = errorTypeMix(state).sort((a, b) => b.count - a.count);

  const save = () => {
    if (!takeaway.trim()) return;
    addError({
      date: today,
      specialtyId: specialtyId || undefined,
      errorType,
      takeaway: takeaway.trim(),
      yourAnswer: yourAnswer.trim() || undefined,
      correctAnswer: correctAnswer.trim() || undefined,
    });
    posthog?.capture("error_logged", { error_type: errorType, has_specialty: !!specialtyId });
    setTakeaway("");
    setYourAnswer("");
    setCorrectAnswer("");
    setSpecialtyId("");
    setErrorType("knowledge");
    setAdding(false);
  };

  return (
    <Card
      title="Error log"
      right={<Button variant="ghost" onClick={() => setAdding(true)} style={{ minHeight: 34, padding: "0 12px" }}>+ Log wrong Q</Button>}
    >
      {mix.length > 0 && (
        <div className={e.mix}>
          {mix.map((m) => (
            <span key={m.type} className={e.mixItem}>
              <b className="mono">{m.count}</b> {errorTypes.find((t) => t.id === m.type)?.label}
            </span>
          ))}
        </div>
      )}

      <div className={s.pillRow} style={{ margin: "12px 0" }}>
        <Chip active={filter === "open"} onClick={() => setFilter("open")}>Open · {counts.open}</Chip>
        <Chip active={filter === "due"} onClick={() => setFilter("due")}>Due · {counts.due}</Chip>
        <Chip active={filter === "resolved"} onClick={() => setFilter("resolved")}>Resolved · {counts.resolved}</Chip>
      </div>

      {list.length === 0 ? (
        <EmptyState>
          {filter === "due"
            ? "Nothing due. When a logged error's re-attempt date arrives, it surfaces here."
            : filter === "resolved"
              ? "No resolved errors yet."
              : "No open errors. Log a wrong question to start turning misses into marks."}
        </EmptyState>
      ) : (
        list.map((err) => {
          const isDue = !err.resolved && err.reattemptDate <= today;
          return (
            <div key={err.id} className={e.item}>
              <div className={e.itemHead}>
                <span className={e.type} data-type={err.errorType}>
                  {errorTypes.find((t) => t.id === err.errorType)?.label}
                </span>
                <span className={s.smallprint}>{specialtyName(err.specialtyId)}</span>
              </div>
              <div className={e.takeaway}>{err.takeaway}</div>
              {(err.yourAnswer || err.correctAnswer) && (
                <div className={s.smallprint}>
                  {err.yourAnswer && <>You: {err.yourAnswer} · </>}
                  {err.correctAnswer && <>Correct: {err.correctAnswer}</>}
                </div>
              )}
              <div className={e.meta}>
                <span className={s.smallprint}>
                  logged {formatShort(err.date)} · re-attempt {formatShort(err.reattemptDate)}
                  {err.missedAgain && <span className={s.alert}> · missed again → make a card</span>}
                  {isDue && <span className={s.alert}> · DUE</span>}
                </span>
              </div>
              {!err.resolved && (
                <div className={e.actions}>
                  <Button
                    onClick={() => {
                      resolveError(err.id);
                      posthog?.capture("error_resolved", { error_type: err.errorType, was_missed_again: err.missedAgain });
                    }}
                    style={{ minHeight: 38 }}
                  >
                    Got it
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      missedAgain(err.id);
                      posthog?.capture("error_missed_again", { error_type: err.errorType });
                    }}
                    style={{ minHeight: 38 }}
                  >
                    Missed again
                  </Button>
                </div>
              )}
            </div>
          );
        })
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Log a wrong question">
        <label className={e.field}>
          <span>Topic</span>
          <div className={e.selectWrap}>
            <select value={specialtyId} onChange={(ev) => setSpecialtyId(ev.target.value)}>
              <option value="">No tag</option>
              {specialties.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </select>
            <svg className={e.chevron} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </label>
        <div className={e.typeGrid}>
          {errorTypes.map((t) => (
            <button
              key={t.id}
              className={`${e.typeBtn} ${errorType === t.id ? e.typeActive : ""}`}
              onClick={() => setErrorType(t.id)}
              aria-pressed={errorType === t.id}
            >
              <b>{t.label}</b>
              <span>{t.hint}</span>
            </button>
          ))}
        </div>
        <label className={e.fieldCol}>
          <span>Takeaway (your own words)</span>
          <textarea value={takeaway} onChange={(ev) => setTakeaway(ev.target.value)} rows={2} placeholder="The one line you want to remember" />
        </label>
        <div className={e.answers}>
          <label className={e.fieldCol}>
            <span>Your answer</span>
            <input value={yourAnswer} onChange={(ev) => setYourAnswer(ev.target.value)} placeholder="optional" />
          </label>
          <label className={e.fieldCol}>
            <span>Correct answer</span>
            <input value={correctAnswer} onChange={(ev) => setCorrectAnswer(ev.target.value)} placeholder="optional" />
          </label>
        </div>
        <p className={s.smallprint} style={{ marginBottom: 12 }}>Re-attempt scheduled ~10 days out.</p>
        <Button variant="primary" block onClick={save} disabled={!takeaway.trim()}>Save error</Button>
      </Sheet>
    </Card>
  );
}
