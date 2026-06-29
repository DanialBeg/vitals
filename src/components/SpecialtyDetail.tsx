import { useState } from "react";
import { useStore } from "../state/store";
import { specialtyRecord } from "../derive/specialty";
import { TrendChart } from "./charts/TrendChart";
import { QuickLog } from "./QuickLog";
import { Button, EmptyState } from "./ui";
import { exam } from "../content";
import { formatShort } from "../lib/date";
import { pctLabel, hours } from "../lib/format";
import type { LogType } from "../types";
import s from "./SpecialtyDetail.module.css";

const TYPE_LABEL: Record<LogType, string> = {
  questions: "Questions",
  review: "Reviews",
  lecture: "Lecture",
  cards: "Cards",
};

export function SpecialtyDetail({
  specialtyId,
  onClose,
}: {
  specialtyId: string | null;
  onClose: () => void;
}) {
  const state = useStore();
  const [logOpen, setLogOpen] = useState(false);

  if (!specialtyId) return null;
  const rec = specialtyRecord(state, specialtyId);
  const ref = exam.passMark.referenceLine / 100;
  const accColor = (rec.acc ?? 0) >= ref ? "var(--retrieval)" : "var(--passive)";

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label={`${rec.name} record`}>
      <header className={s.bar}>
        <button className={s.close} onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span className={s.barTitle}>{rec.name}</span>
        <span className={s.spacer} />
      </header>

      <div className={s.body}>
        <div className={s.subhead}>Blueprint weight {rec.items} · {rec.entries} sessions logged</div>

        {/* Headline stats */}
        <section className={s.card}>
          <div className={s.statRow}>
            <div className={s.stat}>
              <span className={`mono ${s.statNum}`}>{rec.questions}</span>
              <span className={s.statLabel}>questions done</span>
            </div>
            <div className={s.stat}>
              <span className={`mono ${s.statNum}`} style={{ color: accColor }}>{pctLabel(rec.acc)}</span>
              <span className={s.statLabel}>accuracy{rec.attempted > 0 && rec.attempted < 10 ? " · low N" : ""}</span>
            </div>
          </div>
          {rec.acc != null && (
            <div style={{ marginTop: 14 }}>
              <TrendChart points={rec.trend} referenceLine={ref} />
            </div>
          )}
        </section>

        {/* Activity breakdown */}
        <section className={s.card}>
          <div className={s.cardTitle}>Activity</div>
          <div className={s.breakdown}>
            <Cell n={rec.questions} label="Questions" color="var(--retrieval)" />
            <Cell n={rec.reviews} label="Reviews" color="var(--review)" />
            <Cell n={rec.lectures} label="Lectures" color="var(--passive)" />
            <Cell n={rec.cards} label="Cards" color="var(--passive)" />
          </div>
          <div className={s.hours}>{hours(rec.minutes)} h logged{rec.minutes === 0 ? " (add minutes when logging)" : ""}</div>
        </section>

        {/* Recent sessions */}
        <section className={s.card}>
          <div className={s.cardTitle}>Recent sessions</div>
          {rec.sessions.length === 0 ? (
            <EmptyState>No sessions tagged to {rec.name} yet.</EmptyState>
          ) : (
            rec.sessions.slice(0, 30).map((e) => (
              <div key={e.id} className={s.session}>
                <span className={s.sessDate}>{formatShort(e.date)}</span>
                <span className={s.sessType}>{TYPE_LABEL[e.type]}</span>
                <span className={`mono ${s.sessCount}`}>
                  {e.count}
                  {e.type === "questions" && typeof e.correct === "number" && (
                    <span className={s.sessAcc}> · {Math.round((e.correct / e.count) * 100)}%</span>
                  )}
                  {typeof e.minutes === "number" && e.minutes > 0 && <span className={s.sessMin}> · {e.minutes}m</span>}
                </span>
              </div>
            ))
          )}
        </section>

        <Button variant="primary" block onClick={() => setLogOpen(true)} style={{ marginTop: 4 }}>
          + Log for {rec.name}
        </Button>
      </div>

      <QuickLog open={logOpen} onClose={() => setLogOpen(false)} initialSpecialtyId={specialtyId} />
    </div>
  );
}

function Cell({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className={s.cell}>
      <span className={`mono ${s.cellNum}`} style={{ color: n > 0 ? color : "var(--muted)" }}>{n}</span>
      <span className={s.cellLabel}>{label}</span>
    </div>
  );
}
