// Tracks whether the first-run welcome/login screen has been shown. Defaults to
// "welcomed" if storage is unavailable, so we never trap the user on a screen.
const KEY = "vitals.welcomed";

export function isWelcomed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function setWelcomed(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}
