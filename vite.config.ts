import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Bedside-monitor theming for the install/splash chrome.
const THEME = "#0E1419";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png", "favicon.svg"],
      manifest: {
        name: "Vitals — DWE study monitor",
        short_name: "Vitals",
        description:
          "A study accountability monitor for the RACP Adult Medicine Divisional Written Exam.",
        theme_color: THEME,
        background_color: THEME,
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the whole built app shell so it runs with no network after first load.
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2,ico}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    target: "es2020",
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: "node",
  },
});
