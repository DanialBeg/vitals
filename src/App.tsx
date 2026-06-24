import { useState } from "react";
import css from "./App.module.css";
import { Today } from "./screens/Today";
import { Plan } from "./screens/Plan";
import { Syllabus } from "./screens/Syllabus";
import { Activity } from "./screens/Activity";
import { ReminderBanner } from "./components/ReminderBanner";
import { SyncBadge } from "./components/SyncBadge";
import { ThemeToggle } from "./components/ThemeToggle";
import { AccountScreen } from "./components/AccountScreen";
import { IconToday, IconPlan, IconSyllabus, IconActivity } from "./components/icons";
import { useStore } from "./state/store";
import { useSync } from "./sync/engine";
import { isSyncConfigured } from "./sync/supabase";
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
  const [accountOpen, setAccountOpen] = useState(false);
  const authUser = useSync((st) => st.user);
  const authReady = useSync((st) => st.ready);
  const now = useNow();
  const state = useStore();
  const today = todayISO(now);
  const days = daysToExam(state, today);

  // Sign-in is required when sync is configured. Wait for the initial session
  // so returning users don't flash the login screen.
  const authLoading = isSyncConfigured && !authReady;
  const showGate = isSyncConfigured && authReady && !authUser;

  // The live dot encodes the worst active condition by colour.
  const ret = retrievalReading(state, 7, today);
  const overdue = dueErrors(state, today).length;
  const dotColor =
    overdue > 0 ? "var(--alert)" : ret.ratio != null && !ret.inBand ? "var(--passive)" : "var(--accent)";

  if (authLoading) {
    return (
      <div className={css.splash}>
        <span className={css.splashDot} />
        <span className={css.splashWord}>Vitals</span>
      </div>
    );
  }

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
          {authUser ? (
            <button
              className={css.avatarBtn}
              onClick={() => setAccountOpen(true)}
              aria-label="Account"
              title={authUser.email ?? "Account"}
            >
              {(authUser.email?.[0] ?? "?").toUpperCase()}
            </button>
          ) : (
            <SyncBadge onClick={() => setAccountOpen(true)} />
          )}
        </div>
      </header>

      {/* Desktop side nav (hidden on mobile). */}
      <aside className={css.sidebar} aria-label="Primary">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`${css.navItem} ${tab === id ? css.navItemActive : ""}`}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </aside>

      <div className={css.mainCol}>
        <div className={css.bannerWrap}>
          <ReminderBanner />
        </div>

        <main className={css.content} key={tab}>
          {tab === "today" && <Today onGoActivity={() => setTab("activity")} />}
          {tab === "plan" && <Plan />}
          {tab === "syllabus" && <Syllabus />}
          {tab === "activity" && <Activity />}
        </main>
      </div>

      {/* Mobile bottom tab bar (hidden on desktop). */}
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

      <AccountScreen
        open={showGate || accountOpen}
        dismissable={!!authUser}
        onClose={() => setAccountOpen(false)}
      />
    </div>
  );
}
