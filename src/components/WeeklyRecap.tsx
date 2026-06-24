import { Card } from "./ui";
import { useStore } from "../state/store";
import { weeklyRecap } from "../derive/recap";
import { formatShort } from "../lib/date";
import { pctLabel, trend, hours } from "../lib/format";
import s from "../screens/screens.module.css";
import r from "./WeeklyRecap.module.css";

export function WeeklyRecap() {
  const state = useStore();
  const w = weeklyRecap(state);
  const qd = trend(w.deltaQuestions);

  return (
    <Card className={r.panel} title="Weekly recap" right={<span className={s.smallprint}>{formatShort(w.start)}–{formatShort(w.end)}</span>}>
      <div className={r.grid}>
        <Metric label="Questions" value={String(w.this.questions)} delta={qd.glyph} tone={qd.tone} />
        <Metric
          label="Accuracy"
          value={pctLabel(w.this.acc)}
          delta={w.deltaAccPts == null ? "—" : `${w.deltaAccPts >= 0 ? "▲" : "▼"} ${Math.abs(w.deltaAccPts)}pt`}
          tone={w.deltaAccPts == null ? "flat" : w.deltaAccPts >= 0 ? "up" : "down"}
        />
        <Metric label="Active days" value={`${w.this.activeDays}/${w.activeTarget}`} />
        <Metric label="Retrieval" value={pctLabel(w.retrievalRatio)} />
        <Metric label="Lect / Cards / Rev" value={`${w.this.lectures}/${w.this.cards}/${w.this.reviews}`} />
        <Metric label="Hours" value={hours(w.this.minutes)} />
        <Metric label="Coverage" value={pctLabel(w.coverage)} />
        <Metric label="Errors (log/due)" value={`${w.errorsLogged}/${w.errorsDue}`} />
      </div>

      <div className={r.next}>
        <span className={s.statLabel}>Next week</span>
        <span>{w.nextWeekFocus ? `Push ${w.nextWeekFocus}` : "Keep questions leading"}</span>
      </div>

      <div className={r.foot}>
        {w.stream} · {w.daysToExam} days to the DWE · {w.conditions.covered}/{w.conditions.total} conditions
      </div>
    </Card>
  );
}

function Metric({ label, value, delta, tone }: { label: string; value: string; delta?: string; tone?: "up" | "down" | "flat" }) {
  const color = tone === "up" ? "var(--retrieval)" : tone === "down" ? "var(--alert)" : "var(--muted)";
  return (
    <div className={r.metric}>
      <div className={s.statLabel}>{label}</div>
      <div className={`mono ${r.metricVal}`}>
        {value}
        {delta && <span className={r.delta} style={{ color }}>{delta}</span>}
      </div>
    </div>
  );
}
