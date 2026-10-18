---
gsd_state_version: "1.0"
current_phase: 1
current_phase_name: Toolchain Gate
status: executing
stopped_at: Completed 01-09 (S7 warning normalization and T3/T4 lint review)
last_updated: "2026-10-18T09:53:16Z"
last_activity: 2026-10-18
last_activity_desc: Completed Phase 1 plan 01-09
state_head: 8883ba5adf4a66e2097b51a194ca90a524592478
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 31
  completed_plans: 7
  percent: 23
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-17)

**Core value:** The show must not fail — during a live service the operator must be able to get lyrics, scripture, and media onto the output displays reliably and instantly, with no visible interruption.
**Current focus:** Phase 1 — Toolchain Gate

## Current Position

Phase: 1 of 7 (Toolchain Gate) — EXECUTING
Plan: 01-09 of 9 (7 successful plans complete; 01-04 remains pending as the final parity gate)
Status: In progress — all Wave 5 source batches S1-S7 and T1-T4 are complete; final parity remains pending with four async blockers
Last activity: 2026-10-18 — Completed 01-09-PLAN.md

Progress: [██░░░░░░░░] 23%

## Performance Metrics

**Velocity:**

- Total plans completed: 7
- Average duration: 24 min across the six plans with recorded durations; 01-09 source start was not included in the continuation handoff
- Total execution time: 146 min recorded across the first six plans; 01-09 duration not recoverable

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-toolchain-gate | 7 | 146 min recorded | 24 min recorded |

**Recent Trend:**

