---
gsd_state_version: "1.0"
current_phase: 1
current_phase_name: Toolchain Gate
status: executing
stopped_at: Completed 01-01 (baselines + pinned svelte-check + output-window pixel gate)
last_updated: "2026-10-17T23:35:00.000Z"
last_activity: 2026-10-17
last_activity_desc: "01-01 complete: test:svelte pinned to its real tsconfig (2244 files/338 errors), five pre-upgrade baselines + RELEASE-SMOKE.md + COVERAGE.md recorded, 1920x1080 output-window pixel gate shipped and observed failing (27,544 px) before being trusted"
state_head: fdc2ec5e
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 5
  completed_plans: 1
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-17)

**Core value:** The show must not fail — during a live service the operator must be able to get lyrics, scripture, and media onto the output displays reliably and instantly, with no visible interruption.
**Current focus:** Phase 1 — Toolchain Gate (Svelte 5 legacy mode + Vite 7 + TypeScript 5.9)

## Current Position

Phase: 1 (Toolchain Gate) — EXECUTING
Plan: 1 of 5 in current phase (01-01 complete)
Status: In progress
Last activity: 2026-10-17 — Completed 01-01: pinned `test:svelte`, recorded five pre-upgrade baselines, shipped the output-window pixel gate with a committed 1920x1080 baseline

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**

- Total plans completed: 1
- Average duration: 31 min
- Total execution time: 31 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-toolchain-gate | 1 | 31 min | 31 min |

**Recent Trend:**

- Last 5 plans: 01-01 (31 min)
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap] Svelte 5 in legacy mode, not the Svelte 4 legacy shadcn line — the toolchain gate is its own phase (P1) with zero component-syntax rewrites, ending on a packaged cross-OS smoke test and an output-window pixel-diff gate
- [Roadmap] Omit Tailwind Preflight and scope everything to `[data-ds="v2"]` (P2) — main, output/projector, export and capture windows share one `bundle.css`, so any global CSS is an on-air regression risk
- [Roadmap] Freeze legacy token names and bridge via `@theme inline` to a new semantic namespace (P2) — `--primary`/`--secondary`/`--accent` collide with shadcn's names under inverted meanings across ~1,318 `var()` reads
- [Roadmap] Settings IA (P3) precedes the primitive layer (P4) and the surface revamp (P5) — tab ids are simultaneously translation keys, profile permission keys and deep-link state, and consolidation moves tab files
- [Roadmap] Accessibility lands as primitives hooks (P4) plus a dedicated verification phase (P6) — Bits UI is the strategy; the phase is evidence, not aspiration
- [Roadmap] Bundle budget is established in P2 and tracked through P7 — the renderer is one library-mode IIFE bundle with no code splitting, shared with every output window
- [Autonomous] UI-SPEC generation scoped to Phases 4 and 5 only. The `ui-plan-gate` returns `frontend: true` for every phase because it matches the word "component" in the ROADMAP goals — a false positive. P1 is a toolchain upgrade with zero visual change; P2's acceptance test is literally "nothing changed", so a design contract there would contradict the phase. P3 is structural (no styling), P6 is verification, P7 is docs. P4 (primitive layer) and P5 (Settings revamp) do get UI-SPECs.
- [01-01] `test:svelte` is pinned to `svelte-check --tsconfig config/typescript/tsconfig.svelte.json`. There is no root `tsconfig.json`/`jsconfig.json`, and svelte-check's no-flag behaviour is an upwards traversal that found nothing — so the old bare command reported a near-clean result over a partially-resolved tree. The real baseline is **2244 FILES / 338 ERRORS / 47 WARNINGS / 598 HINTS**; a later near-zero count means the invocation broke, not that the code improved.
- [01-01] The Svelte lint job is **not inert** today: 464 files, 167 errors, 39 warnings, and all 39 are Svelte compiler a11y diagnostics surfaced by the `eslint-plugin-svelte3` processor (kebab-case rule ids; zero ids under the literal `svelte3/` namespace). Plan 01-02's flat-config parity claim is measured against this: it must keep surfacing the same compiler diagnostics via an explicit `svelte/valid-compile`.
- [01-01] The output window's DOM hook is the **class token** `#output_window` (`class="fill context #output_window"` — the `#` is FreeShow's context-menu target convention), not an id. Selectors must accept the class form; `document.querySelector("#output_window")` matches nothing.
- [01-01] The pixel gate's only capture path is `--update-snapshots=all` (a bare `--update-snapshots` sets mode `"changed"`, so the platform guard would skip the capture run). Baselines are per-OS; an unbaselined platform skips with a recorded reason and can never write its own baseline or lean on `retries`.
- [01-01] The pixel gate requires a production build to run (`NODE_ENV=production` → `loadFile("public/index.html")` → `./build/bundle.js`), and `node scripts/cleanBuilds.js` must follow. The spec cannot run in the same instant as the "index.html is clean" assertion — build, run, then restore and assert.
- [01-01] Deliberately untouched: `config/building/rollup.config.mjs` (dead code, zero references outside AGENTS.md) and `src/server/cam/main.ts` (the fifth `new App(` site, no build path; plan 01-03 updates it for grep-cleanliness only). `ci.yml` still has exactly **two** `continue-on-error: true` entries — flipping either is a CI-behaviour change and stays out of scope for Phase 1.

