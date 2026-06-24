// Light/dark theme: explicit user choice persisted, otherwise follow the OS.
export type Theme = "light" | "dark";
const KEY = "vitals.theme";

export function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function urlTheme(): Theme | null {
  const v = new URLSearchParams(location.search).get("theme");
  return v === "light" || v === "dark" ? v : null;
}

export function resolvedTheme(): Theme {
  return urlTheme() ?? storedTheme() ?? systemTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#06090f" : "#e7edf3");
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}
