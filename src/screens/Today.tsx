import { useState } from "react";
import { Card, Button, ProgressBar, EmptyState } from "../components/ui";
import { VitalReadout } from "../components/VitalReadout";
import { RatioTrace } from "../components/charts/RatioTrace";
import { QuickLog } from "../components/QuickLog";
import { IconCheck } from "../components/icons";
import { useStore } from "../state/store";
import { useNow } from "../lib/useNow";
import { todayISO } from "../lib/date";
import { pct, pctLabel, plural } from "../lib/format";
import { retrievalReading, TARGET_RATIO } from "../derive/retrieval";
import { currentStreak, activeDaysThisWeek } from "../derive/streak";
import { ankiState } from "../derive/anki";
import { questionsToday } from "../derive/hours";
import { dueErrors } from "../derive/errors";
import { focusDomains } from "../derive/coverage";
import { readiness } from "../derive/readiness";
import { specialtyName } from "../content";
import type { LogType } from "../types";
import s from "./screens.module.css";

export function Today({ onGoActivity }: { onGoActivity: () => void }) {
  const now = useNow();
  const today = todayISO(now);
  const state = useStore();
  const setAnkiCleared = useStore((st) => st.setAnkiCleared);

  const [logOpen, setLogOpen] = useState(false);
  const [logType, setLogType] = useState<LogType>("questions");

  const ret = retrievalReading(state, 7, today);
  const streak = currentStreak(state, today);
  const active = activeDaysThisWeek(state, today);
  const anki = ankiState(state, today);
  const goal = questionsToday(state, today);
  const due = dueErrors(state, today);
  const focus = focusDomains(state, 3, today);
  const ready = readiness(state);
  const ankiCleared = state.dailyChecks[today]?.ankiCleared ?? false;

  const openLog = (t: LogType) => {
    setLogType(t);
    setLogOpen(true);
  };

  const ratioColor = ret.inBand ? "var(--retrieval)" : "var(--passive)";

  return (
    <div className={s.stack}>
      {/* SIGNATURE: Retrieval ratio vital — the hero */}
      <Card
        className={s.hero}
        title="Retrieval ratio · 7d"
        right={
          ret.ratio != null && (
            <span className={s.statusPill} style={{ color: ratioColor }}>
              {ret.inBand ? "In band" : "Low"}
            </span>
          )
        }
      >
        {ret.ratio == null ? (
          <EmptyState>
            No effort logged yet this week. Log questions to start the trace —
            even 10 reps beats zero.
          </EmptyState>
        ) : (
          <>
            <VitalReadout
              value={pct(ret.ratio)}
              label="Active retrieval vs input"
              color={ratioColor}
              sub={`Target band ≥ ${pct(TARGET_RATIO)}% · active ${Math.round(ret.activeMin)}m vs input ${Math.round(ret.passiveMin)}m`}
            />
            <div className={s.heroWell}>
              <RatioTrace trace={ret.trace} inBand={ret.inBand} target={TARGET_RATIO} />
            </div>
            <p className={`${s.note} ${ret.inBand ? s.good : s.warn}`} style={{ marginTop: 10 }}>
              {ret.inBand
                ? "Retrieval is leading — this is what moves the score. Keep it here."
                : "Most of your effort this week was input, not retrieval. Shift weight to questions and reviews."}
            </p>
          </>
        )}
      </Card>

      {/* Daily question goal */}
      <Card title="Today's questions">
        <div className={s.row} style={{ marginBottom: 8 }}>
          <span className={`mono ${s.statNum}`} style={{ color: goal.met ? "var(--retrieval)" : "var(--text)" }}>
            {goal.done}
            <span className={s.statLabel} style={{ marginLeft: 6 }}>/ {goal.target}</span>
          </span>
          <span className={s.note}>{goal.met ? "Goal hit ✓" : plural(goal.target - goal.done, "to go")}</span>
        </div>
        <ProgressBar value={goal.done / goal.target} label="Daily question goal" />
      </Card>

      {/* Anki trap */}
      <Card title="Anki">
        <div className={s.statRow} style={{ marginBottom: 12 }}>
          <div className={s.stat}>
            <span className={`mono ${s.statNum}`} style={{ color: "var(--passive)" }}>{anki.cardsMade7d}</span>
            <span className={s.statLabel}>cards made · 7d</span>
          </div>
          <div className={s.stat}>
            <span className={`mono ${s.statNum}`} style={{ color: "var(--review)" }}>{anki.reviews7d}</span>
            <span className={s.statLabel}>reviews done · 7d</span>
          </div>
        </div>
        {anki.message && <p className={`${s.note} ${s.warn}`} style={{ marginBottom: 12 }}>{anki.message}</p>}
        <label className={s.checkRow}>
          <span className={`${s.checkbox} ${ankiCleared ? s.checkboxOn : ""}`}>
            {ankiCleared && <IconCheck />}
          </span>
          <input
            type="checkbox"
            className="visually-hidden"
            checked={ankiCleared}
            onChange={(e) => setAnkiCleared(today, e.target.checked)}
          />
          <span>Cleared today's Anki reviews</span>
        </label>
      </Card>

      {/* Streak */}
      <Card title="Consistency">
        <div className={s.statRow}>
          <div className={s.stat}>
            <span className={`mono ${s.statNum}`} style={{ color: streak > 0 ? "var(--retrieval)" : "var(--muted)" }}>{streak}</span>
            <span className={s.statLabel}>day streak (Q/reviews)</span>
          </div>
          <div className={s.stat}>
            <span className={`mono ${s.statNum}`}>{active.count}<span className={s.statLabel} style={{ marginLeft: 4 }}>/ {active.target}</span></span>
            <span className={s.statLabel}>active days this week</span>
          </div>
        </div>
      </Card>

      {/* Re-attempt due */}
      {due.length > 0 && (
        <Card title="Re-attempt due" right={<span className={`mono ${s.alert}`}>{due.length}</span>}>
          <p className={s.note} style={{ marginBottom: 10 }}>
            Redo these before new questions — twice-seen misses are where the marks hide.
          </p>
          {due.slice(0, 3).map((e) => (
            <div key={e.id} className={s.listItem}>
              <div>
                <div style={{ fontWeight: 600 }}>{specialtyName(e.specialtyId)}</div>
                <div className={s.smallprint}>{e.takeaway}</div>
              </div>
            </div>
          ))}
          <Button variant="ghost" block style={{ marginTop: 10 }} onClick={onGoActivity}>
            Open error log
          </Button>
        </Card>
      )}

      {/* Quick log */}
      <Card title="Quick log">
        <div className={s.quickGrid}>
          <Button variant="primary" onClick={() => openLog("questions")}>+ Questions</Button>
          <Button onClick={() => openLog("review")}>+ Reviews</Button>
          <Button onClick={() => openLog("lecture")}>+ Lecture</Button>
          <Button onClick={() => openLog("cards")}>+ Cards</Button>
        </div>
      </Card>

      {/* Focus domains */}
      <Card title="Focus domains">
        <p className={s.note} style={{ marginBottom: 8 }}>Weakest high-yield areas right now.</p>
        {focus.map((f) => (
          <div key={f.specialtyId} className={s.listItem}>
            <div>
              <div style={{ fontWeight: 600 }}>{f.name}</div>
              <div className={s.smallprint}>{f.reason}</div>
            </div>
            <div className={`mono`} style={{ color: "var(--muted)" }}>
              {pctLabel(f.coverage)}
            </div>
          </div>
        ))}
      </Card>

      {/* Readiness */}
      <Card title="Readiness · steering guide">
        <div className={s.row}>
          <VitalReadout value={String(ready.score)} unit="" label="READINESS" color="var(--review)" />
          <div className={s.smallprint} style={{ maxWidth: 160, textAlign: "right" }}>
            Blends coverage, accuracy & volume. A steering estimate — <b>not</b> a pass prediction.
          </div>
        </div>
      </Card>

      <QuickLog open={logOpen} onClose={() => setLogOpen(false)} initialType={logType} />
    </div>
  );
}
