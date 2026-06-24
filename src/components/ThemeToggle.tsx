import { useEffect, useState } from "react";
import { resolvedTheme, setTheme, type Theme } from "../lib/theme";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const [theme, setLocal] = useState<Theme>(() => resolvedTheme());

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  const toggle = () => setLocal((t) => (t === "dark" ? "light" : "dark"));

  return (
    <button
      className={styles.toggle}
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`${theme === "dark" ? "Light" : "Dark"} mode`}
    >
      <span className={`${styles.icon} ${theme === "dark" ? styles.show : ""}`} aria-hidden="true">
        {/* moon */}
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </span>
      <span className={`${styles.icon} ${theme === "light" ? styles.show : ""}`} aria-hidden="true">
        {/* sun */}
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
        </svg>
      </span>
    </button>
  );
}