### Pending Todos

None yet.

### Blockers/Concerns

- [Roadmap] `REQUIREMENTS.md` v1 scope is **32** requirements (not 33) — the eight `A11Y-01`…`A11Y-08` ids contain digits and were missed by the original tally. Traceability records 32/32; resolved.
- [Phase 1] Highest-uncertainty phase: seven open toolchain questions (`eslint-plugin-svelte@3` against the eslintrc config, Vite 7 × the IIFE `build.lib` output, Terser `mangle.toplevel` × Svelte 5 output, the `verbatimModuleSyntax` tsconfig requirement, legacy↔runes interop). No automated safety net exists — the release smoke checklist must stand up before the first commit.
- [Phase 2] `@theme inline` may still emit a `:root` block; confirm in the built CSS what lands on `:root` and that it changes nothing in an output window. This is the single most important item to verify before Phase 4.
- [Phase 2] Tailwind's native engine (`@tailwindcss/oxide`) vs. `npm ci`, CI matrices and emulated cross-builds — keep it in devDependencies, pin the lockfile, assert a known class exists in the built CSS.
- [Phase 4] Icon-system fork unresolved: Lucide inside `components/ui/**` only (recommended, with a mapping table) vs. mapping primitives onto `Icon.svelte`. Decide in Phase 4.
- [Phase 4] Security items carried from research: sanitizer at the DS boundary for any HTML-rendering primitive, theme colour-value validation before `setProperty`, never mount the DS into `contextIsolation: false` windows.
- [Phase 1 / 01-05] **The Linux electron window is created at the configured bounds**, so `playwright.yml`'s `xvfb-run --server-args="-screen 0 1280x960x24"` will clamp a 1920x1080 output window and the capture will not be 1920x1080 (`enableLargerThanScreen` is macOS-only). Plan 01-05 must widen it to `-screen 0 1920x1080x24`, add the `update_snapshots` `workflow_dispatch` input, and commit `-linux.png`/`-win32.png` baselines. Until a platform's baseline is committed its pixel comparison skips by design.
- [Phase 1] Pre-existing, NOT regressions: 2 Vitest failures in `src/electron/cloud/syncManager.test.ts`, and 40 Prettier-unformatted files (20 of them `.svelte`). Both are recorded in `baseline/` and are the numbers 01-04 must not exceed.
- [Phase 1] `npx playwright test` requires `npm run build` first (the harness boots the production `public/index.html`), and `node scripts/cleanBuilds.js` must restore the dev tags afterwards or `npm start` will load a deleted bundle.

## Session Continuity

Last session: 2026-10-17 23:33 UTC
Stopped at: Completed 01-01 — baselines, pinned `test:svelte`, output-window pixel gate with committed 1920x1080 baseline and observed failure
Resume file: .planning/phases/01-toolchain-gate/01-02-PLAN.md (wave 2, blocked on nothing now — 01-01 is complete)
Next action: execute 01-02 (pre-bump hardening: `cssFileName` + `names`-aware `assetFileNames` on both library-mode configs, `scripts/assertBuildOutput.js` wired into `postbuild`, declare `terser`, migrate the Svelte lint job to `eslint-plugin-svelte@3` flat config with `svelte/valid-compile` kept alive)
