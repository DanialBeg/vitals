import { supabase, isSyncConfigured } from "./supabase";
import type { Session } from "@supabase/supabase-js";

export type AuthUser = { id: string; email: string | null };

/** Send a passwordless magic link to the given email. */
export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Sync isn't configured on this build." };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  return { error: error?.message ?? null };
}

/** Sign in with Google (full-page OAuth redirect; returns to the app). */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Sync isn't configured on this build." };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return toUser(data.session);
}

function toUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email ?? null };
}

/** Subscribe to auth changes. Returns an unsubscribe fn. */
export function onAuthChange(cb: (user: AuthUser | null) => void): () => void {
  if (!supabase) {
    cb(null);
    return () => {};
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(toUser(session));
  });
  return () => data.subscription.unsubscribe();
}

export { isSyncConfigured };
