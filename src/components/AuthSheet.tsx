import { useState } from "react";
import { Sheet, Button } from "./ui";
import { useSync, retrySync } from "../sync/engine";
import { sendMagicLink, signOut } from "../sync/auth";
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
                Enter your email and we'll send a one-tap magic link — no password. Sign in
                with the same email on each device to keep them in sync.
              </p>
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
