import posthog from "posthog-js";

// Mirrors the guard in main.tsx: analytics only runs when a project token is
// configured, so unconfigured builds make no PostHog calls at all.
const enabled = Boolean(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN);

/**
 * Link subsequent events to a signed-in user. Called from the auth listener so
 * it fires on app load (with an existing session) and right after sign-in.
 */
export function identifyUser(user: { id: string; email: string | null }): void {
  if (!enabled) return;
  posthog.identify(user.id, user.email ? { email: user.email } : undefined);
}

/**
 * Unlink future events from the previous user on sign-out, so a shared device
 * doesn't merge two people into one profile.
 */
export function resetAnalytics(): void {
  if (!enabled) return;
  posthog.reset();
}
