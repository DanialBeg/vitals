import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import { registerSW } from "virtual:pwa-register";
import { initSync } from "./sync/engine";

// autoUpdate: refresh the shell when a new build is deployed.
registerSW({ immediate: true });

// Wire up Supabase sync (no-op if env isn't configured).
initSync();

// Dev-only: `?seed=1` loads sample data for previews. Lazy + DEV-guarded so it
// never reaches a real user session.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("seed")) {
  import("./lib/devSeed").then((m) => m.seed());
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
