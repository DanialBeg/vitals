import { useRef, useState } from "react";
import { Card, Button, EmptyState } from "../components/ui";
import { TrendChart } from "../components/charts/TrendChart";
import { ErrorLog } from "../components/ErrorLog";
import { WeeklyRecap } from "../components/WeeklyRecap";
import { useStore } from "../state/store";
import { exam } from "../content";
import { exportState, parseImport } from "../lib/exportImport";
import { rollingAccuracy, overallAccuracy, accuracyTrend, accuracyByDomain, totalQuestions } from "../derive/accuracy";
import { studyMinutes } from "../derive/hours";
import { pctLabel, hours } from "../lib/format";
import s from "./screens.module.css";
import a from "./Activity.module.css";

export function Activity() {
  const state = useStore();
  const replaceState = useStore((st) => st.replaceState);
  const snapshot = useStore((st) => st.snapshot);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const rolling = rollingAccuracy(state);
  const overall = overallAccuracy(state);
  const trend = accuracyTrend(state, 30);
  const byDomain = accuracyByDomain(state);
  const mins = studyMinutes(state);
  const totalQ = totalQuestions(state);
  const ref = exam.passMark.referenceLine / 100;

  const onImport = async (file: File) => {
    try {
      const next = await parseImport(file);
      if (confirm("Import will replace your current data on this device. Continue?")) {
        replaceState(next);
        setImportMsg("Imported successfully.");
      }
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Import failed.");
    }
  };

  return (
    <div className={s.stack}>
      <WeeklyRecap />

      {/* Question log + rolling accuracy */}
      <Card title="Questions & accuracy">
        <div className={s.statRow} style={{ marginBottom: 14 }}>
          <div className={s.stat}>
            <span className={`mono ${s.statNum}`}>{totalQ}</span>
            <span className={s.statLabel}>questions all-time</span>
          </div>
          <div className={s.stat}>
            <span className={`mono ${s.statNum}`} style={{ color: (overall.acc ?? 0) >= ref ? "var(--retrieval)" : "var(--passive)" }}>
              {pctLabel(overall.acc)}
            </span>
            <span className={s.statLabel}>overall accuracy</span>
          </div>
        </div>
        <div className={s.note} style={{ marginBottom: 8 }}>Last 7 days: {pctLabel(rolling.acc)} ({rolling.attempted} Q)</div>
        <TrendChart points={trend} referenceLine={ref} />
      </Card>

      {/* Accuracy by domain */}
      <Card title="Accuracy by domain">
        {byDomain.length === 0 ? (
          <EmptyState>Tag questions with a topic to see weak areas surface here.</EmptyState>
        ) : (
          byDomain.map((d) => (
            <div key={d.specialtyId} className={a.domainRow}>
              <div className={a.domainName}>
                {d.name}
                {d.provisional && <span className={s.smallprint}> · low N</span>}
              </div>
              <div className={a.domainBar}>
                <div
                  className={s.barFill}
                  style={{
                    width: `${(d.acc ?? 0) * 100}%`,
                    background: (d.acc ?? 0) >= ref ? "var(--retrieval)" : "var(--alert)",
                  }}
                />
              </div>
              <div className={`mono ${a.domainPct}`}>{pctLabel(d.acc)}</div>
            </div>
          ))
        )}
      </Card>

      {/* Hours */}
      <Card title="Hours studied">
        <div className={s.statRow}>
          <div className={s.stat}>
            <span className={`mono ${s.statNum}`}>{hours(mins.total)}</span>
            <span className={s.statLabel}>total hours</span>
          </div>
          <div className={s.stat}>
            <span className={`mono ${s.statNum}`}>{hours(mins.thisWeek)}</span>
            <span className={s.statLabel}>this week</span>
          </div>
        </div>
        {mins.total === 0 && <p className={s.smallprint} style={{ marginTop: 10 }}>Add minutes when you log to track hours.</p>}
      </Card>

      <ErrorLog />

      {/* Export / Import */}
      <Card title="Backup">
        <p className={s.note} style={{ marginBottom: 12 }}>
          A local JSON backup, independent of sync. Belt and braces.
        </p>
        <div className={s.quickGrid}>
          <Button onClick={() => exportState(snapshot())}>Export data</Button>
          <Button onClick={() => fileRef.current?.click()}>Import data</Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = "";
          }}
        />
        {importMsg && <p className={s.note} style={{ marginTop: 10 }}>{importMsg}</p>}
      </Card>
    </div>
  );
}
