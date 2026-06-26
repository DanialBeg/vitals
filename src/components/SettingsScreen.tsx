import { usePostHog } from "@posthog/react";
import { useStore } from "../state/store";
import { NumberStepper } from "./NumberStepper";
import { todayISO, formatShort, daysBetween } from "../lib/date";
import { exam } from "../content";
import s from "./SettingsScreen.module.css";

export function SettingsScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  const posthog = usePostHog();
  const profile = useStore((st) => st.profile);
  const updateProfile = useStore((st) => st.updateProfile);

  if (!open) return null;

  const set = (patch: Partial<typeof profile>, field: string) => {
    updateProfile(patch);
    posthog?.capture("settings_updated", { field });
  };

  const days = Math.max(0, daysBetween(todayISO(), profile.examDate));

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Settings">
      <header className={s.bar}>
        <button className={s.close} onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span className={s.barTitle}>Settings</span>
        <span className={s.spacer} />
      </header>

      <div className={s.body}>
        {/* Exam */}
        <section className={s.card}>
          <h2 className={s.cardTitle}>Exam</h2>
          <label className={s.field}>
            <span className={s.label}>Exam date</span>
            <input
              className={s.dateInput}
              type="date"
              value={profile.examDate}
              min={todayISO()}
              onChange={(e) => e.target.value && set({ examDate: e.target.value }, "examDate")}
            />
          </label>
          <p className={s.hint}>
            {days} days away · {formatShort(profile.examDate)}. Default for the {exam.stream}{" "}
            {exam.name} is {exam.sittingLabel}.
          </p>
        </section>

        {/* Targets */}
        <section className={s.card}>
          <h2 className={s.cardTitle}>Daily targets</h2>
          <div className={s.field}>
            <span className={s.label}>Daily question goal</span>
            <NumberStepper
              value={profile.dailyQuestionTarget}
              min={1}
              max={500}
              step={5}
              ariaLabel="Daily question goal"
              onChange={(v) => set({ dailyQuestionTarget: v === "" ? 1 : v }, "dailyQuestionTarget")}
            />
          </div>
          <div className={s.field}>
            <span className={s.label}>Study days / week</span>
            <NumberStepper
              value={profile.studyDaysPerWeek}
              min={1}
              max={7}
              ariaLabel="Study days per week"
              onChange={(v) => set({ studyDaysPerWeek: v === "" ? 1 : v }, "studyDaysPerWeek")}
            />
          </div>
          <p className={s.hint}>
            Your goal drives the daily progress bar and streak; study days set the weekly
            active-days target.
          </p>
        </section>

        <p className={s.footer}>Changes save instantly and sync to every device you sign in to.</p>
      </div>
    </div>
  );
}
