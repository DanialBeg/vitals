import { useState } from "react";
import { usePostHog } from "@posthog/react";
import { Card } from "../components/ui";
import { useStore } from "../state/store";
import { specialties, syllabusKey, exam } from "../content";
import { weightedCoverage, conditionsTally, specialtyConfidence } from "../derive/coverage";
import { pctLabel } from "../lib/format";
import type { AppState, Status } from "../types";
import s from "./screens.module.css";
import c from "./Syllabus.module.css";

const STATUS_COLOR: Record<Status, string> = {
  none: "var(--muted)",
  learning: "var(--passive)",
  solid: "var(--retrieval)",
};
const STATUS_LABEL: Record<Status, string> = {
  none: "Not started",
  learning: "Learning",
  solid: "Solid",
};

/** Per-specialty rollup of logged activity + a loop-breaking nudge. */
function rollup(state: AppState, specialtyId: string) {
  let q = 0,
    correct = 0,
    attempted = 0,
    lectures = 0,
    cards = 0;
  for (const e of state.log) {
    if (e.specialtyId !== specialtyId) continue;
    if (e.type === "questions") {
      q += e.count;
      if (typeof e.correct === "number") {
        correct += e.correct;
        attempted += e.count;
      }
    } else if (e.type === "lecture") lectures += e.count;
    else if (e.type === "cards") cards += e.count;
  }
  const acc = attempted > 0 ? correct / attempted : null;
  const input = lectures + cards;

  let nudge: string | null = null;
  if (input > 0 && q < 5) nudge = "Input logged but barely tested — do questions here.";
  else if (acc != null && acc < 0.5) nudge = `${Math.round(acc * 100)}% in questions — needs another pass.`;
  return { q, acc, lectures, cards, nudge };
}

export function Syllabus() {
  const posthog = usePostHog();
  const state = useStore();
  const cycle = useStore((st) => st.cycleSyllabus);
  const onCycle = (key: string, specialtyId: string) => {
    cycle(key);
    posthog?.capture("syllabus_condition_updated", {
      specialty_id: specialtyId,
      status: useStore.getState().syllabus[key] ?? "none",
    });
  };
  const [open, setOpen] = useState<string | null>(null);

  const coverage = weightedCoverage(state);
  const tally = conditionsTally(state);

  return (
    <div className={s.stack}>
      {/* Two header bars */}
      <Card title="Blueprint coverage">
        <div className={s.row} style={{ marginBottom: 6 }}>
          <span className={s.note}>Confidence-weighted (by exam weight)</span>
          <span className="mono" style={{ color: "var(--retrieval)", fontWeight: 700 }}>{pctLabel(coverage)}</span>
        </div>
        <div className={s.bar}>
          <div className={s.barFill} style={{ width: `${coverage * 100}%`, background: "var(--retrieval)" }} />
        </div>
        <div className={s.row} style={{ margin: "14px 0 6px" }}>
          <span className={s.note}>Conditions covered ({tally.solid} solid)</span>
          <span className="mono" style={{ color: "var(--review)", fontWeight: 700 }}>{tally.covered}/{tally.total}</span>
        </div>
        <div className={s.bar}>
          <div className={s.barFill} style={{ width: `${(tally.covered / tally.total) * 100}%`, background: "var(--review)" }} />
        </div>
      </Card>

      {specialties.map((sp) => {
        const conf = specialtyConfidence(state, sp.id);
        const r = rollup(state, sp.id);
        const isOpen = open === sp.id;
        return (
          <Card key={sp.id} className={c.spCard}>
            <button className={c.spHead} onClick={() => setOpen(isOpen ? null : sp.id)} aria-expanded={isOpen}>
              <div>
                <div className={c.spName}>{sp.name}</div>
                <div className={s.smallprint}>
                  weight {sp.items} · {sp.conditions.length} conditions
                  {r.q > 0 && ` · ${r.q} Q`}
                  {r.acc != null && ` · ${pctLabel(r.acc)}`}
                </div>
              </div>
              <div className={c.spRight}>
                <span className="mono" style={{ color: STATUS_COLOR[conf >= 0.8 ? "solid" : conf > 0 ? "learning" : "none"] }}>
                  {pctLabel(conf)}
                </span>
                <span className={c.chev} style={{ transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
              </div>
            </button>

            {isOpen && (
              <div className={c.conditions}>
                {r.nudge && <p className={`${s.note} ${s.warn}`} style={{ padding: "6px 0" }}>{r.nudge}</p>}
                {sp.conditions.map((cond, i) => {
                  const key = syllabusKey(sp.id, i);
                  const st = state.syllabus[key] ?? "none";
                  return (
                    <button key={key} className={c.condRow} onClick={() => onCycle(key, sp.id)}>
                      <span className={c.dot} style={{ background: STATUS_COLOR[st], opacity: st === "none" ? 0.35 : 1 }} />
                      <span className={c.condName} style={{ color: st === "none" ? "var(--muted)" : "var(--text)" }}>{cond}</span>
                      <span className={c.condStatus} style={{ color: STATUS_COLOR[st] }}>{STATUS_LABEL[st]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      <p className={s.smallprint}>
        These condition lists are a high-yield study checklist aligned to the blueprint —
        not the RACP's copyrighted Knowledge Guides. Item weights are representative, not
        official. The authoritative source is{" "}
        <a className={s.linkOut} href="https://elearning.racp.edu.au/" target="_blank" rel="noreferrer">RACP Online Learning</a>.
        {" "}Pass mark: {exam.passMark.method}, historically ~{exam.passMark.historicalRange[0]}–{exam.passMark.historicalRange[1]}%.
      </p>
    </div>
  );
}
