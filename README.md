# Vitals

An installable, offline-first PWA that holds a junior doctor accountable while
they study for the **RACP Adult Medicine Divisional Written Exam (DWE)**, sitting
**9 February 2027**.

It is **not** a syllabus viewer. Its job is to confront one specific failure mode —
effort pooling in *passive* work (watching lectures, making Anki cards) and leaking out
of *active retrieval* (doing questions, reviewing cards) — and to **reliably remember
progress** across devices. The signature UI is a bedside-monitor **Retrieval Ratio**
vital sign.

> Setup, Supabase, and deploy instructions live in **[SETUP.md](./SETUP.md)**.
> The product spec is in **[BRIEF.md](./BRIEF.md)**; the build plan in **[PLAN.md](./PLAN.md)**.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173  (works with no .env — "Local" mode)
npm test           # 28 unit + render tests
npm run build      # static site → ./dist
```

---

## Architecture

```
content.json (typed, bundled) ─► derive/* (pure selectors) ─► React screens
                                       ▲
AppState ── Zustand + persist ──► localStorage (working copy, drives all UI)
   │  every mutation stamps updatedAt
   ▼
sync/engine ─ debounce 1.5s ─► outbox ─(online)─► Supabase upsert (one JSONB row/user)
   ▲                                                    │
   └──────── reconcile + field-aware merge on login ◄───┘
```

- **Static SPA**: Vite + React + TypeScript. No backend of our own; Supabase is the only
  network dependency and it's optional.
- **PWA**: `vite-plugin-pwa` (Workbox `generateSW`, `autoUpdate`) precaches the whole app
  shell. `content.json` is bundled into the JS, so the app is **offline by construction** —
  no runtime CDN requests (fonts are self-hosted via `@fontsource`, charts are hand-rolled
  SVG).
- **State**: a single `AppState` document in a Zustand store, persisted to `localStorage`
  through a **resilient storage wrapper** that falls back to memory (Safari private mode /
  non-browser envs never throw).
- **All metrics are derived**, never stored — see `src/derive/`. Nothing that can be
  computed from the log is persisted.

### How sync works

Local is always the source of truth for the UI; the network never blocks a render.

1. **Edit** → store mutates → persisted immediately → UI updates → a debounced (~1.5s)
   `upsert` pushes the whole document to Supabase. Offline, the push is marked pending and
   flushed on the `online` event.
2. **Login / reconnect** → pull the remote row → **reconcile** with local → write the merged
   result back both ways.
3. **Merge** (`src/sync/merge.ts`): whole-document last-write-wins by `updatedAt` as the
   baseline, **plus** a cheap field-aware pass so an offline edit on one device can't
   silently clobber the other — `log` and `errors` are unioned by `id` (per-entity LWW),
   `dailyChecks`/`syllabus` unioned by key. This is the one intentional refinement over the
   brief's plain whole-doc LWW (flagged and approved in PLAN.md §1).

Security: one row per user in `public.vitals_state`, protected by Row Level Security so a
user can only touch their own row. The anon key is public by design.

### No data loss on schema change

`AppState.schemaVersion` + an ordered migration pipeline (`src/state/migrations.ts`) runs on
**every** load path — localStorage rehydrate, JSON import, and remote pull — filling
defaults for new fields without dropping unknown data. Bumping the schema upgrades existing
logs rather than wiping them.

### Backup

`Activity → Export data` downloads the full state as `vitals-backup-YYYY-MM-DD.json`.
`Import data` parses it through the same migration pipeline and replaces local state after a
confirm. Entirely independent of sync.

---

## Data model

One JSON document per user (`src/types.ts`):

| Field | Purpose |
|---|---|
| `profile` | exam date, daily question target, study days/week |
| `log[]` | every session: `{ type, count, correct?, minutes?, specialtyId?, date }` |
| `syllabus` | `Record<"${specialtyId}:${conditionIndex}", "none"\|"learning"\|"solid">` |
| `errors[]` | error log entries with `reattemptDate`, `resolved`, `missedAgain` |
| `dailyChecks` | per-day flags (e.g. Anki reviews cleared) |
| `phaseChecks` | per-phase checklist ticks (additive field, supports the Plan screen) |
| `schemaVersion`, `updatedAt` | migration + sync bookkeeping |

### Derived metrics (`src/derive/`, all unit-tested)

- **Retrieval ratio** — active (questions+reviews) ÷ total effort over 7 days, in
  *effort-minutes* (explicit `minutes`, else a per-type estimate), target band ≥ 60%.
- **Streak** — consecutive days with questions/reviews; passive activity doesn't count;
  grace so an empty *today* doesn't break it mid-day.
- **Accuracy** — rolling 7-day, overall, 30-day trend, and by-domain (weak areas surface).
- **Coverage** — confidence-weighted by `items` (none=0/learning=0.5/solid=1) and a raw
  conditions-covered tally.
- **Focus domains**, **Anki trap**, **readiness** (a steering estimate, *not* a pass
  prediction), **weekly recap** with week-over-week deltas, **phase date-ranges**.

---

## Extending the syllabus / content

`content.json` (repo root) is the **single source of truth** for the blueprint. To add or
edit content, change it there only:

- **A condition**: add a string to a specialty's `conditions` array. Ticks are keyed by
  *index*, so append at the end (don't reorder) to preserve existing ticks across an update.
- **A specialty**: add an object with `id`, `name`, `items` (blueprint weight), `conditions`.
  Coverage maths and focus-domain picking pick it up automatically.
- **Phases / error types**: edit the `phases` / `errorTypes` arrays.

It is imported and typed in `src/content.ts` and bundled at build time. Condition lists are a
high-yield checklist, **not** the RACP's copyrighted Knowledge Guides — the app links out to
RACP Online Learning as the authoritative source, and item weights are representative.

---

## Project layout

```
src/
  content.ts          typed content.json (single source of truth)
  types.ts            AppState + content types
  state/              store (Zustand+persist), defaults, migrations
  sync/               supabase client, magic-link auth, engine, merge
  derive/             all metric maths (pure, tested)
  lib/                date, format, export/import, useNow
  components/         VitalReadout, charts (SVG), QuickLog, ErrorLog, WeeklyRecap, ui/
  screens/            Today, Plan, Syllabus, Activity
  styles/             tokens.css (design tokens), global.css
scripts/gen-icons.mjs generates app icons (no deps)
```

---

## Known limitations (honest by design)

- **No OS push notifications** — a web app can't fire them. The evening reminder is
  **in-app only** (a banner after 17:00 if the question target isn't met).
- **Readiness** is a steering estimate, not a pass prediction.
- Cross-device sync and magic-link auth require a Supabase project + deployed origin to
  verify end-to-end (see SETUP.md). The merge/offline logic is unit-tested locally.
