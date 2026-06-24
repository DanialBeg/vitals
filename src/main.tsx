import React from "react";
import ReactDOM from "react-dom/client";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import App from "./App";
import "./styles/global.css";
import { registerSW } from "virtual:pwa-register";
import { initSync } from "./sync/engine";

// autoUpdate: refresh the shell when a new build is deployed.
registerSW({ immediate: true });

// Product analytics. Only initialises when a project token is configured, so
// local/unconfigured builds stay analytics-free.
const PH_TOKEN = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN as string | undefined;
if (PH_TOKEN) {
  posthog.init(PH_TOKEN, {
    api_host: (import.meta.env.VITE_POSTHOG_HOST as string) || "https://us.i.posthog.com",
    defaults: "2026-05-30",
    person_profiles: "identified_only", // anonymous before sign-in; profiles only for signed-in users
  });
}

// Wire up Supabase sync (no-op if env isn't configured).
initSync();

// Dev-only: `?seed=1` loads sample data for previews. Lazy + DEV-guarded so it
// never reaches a real user session.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("seed")) {
  import("./lib/devSeed").then((m) => m.seed());
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  </React.StrictMode>,
);