- Last plans: 01-02 (28 min), 01-03 (47 min), 01-06 (14 min), 01-07 (9 min), 01-08 (17 min), 01-09 (duration unavailable from continuation)
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
- [01-03] **Criterion 1 amended with ONE authorized exception.** `src/frontend/components/settings/tabs/Connection.svelte` — a 3-line local rename (`connections` → `connectionCount`) is required because `{@const connections = …}` shadows the imported `connections` store, making `$connections` a scoped subscription, which Svelte 5 rejects as a hard, unconditional error. Svelte 4 compiled it silently. This is a latent-bug fix, not a syntax rewrite: 546 of 547 components compile untouched, behaviour is unchanged, and that file + 3 lines is the entire `.svelte` diff for the phase. Recorded in `01-03-PLAN.md` §`<criterion_1_amendment>` and `01-03-SUMMARY.md`; plans 01-04's gates were amended to match.
- [01-03] Toolchain migration landed and verified: svelte 5.57.2, vite 8.0.16, `@sveltejs/vite-plugin-svelte` 7.1.2, typescript 5.9.3, svelte-check 4.7.7, vitest 4.1.12. `npm run build` exits 0; `assertBuildOutput.js` passes; **pixel gate passes at `maxDiffPixels: 0`** (the output/projector path is provably unchanged); Vitest is at exact baseline parity (179 passed / 2 failed); Prettier's 40 unformatted files are the identical pre-existing set. svelte-check improved to **144 errors vs the 338 baseline**, with zero `TS7006`/`TS7031` (no `strict` leak).
- [Workspace] Work is on branch `gsd/m1-design-system`, NOT `main`. `release.yml` fires on every push to `main` and runs a publishing `npm run release` on four runners — a toolchain migration must not be one push away from shipping itself.
- [Environment] `npm` 10.9.8 cannot resolve the migrated peer set (`ERESOLVE`); **npm 11.21.1 resolves it with no flags**. `npm ci` never resolves peers, so CI is unaffected, but a dev running npm 10 needs npm 11 to install. Recorded in `01-03-SUMMARY.md`.
- [01-01] `test:svelte` is pinned to `svelte-check --tsconfig config/typescript/tsconfig.svelte.json`. There is no root `tsconfig.json`/`jsconfig.json`, and svelte-check's no-flag behaviour is an upwards traversal that found nothing — so the old bare command reported a near-clean result over a partially-resolved tree. The real baseline is **2244 FILES / 338 ERRORS / 47 WARNINGS / 598 HINTS**; a later near-zero count means the invocation broke, not that the code improved.
- [01-01] The Svelte lint job is **not inert** today: 464 files, 167 errors, 39 warnings, and all 39 are Svelte compiler a11y diagnostics surfaced by the `eslint-plugin-svelte3` processor (kebab-case rule ids; zero ids under the literal `svelte3/` namespace). Plan 01-02's flat-config parity claim is measured against this: it must keep surfacing the same compiler diagnostics via an explicit `svelte/valid-compile`.
- [01-01] The output window's DOM hook is the **class token** `#output_window` (`class="fill context #output_window"` — the `#` is FreeShow's context-menu target convention), not an id. Selectors must accept the class form; `document.querySelector("#output_window")` matches nothing.
- [01-01] The pixel gate's only capture path is `--update-snapshots=all` (a bare `--update-snapshots` sets mode `"changed"`, so the platform guard would skip the capture run). Baselines are per-OS; an unbaselined platform skips with a recorded reason and can never write its own baseline or lean on `retries`.
- [01-01] The pixel gate requires a production build to run (`NODE_ENV=production` → `loadFile("public/index.html")` → `./build/bundle.js`), and `node scripts/cleanBuilds.js` must follow. The spec cannot run in the same instant as the "index.html is clean" assertion — build, run, then restore and assert.
- [01-01] Deliberately untouched: `config/building/rollup.config.mjs` (dead code, zero references outside AGENTS.md) and `src/server/cam/main.ts` (the fifth `new App(` site, no build path; plan 01-03 updates it for grep-cleanliness only). `ci.yml` still has exactly **two** `continue-on-error: true` entries — flipping either is a CI-behaviour change and stays out of scope for Phase 1.
- [01-02] The CSS name is now **stated** (`build.lib.cssFileName`: `bundle` renderer / `styles` per server) rather than derived, and the `assetFileNames` hook reads `assetInfo.names ?? (assetInfo.name ? [assetInfo.name] : [])`. On Vite 4.5.14 `cssFileName` is inert; the hook is the mechanism today and can no longer throw on Rollup 4.
- [01-02] `scripts/assertBuildOutput.js` is chained into `postbuild`, so `npm run build` fails on a broken contract. It asserts: exactly one `bundle.css`; non-empty `bundle.css`/`bundle.js`; the **production** HTML literal present in `public/index.html`; three real component selectors (`.dragger`, `.mediaContainer`, `.attributionString`) in the built CSS; `build/electron/index.js`. Observed failing five separate ways.
- [01-02] `lint:svelte` **must not** pass `--fix`: `eslint-plugin-svelte@3` declares `supportsAutofix: true` (svelte3 did not), so `--fix` rewrites `.svelte` sources — proven on a copy of `Top.svelte`. Criterion 1 (464 components source-unchanged) outranks the flag.
- [01-02] `svelte/valid-compile` ships in **no** `eslint-plugin-svelte@3` preset (verified in the installed package: 0 occurrences in `base.js`/`recommended.js`/`all.js`), so it is enabled by hand with `ignoreWarnings: true`. The flat config uses `svelte.configs.base` (3 ids) and `ts.configs.recommendedTypeChecked`, and filters out the preset's `.ts`-scoped `eslint-recommended` entry plus everything non-`.svelte` via a global `ignores` list — flat config lints `.js`/`.mjs`/`.cjs` by default now that `--ext` is gone.
- [01-02] typescript-eslint v8 dropped `no-inferrable-types` and `no-empty-function` from its presets (111 recorded findings) and renamed `no-var-requires` → `no-require-imports`, `ban-types` → `no-restricted-types`, `recommended-requiring-type-checking` → `recommended-type-checked`. All are handled explicitly in the configs; adopting the lower numbers would have been silent check loss.
- [01-02] **The `lint` chain is red by construction** and always was: `npm-run-all -s` stops at `lint:electron`, which had 209 unfixable errors in the recorded baseline. Do not use `npm run lint`'s exit code as a gate, and do not run it while sources must stay frozen — it applies `--fix` to `src/electron/**` and `src/frontend/**` (7 `.ts` files in the observed run, restored immediately).
- [01-02] Post-migration counts (measured `--format json`, no `--fix`): svelte 464 files **172 err / 0 warn** (baseline 167/39); electron 149 files **269 err / 0 warn** (baseline 212/25); frontend 255 files **677 err / 0 warn** (baseline 630/0); styles 464 files **216 err** (baseline 216 — unchanged). Electron and frontend totals **rise** because v8's presets check more (new rules, `no-unused-vars` moved from `warn` to `error`); all 39 a11y warnings the old Svelte job reported are still reported by `test:svelte` (39 of its 47 `WARNINGS`).
- [01-03] **Authorized criterion-1 exception — one `.svelte` file, 3 lines.** `src/frontend/components/settings/tabs/Connection.svelte` renamed a local `{@const connections = …}` binding to `connectionCount` (commit `1cf9c0a2`). The binding shadowed the imported `connections` store, making `$connections` a *scoped* subscription — a hard, unconditional Svelte 5 compile error (`store_invalid_scoped_subscription`) that Svelte 4 compiled silently. This is a **latent-bug fix, not a syntax rewrite**: behaviour unchanged, the store import and `$connections` untouched, no other `.svelte` file in the phase diff. 546 of 547 components are byte-identical.
- [01-03] `svelte.config.mjs` is now `preprocess: [vitePreprocess()]`, and its defaults are `{ script: false, style: true }` — correct because the repo has zero `<style lang=...>` blocks and zero code-emitting TS features. **Rule:** if an `enum`/`using`/decorator/parameter-property is ever added inside `<script lang="ts">`, give `vitePreprocess({ script: true })` or move it to a `.ts` module.
- [01-03] **Dev does NOT discover `svelte.config.mjs`, empirically confirmed.** Dev prints `no Svelte config found at …/public - using default configuration`, because `vite.config.mjs:20` sets `root: production ? "." : "public"`. The inline `preprocess` at `vite.config.mjs:9` is therefore **load-bearing** — RESEARCH Open Question 4 resolved as "discovery does not happen". Removing that inline preprocess would silently drop TS preprocessing in dev while production kept working.
- [01-03] `src/frontend/tsconfig.json` pins `strict: false` explicitly (over `@tsconfig/svelte@5`'s `strict: true`) plus `module`/`moduleResolution`/`verbatimModuleSyntax`, and **keeps** `vite/client` (upstream dropped it; it types `import.meta.env`). Verified clean: **TS7006/TS7031 = 0** post-swap. `src/server/tsconfig.json` needed only the `module`/`moduleResolution` pins — it already set `strict: true` explicitly. Honest caveat: the pinned `svelte-check` covers `src/frontend` only, so the 83 server `.svelte` files are **not** type-checked — a pre-existing gap, not a regression.
- [01-03] Deliberately held: `prettier-plugin-svelte@^3.4.0` and `prettier@^3.6.2` (a formatter bump is the one dependency whose purpose is to rewrite frozen source), `rollup-plugin-svelte@^7.2.2` (peers `svelte >=3.5.0`; referenced only by the dead rollup config), `electron`, `electron-builder`, `@rollup/plugin-terser`, `npm-run-all2`. Vite 8's registry names changed more than the plan anticipated: **Rolldown replaces esbuild + Rollup** (22 `@rolldown/binding-*` in; 24 `@esbuild/*` out) and **Lightning CSS** replaces the old CSS minimiser. Lockfile audited: no unintended package identity changed.
- [01-03] **The `a11y_` suppression is PROVEN live, not merely quiet.** `svelte-check` (which does not apply the Vite `onwarn` filter) reports **129 real a11y warnings**; the build log carries **0** `a11y_` codes. The kebab→snake prefix rename works. This is the strongest available evidence for threat T-03-07.
- [01-03] **NEW FINDING — the build log is no longer clean: 165 `element_invalid_self_closing_tag` WARNINGS** (158 distinct `src/frontend` files + 7 `src/server` sites). Svelte 5 warns about self-closing non-void HTML elements; Svelte 3 was silent. They are warnings (exit 0) and are NOT `a11y_` codes, so `onwarn` never sees them. This is 01-04's decision — three options: (a) add the code to the `onwarn` suppression alongside `a11y_` (**recommended**, matches the a11y precedent, keeps criterion 1 intact), (b) fix the 165 sites (a real source diff that would itself need its own criterion-1 authorization), (c) accept and record.
- [01-03] `npm run lint`'s exit code was already redundant and plan verification item 5 is **unexecutable as written** (it claims the chain "still exits 0 with all four jobs"; `npm-run-all -s` has always stopped at `lint:electron`). `lint:electron`/`lint:frontend` carry `--fix` and must not be run while sources are frozen. `lint:svelte` has **no** `--fix` and **was** run, because `config/linting/eslint.svelte.flat.mjs:4` imports `svelte.config.mjs` — the file 01-03 rewrote. Result **185 err / 0 warn** (01-02: 172/0; baseline: 167/39); the +13 is TypeScript-5.9-aware type rules finding more on unchanged source, not check loss.
- [01-03] **Plan defect (recorded, plan file NOT amended):** the Task 2 verify script requires `AudioMultichannel`, `AudioProcessor` and `PitchShiftNode` in `src/frontend/audio/audioAnalyser.ts` to be type-only, but they are **`export class` runtime values** (`AudioMultichannel.DEFAULT_CHANNELS`, `AudioProcessor.createNode`, `source instanceof PitchShiftNode`). Making them type-only would erase the bindings and, under `verbatimModuleSyntax`, be a bundler error. The committed code is correct; the plan's assertion is what is wrong (it fails on exactly those 3 names and passes on the other 5 files). Treat the plan's Task 2 `<automated>` block as superseded for those names.
- [01-03] **Plan defect:** the plan enumerated 8 ambiguous type imports; **11** were needed. The 3 extra — `src/frontend/ai/scripture/BibleCacheManager.ts`, `src/frontend/components/timeline/TimelineActions.ts`, `src/frontend/components/timeline/TimelinePlayback.ts` — were committed in `065c8c90` with justification (Rule 3, blocking).
- [01-06] The fresh pinned checker inventory must precede source remediation. The captured source revision was `2ee3eae0`; the full 157-location frontend checker inventory and the separate production-build inventory remain distinct evidence sets.
- [01-06] S1/S2 normalized only 37 exact `element_invalid_self_closing_tag` sites across 24 assigned Svelte files. Preserve the original whitespace and attributes; do not infer the refreshed production-build count before the final production build.
- [01-07] S3/S4 normalized 53 exact sites with matching pre-edit production/checker path-line-tag keys; target lint review removed 17 current-only type assertions proven type/behavior-neutral, while preserving 4 matched and 5 baseline-only findings. Three current-only await findings remain because Promise/microtask and async-iterator semantics are not safe to change by inference.
- [01-08] S5/S6 normalized 49 exact sites; production/checker path-line-tag keys match, while their columns are kept separate (checker +1). T2 removed 11 proven current-only assertions, preserving five matched findings and one current-only `scripture.ts:160:50` Promise.all await blocker.
- [01-09] S7 normalized 22 exact production-inventoried non-void tags across 12 files: 15 frontend keys match the pinned checker inventory and seven server sites are production-only. Three checker-only sites remain in `drawer/info/EffectsInfo.svelte` and `drawer/info/OverlayInfo.svelte`; the final gate must reconcile them.
- [01-09] T3/T4 resolved 39 individually reviewed current-only assertions (13 + 26), preserving 18 baseline-matched findings unchanged. No T3/T4 await findings were present; the four T1/T2 async-semantics blockers remain.

### Pending Todos

- Run plan 01-04's final production/checker/lint/test/pixel parity gate; do not start plan 01-05 before it completes.

### Blockers/Concerns

- [Roadmap] `REQUIREMENTS.md` v1 scope is **32** requirements (not 33) — the eight `A11Y-01`…`A11Y-08` ids contain digits and were missed by the original tally. Traceability records 32/32; resolved.
- [Phase 1 / 01-04 final gate] The pre-remediation production inventory is 161 `element_invalid_self_closing_tag` warnings (154 frontend/78 files + 7 server/6 files); S1/S2, S3/S4, S5/S6 and S7 normalized all 161 production-inventoried source sites (37 + 53 + 49 + 22). The fresh checker inventory additionally has three checker-only sites outside the production-assigned batches: `src/frontend/components/drawer/info/EffectsInfo.svelte:4:1` and `src/frontend/components/drawer/info/OverlayInfo.svelte:14:5, 54:13`. Intermediate checker runs after S5/S6 reported 201 → 178 → 152 warnings; no post-S7 checker or final production build/inventory has run. Do not substitute or project a final count. Plan 01-09 is complete; plan 01-04 remains the final parity gate. No suppression is authorized.
- [Phase 1 / T1 and T2] Four current-only `await-thenable` findings remain blockers: `src/electron/cloud/drive.ts:209:9` (`Promise.all` over synchronous values), `src/electron/data/import.ts:24:9`, `:36:9` (`for await` over `string[]`), and `src/frontend/components/drawer/bible/scripture.ts:160:50` (`Promise.all` over synchronous chapter values). Preserve Promise/microtask/rejection and async-iterator-close behavior unless a safe exact change is demonstrated. T2 assigned lint after edits reports the five matched findings plus this one retained await.
- [Phase 1 / 01-04 final gate] Checker comparison: baseline **2244 FILES / 338 ERRORS / 47 WARNINGS / 598 HINTS**; fresh pre-remediation **2174 / 144 / 291** (HINTS not emitted by svelte-check 4.7.7); post-S1/S2 **2174 / 144 / 254**. The pre-remediation warning composition was 157 self-closing + 129 a11y + 5 other. The −70 FILES delta is attributed to the `@tsconfig/svelte@5`/module-resolution change with unchanged project includes; the full final parity gate remains pending.
- [Phase 1 / 01-04] `lint:svelte` is **185 err / 0 warn** vs 172 at 01-02 vs 167 at baseline (+13). Confirm this is TS-5.9 type-awareness on unchanged source, not check loss.
- [Phase 1] Pre-existing, NOT regressions: 2 Vitest failures in `src/electron/cloud/syncManager.test.ts`, and 40 Prettier-unformatted files (20 of them `.svelte`). Both are recorded in `baseline/` and are the numbers 01-04 must not exceed — 01-03 held both at exact parity (40 files, identical set).
- [Phase 2] `@theme inline` may still emit a `:root` block; confirm in the built CSS what lands on `:root` and that it changes nothing in an output window. This is the single most important item to verify before Phase 4.
- [Phase 2] Tailwind's native engine (`@tailwindcss/oxide`) vs. `npm ci`, CI matrices and emulated cross-builds — keep it in devDependencies, pin the lockfile, assert a known class exists in the built CSS.
- [Phase 4] Icon-system fork unresolved: Lucide inside `components/ui/**` only (recommended, with a mapping table) vs. mapping primitives onto `Icon.svelte`. Decide in Phase 4.
- [Phase 4] Security items carried from research: sanitizer at the DS boundary for any HTML-rendering primitive, theme colour-value validation before `setProperty`, never mount the DS into `contextIsolation: false` windows.
- [Phase 1 / 01-05] **The Linux electron window is created at the configured bounds**, so `playwright.yml`'s `xvfb-run --server-args="-screen 0 1280x960x24"` will clamp a 1920x1080 output window and the capture will not be 1920x1080 (`enableLargerThanScreen` is macOS-only). Plan 01-05 must widen it to `-screen 0 1920x1080x24`, add the `update_snapshots` `workflow_dispatch` input, and commit `-linux.png`/`-win32.png` baselines. Until a platform's baseline is committed its pixel comparison skips by design.
- [Phase 1 / 01-05] New bundle numbers to track: `bundle.js` **3,930,087 B** minified, `bundle.css` **257,310 B**. Vite 8's default minifier changed; the current gate only proves "minified at all" (source banner absent). A real size budget is P2's job.
- [Phase 1] One post-change Vitest full run flaked `src/electron/data/zip.test.ts` ("a file disappears while zipping", a filesystem race) under machine load; it passes 5/5 in isolation and the repeat full run matched the baseline (179 passed / 2 failed). Not a regression — do not re-baseline for it.

## Session Continuity

Last session: 2026-10-18 09:53 UTC
Stopped at: Completed 01-09 — S7 normalized 22 production-inventoried warning sites; T3/T4 resolved 39 safe current-only assertions and retained 18 matched findings. Four T1/T2 async blockers and three checker-only warning sites remain for final parity.
Resume file: None
Next action: execute final parity plan 01-04 only. Do not start 01-05 until the final gate completes.
