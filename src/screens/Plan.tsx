import { usePostHog } from "@posthog/react";
import { Card } from "../components/ui";
import { IconCheck } from "../components/icons";
import { useStore } from "../state/store";
import { todayISO, formatShort } from "../lib/date";
import { phaseSpans } from "../derive/phases";
import { exam } from "../content";
import s from "./screens.module.css";
import p from "./Plan.module.css";

export function Plan() {
  const posthog = usePostHog();
  const state = useStore();
  const setPhaseCheck = useStore((st) => st.setPhaseCheck);
  const today = todayISO();
  const spans = phaseSpans(state, today);

  return (
    <div className={s.stack}>
      <Card title="Study plan">
        <p className={s.note}>
          Four phases mapped to real dates from today to the sitting on{" "}
          <b>{exam.sittingLabel}</b>. {exam.context}
        </p>
      </Card>

      {spans.map((span) => {
        const pctOfPlan = Math.round(span.fraction * 100);
        return (
          <Card
            key={span.id}
            className={span.current ? p.current : undefined}
            title={
              <span className={p.phaseHead}>
                {span.name}
                {span.current && <span className={p.nowTag}>NOW</span>}
              </span>
            }
            right={<span className="mono" style={{ color: "var(--muted)" }}>{pctOfPlan}%</span>}
          >
            <div className={s.smallprint} style={{ marginBottom: 8 }}>
              {formatShort(span.start)} – {formatShort(span.end)}
            </div>
            <p className={s.note} style={{ marginBottom: 12 }}>{span.blurb}</p>
            {span.checklist.map((item, i) => {
              const key = `${span.id}:${i}`;
              const checked = state.phaseChecks[key] ?? false;
              return (
                <label key={key} className={s.checkRow}>
                  <span className={`${s.checkbox} ${checked ? s.checkboxOn : ""}`}>
                    {checked && <IconCheck />}
                  </span>
                  <input
                    type="checkbox"
                    className="visually-hidden"
                    checked={checked}
                    onChange={(e) => {
                      setPhaseCheck(key, e.target.checked);
                      posthog?.capture("plan_checklist_item_toggled", {
                        phase_id: span.id,
                        checked: e.target.checked,
                      });
                    }}
                  />
                  <span style={{ textDecoration: checked ? "line-through" : "none", color: checked ? "var(--muted)" : "var(--text)" }}>
                    {item}
                  </span>
                </label>
              );
            })}
          </Card>
        );
      })}

      <Card title="Pacing">
        <p className={s.note}>
          RACP guidance: most successful candidates start <b>~12 months out</b> with at
          least <b>6 months</b> of concentrated study. Front-load coverage, then let
          questions lead.
        </p>
      </Card>
    </div>
  );
}
