import { useState } from "react";
import { Button } from "./ui";
import { useSync, retrySync } from "../sync/engine";
import { sendMagicLink, signInWithGoogle, signOut } from "../sync/auth";
import { isSyncConfigured } from "../sync/supabase";
import s from "./AccountScreen.module.css";

const STATUS_LABEL: Record<string, string> = {
  synced: "Synced",
  syncing: "Syncing…",
  offline: "Offline — changes will sync on reconnect",
  error: "Sync error",
  "signed-out": "Not signed in",
  disabled: "Local only",
};
const STATUS_COLOR: Record<string, string> = {
  synced: "var(--retrieval)",
  syncing: "var(--review)",
  offline: "var(--passive)",
  error: "var(--alert)",
  "signed-out": "var(--muted)",
  disabled: "var(--muted)",
};

export function AccountScreen({
  open,
  onClose,
  onDismiss,
}: {
  open: boolean;
  onClose: () => void;
  /** Called when the user closes/skips — marks onboarding complete. */
  onDismiss: () => void;
}) {
  const { status, user, error, lastSyncedAt } = useSync();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  if (!open) return null;

  const close = () => {
    onDismiss();
    onClose();
  };

  const sendEmail = async () => {
    setBusy(true);
    setLocalErr(null);
    const { error } = await sendMagicLink(email.trim());
    setBusy(false);
    if (error) setLocalErr(error);
    else setSent(true);
  };

  const google = async () => {
    setLocalErr(null);
    const { error } = await signInWithGoogle(); // full-page redirect on success
    if (error) setLocalErr(error);
  };

  const initial = (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Account">
      <header className={s.bar}>
        <button className={s.close} onClick={close} aria-label="Close">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span className={s.barTitle}>Account</span>
        <span className={s.spacer} />
      </header>

      <div className={s.body}>
        <div className={s.brand}>
          <span className={s.logoDot} />
          <span className={s.logoText}>Vitals</span>
        </div>

        {/* ---------- SIGNED IN ---------- */}
        {user && (
          <div className={s.card}>
            <div className={s.avatar} aria-hidden="true">{initial}</div>
            <div className={s.email}>{user.email}</div>
            <div className={s.statusRow}>
              <span className={s.statusDot} style={{ background: STATUS_COLOR[status] }} />
              <span style={{ color: STATUS_COLOR[status] }}>{STATUS_LABEL[status] ?? status}</span>
            </div>
            {lastSyncedAt && (
              <div className={s.subtle}>Last synced {new Date(lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
            )}
            {status === "error" && (
              <>
                {error && <div className={s.subtle} style={{ color: "var(--alert)" }}>{error}</div>}
                <Button block onClick={retrySync} style={{ marginTop: 14 }}>Retry sync</Button>
              </>
            )}
            <Button block variant="danger" onClick={() => void signOut()} style={{ marginTop: 10 }}>
              Sign out
            </Button>
            <p className={s.fine}>Signing out keeps all your data on this device — it just stops syncing.</p>
          </div>
        )}

        {/* ---------- SIGNED OUT (login) ---------- */}
        {!user && (
          <div className={s.card}>
            {!isSyncConfigured ? (
              <p className={s.lead}>
                Sync isn't configured on this build, so Vitals runs locally on this device.
                Your data is saved and safe here.
              </p>
            ) : sent ? (
              <>
                <h2 className={s.heading}>Check your email</h2>
                <p className={s.lead}>
                  We sent a sign-in link to <b>{email}</b>. Open it on this device to finish.
                  Links expire — request a new one if it doesn't work.
                </p>
                <button className={s.linkBtn} onClick={() => setSent(false)}>Use a different email</button>
              </>
            ) : (
              <>
                <h2 className={s.heading}>Sync across your devices</h2>
                <p className={s.lead}>
                  Sign in so your progress follows you from phone to laptop. Same account on
                  each device keeps them in sync.
                </p>

                <button className={s.google} onClick={() => void google()}>
                  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                  </svg>
                  Continue with Google
                </button>

                <div className={s.divider}><span>or use email</span></div>

                <input
                  className={s.input}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {localErr && <p className={s.err}>{localErr}</p>}
                <Button block variant="primary" disabled={busy || !email.includes("@")} onClick={() => void sendEmail()} style={{ marginTop: 10 }}>
                  {busy ? "Sending…" : "Email me a sign-in link"}
                </Button>
              </>
            )}

            <button className={s.skip} onClick={close}>
              Continue without an account →
            </button>
          </div>
        )}

        <p className={s.footer}>
          Your data is always saved on this device. Signing in only adds cross-device sync —
          it's never required to use Vitals.
        </p>
      </div>
    </div>
  );
}
