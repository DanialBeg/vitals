import { useState } from "react";
import { Sheet, Button } from "./ui";
import { useSync, retrySync } from "../sync/engine";
import { sendMagicLink, signInWithGoogle, signOut } from "../sync/auth";
import { isSyncConfigured } from "../sync/supabase";
import s from "../screens/screens.module.css";
import a from "./AuthSheet.module.css";

export function AuthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { status, user, error, lastSyncedAt } = useSync();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setLocalErr(null);
    const { error } = await sendMagicLink(email.trim());
    setBusy(false);
    if (error) setLocalErr(error);
    else setSent(true);
  };

  const google = async () => {
    setLocalErr(null);
    const { error } = await signInWithGoogle(); // redirects away on success
    if (error) setLocalErr(error);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Sync across devices">
      {!isSyncConfigured && (
        <p className={s.note}>
          Sync isn't configured on this build. The app works fully offline and your
          data is saved on this device. Add Supabase keys (see SETUP.md) to enable
          cross-device sync.
        </p>
      )}

      {isSyncConfigured && user && (
        <div className={s.stack}>
          <p className={s.note}>
            Signed in as <b>{user.email}</b>. Status: <b style={{ color: "var(--retrieval)" }}>{status}</b>
            {lastSyncedAt && <> · last synced {new Date(lastSyncedAt).toLocaleTimeString()}</>}.
          </p>
          {status === "error" && <p className={`${s.note} ${s.alert}`}>{error} — <button className={a.link} onClick={retrySync}>retry</button></p>}
          <Button block onClick={() => void signOut()}>Sign out (keeps local data)</Button>
        </div>
      )}

      {isSyncConfigured && !user && (
        <div className={s.stack}>
          {sent ? (
            <p className={s.note}>
              Check <b>{email}</b> for a magic link. Tap it on this device to finish
              signing in. The link expires after a while — if it doesn't work, request a
              new one.
              <br />
              <button className={a.link} onClick={() => setSent(false)}>Use a different email</button>
            </p>
          ) : (
            <>
              <p className={s.note}>
                Sign in to sync your progress across devices. Use the same account on
                your phone and laptop to keep them in sync.
              </p>

              <button className={a.google} onClick={() => void google()}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                </svg>
                Continue with Google
              </button>

              <div className={a.divider}><span>or use email</span></div>

              <input
                className={a.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {localErr && <p className={`${s.note} ${s.alert}`}>{localErr}</p>}
              <Button variant="primary" block disabled={busy || !email.includes("@")} onClick={() => void send()}>
                {busy ? "Sending…" : "Send magic link"}
              </Button>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
