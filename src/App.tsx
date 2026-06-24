import { useState } from "react";
import css from "./App.module.css";
import { Today } from "./screens/Today";
import { Plan } from "./screens/Plan";
import { Syllabus } from "./screens/Syllabus";
import { Activity } from "./screens/Activity";
import { ReminderBanner } from "./components/ReminderBanner";
import { SyncBadge } from "./components/SyncBadge";
import { ThemeToggle } from "./components/ThemeToggle";
import { AuthSheet } from "./components/AuthSheet";
import { IconToday, IconPlan, IconSyllabus, IconActivity } from "./components/icons";
import { useStore } from "./state/store";
import { useNow } from "./lib/useNow";
import { todayISO } from "./lib/date";
import { daysToExam } from "./derive/phases";
import { retrievalReading } from "./derive/retrieval";
import { dueErrors } from "./derive/errors";

type Tab = "today" | "plan" | "syllabus" | "activity";

const TABS: { id: Tab; label: string; Icon: (p: { className?: string }) => JSX.Element }[] = [
  { id: "today", label: "Today", Icon: IconToday },
  { id: "plan", label: "Plan", Icon: IconPlan },
  { id: "syllabus", label: "Syllabus", Icon: IconSyllabus },
  { id: "activity", label: "Activity", Icon: IconActivity },
];

const VALID_TABS: Tab[] = ["today", "plan", "syllabus", "activity"];
function initialTab(): Tab {
  const t = new URLSearchParams(location.search).get("tab") as Tab | null;
  return t && VALID_TABS.includes(t) ? t : "today";
}

export default function App() {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [authOpen, setAuthOpen] = useState(false);
  const now = useNow();
  const state = useStore();
  const today = todayISO(now);
  const days = daysToExam(state, today);

  // The live dot encodes the worst active condition by colour.
  const ret = retrievalReading(state, 7, today);
  const overdue = dueErrors(state, today).length;
  const dotColor =
    overdue > 0 ? "var(--alert)" : ret.ratio != null && !ret.inBand ? "var(--passive)" : "var(--accent)";

  return (
    <div className={css.app}>
      <header className={css.statusbar}>
        <div className={css.statusLeft}>
          <span className={css.liveDot} style={{ background: dotColor, color: dotColor }} />
          <span className={css.wordmark}>Vitals</span>
          <span className={css.streamTag}>Adult Med</span>
        </div>
        <div className={css.statusRight}>
          <div className={`mono ${css.miniReadout}`} title="Days to the DWE">
            <span className={css.miniNum}>{days}</span>
            <span className={css.miniUnit}>d</span>
            <span className={css.miniLabel}>DWE</span>
          </div>
          <ThemeToggle />
          <SyncBadge onClick={() => setAuthOpen(true)} />
        </div>
      </header>

      <div className={css.bannerWrap}>
        <ReminderBanner />
      </div>

      <main className={css.content} key={tab}>
        {tab === "today" && <Today onGoActivity={() => setTab("activity")} />}
        {tab === "plan" && <Plan />}
        {tab === "syllabus" && <Syllabus />}
        {tab === "activity" && <Activity />}
      </main>

      <nav className={css.tabbar} aria-label="Primary">
        <div className={css.tabInner}>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`${css.tab} ${tab === id ? css.tabActive : ""}`}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
