# Phase 1: Toolchain Gate - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning
**Mode:** Auto-generated (pure infrastructure phase — smart discuss skipped the grey-area tables)

<domain>
## Phase Boundary

Move the build platform with **zero component-syntax rewrites**: Svelte 3.59.2 → 5.x (legacy mode), Vite 4.5.14 → 7.x, `@sveltejs/vite-plugin-svelte` 2.x → 6.x, TypeScript 4.9.5 → 5.9.x, plus `svelte-check`, the Svelte ESLint plugin (replacing the Svelte-3-only `eslint-plugin-svelte3`), and Vitest moving together.

Delivers **no user-visible capability**. The acceptance test is "nothing changed": the app launches, and a projector output window renders pixel-identically to the pre-upgrade baseline.

Explicitly NOT in this phase: Tailwind, design tokens, any CSS or component change, the shadcn primitive layer. All of that is Phase 2+.

</domain>

<decisions>
## Implementation Decisions

### the agent's Discretion
All implementation choices are at the agent's discretion — pure infrastructure phase. Use the ROADMAP phase goal, its five success criteria, and the codebase conventions to guide decisions. The research files below carry hard constraints that must be honoured.

### Hard Constraints (from Phase 1 research — treat as decided)
- **Svelte 5 in legacy mode only.** Existing `export let` (317 files), `$:` (419), `on:` (404), `<slot>` (37), `createEventDispatcher` (77), `bind:` (170) all keep working untouched. The repo contains **zero** uses of `svelte/internal`, `svelte/compiler`, `SvelteComponentTyped`, `$$restProps`, `<svelte:options>`, or `.$set`, so no component rewrite is required.
- **Vite target is 8.x with `@sveltejs/vite-plugin-svelte` 7.x — REVISED by upstream evidence.** The earlier registry-only analysis preferred Vite 7 + plugin 6 (Rolldown risk on the IIFE `build.lib` bundle). The upstream `svelte5` branch disproves that concern for this repo: it ships Vite `^8.0.16` + plugin `^7.1.2` with the IIFE lib build intact, given the `assetInfo.names?.[0]` fix. Go to 8 so the toolchain is not migrated twice. (Plugin 7 peers `vite: ^8.0.0`; plugin 6 peers `^6.3.0 || ^7.0.0` — the pairing is forced either way.)
- **Asset-name API, a11y code rename, and `vitePreprocess()` are mandatory compat fixes.** See Prior Art above for the exact edits; omitting any one fails silently rather than loudly.
- **TypeScript target is 5.9.x.** TS 7.0.2 is the native Go port and is excluded by both peers: `svelte-check@4.7.7` accepts `typescript ^5 || ^6`, `@typescript-eslint/parser` accepts `>=4.8.4 <6.1.0`. (TS 6.0.3 is the technical ceiling if 5.9 causes trouble; 5.9.3 is the conservative pick.)
- **`svelte-preprocess` → `vitePreprocess()`.** `svelte.config.mjs` currently uses `svelte-preprocess` with a per-mode tsconfig; `vite.config.mjs` already uses `vitePreprocess()`. Both must end coherent.
- **Do not let the Svelte 4 legacy shadcn path substitute for this phase.** That line is frozen (Tailwind 3, `bits-ui@0.22`) and would defer, not avoid, this work.
- **The safety net exists before the first dependency change.** The output-window pixel-diff baseline and the release smoke checklist are plan 01-01, not a later addition.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.planning/research/STACK.md` — versioned stack recommendation, A-vs-B cost comparison, compatibility matrix, four verified integration constraints.
- `.planning/research/PITFALLS.md` — 7 critical pitfalls with a pitfall→phase mapping; Electron/multi-window and build/packaging hazards are HIGH confidence (verified in `index.ts`, `windowOptions.ts`, `startup.ts`, `vite.config.mjs`, `postBuild.js`, `cleanBuilds.js`).
- `.planning/codebase/` — 7 codebase documents (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS).
- `config/testing/playwright.config.ts` + `config/testing/start.test.ts` — existing Playwright Electron harness to extend for the output-window gate.
- `FS_MOCK_STORE_PATH` env var (`src/electron/data/store.ts`) — already provided for throwaway-store Playwright runs.

### Established Patterns
- Renderer bundle: `vite.config.mjs` library mode, `formats: ["iife"]`, `fileName: () => "bundle.js"`, `outDir: "public/build"`, `emptyOutDir: false`, and an `assetFileNames` hook that renames the emitted CSS to `bundle.css`.
- Dev vs prod root differ: `root: production ? "." : "public"`, `publicDir: false`, dev-only alias `/src → ../src`, `resolve.dedupe: ["svelte"]`.
- Build scripts are bespoke and brittle: `scripts/postBuild.js` does literal string replacement on `index.html` and throws `"Dev script path changed!"` on mismatch; `scripts/cleanBuilds.js` holds a mirrored constant; `scripts/preBuild.js` runs first.
- Workaround for noisy optional deps already documented at `.gitignore:1-3` — relevant when Tailwind's native engine arrives in Phase 2.
- CommonJS `require` is allowed in `src/electron` (ESLint `no-var-requires` off there, error in frontend).
- CI format and type checks are currently non-blocking (`continue-on-error: true`), so a silent Svelte 5 type backlog can grow unseen.
- `no-console` is an error in `src/`; use `console.info`/`warn`/`error`.

### Integration Points
- `vite.config.mjs` — renderer build (single IIFE bundle, `bundle.css` renaming).
- `config/building/vite.config.servers.mjs` — the five server apps (remote, stage, controller, output_stream, cam); shares the Svelte plugin and must move with it.
- `svelte.config.mjs` — preprocess config consumed by `svelte-check` and tooling.
- `config/typescript/tsconfig.electron.json`, `tsconfig.electron.prod.json`, `tsconfig.server.json`, `tsconfig.svelte.json`, `tsconfig.svelte.prod.json`.
- **6 mount sites total** (verified): `src/frontend/main.ts:23` (`new App({ target: document.body })`) plus `src/server/{remote,stage,controller,output_stream,cam}/main.ts` — each `const app = new App({ ... })`.
- `config/linting/eslint.svelte.js` — `eslint-plugin-svelte3` config to replace; note it also disables a11y warnings at line 42, which Phase 6 re-enables.
- `.github/workflows/` — CI workflow(s) currently using Node 22; two checks pinned non-blocking.
- `package.json` scripts: `test:*`, `lint:*`, `build:*`, `start` → `scripts/start.js`.

</code_context>

<prior_art>
## Prior Art — Upstream `svelte5` Branch (CRITICAL — read first)

**Source:** `https://github.com/ChurchApps/FreeShow.git`, branch `svelte5` @ `644e6b1` (Jul 27 2026), fetched read-only into `refs/remotes/upstream/svelte5`. Merge-base is `e12355a1` (Jun 10 2026); the branch is **2 commits** from that base while `main` is **35 commits** ahead. It is an unmerged, focused migration attempt built against older code — treat it as a **validated recipe, not a merge target**. Re-apply its approach on top of current `main`; do not merge it.

### What upstream proved works — ADOPT THESE
- **Vite 8 + `@sveltejs/vite-plugin-svelte` 7.** `vite ^8.0.16`, plugin `^7.1.2`, `svelte ^5.56.3`, `typescript ^5.9.3`, `svelte-check ^4.6.0`, `vitest ^4.1.9`, `@tsconfig/svelte ^5.0.0`. **This supersedes the research's Vite 7 recommendation** — the IIFE `build.lib` renderer bundle builds on Vite 8 once the asset-name API is fixed, and going straight to 8 avoids a second migration later.
- **Asset-name API change (Vite 8 / Rollup 4):** `assetFileNames` must read `assetInfo.names?.[0]`; `assetInfo.name` no longer exists. Keep the hook — it is what still guarantees a single `bundle.css`:
  `const name = assetInfo.names?.[0] ?? ""` → `if (name.endsWith(".css")) return "bundle.css"` → `return name`.
- **A11y warning-code rename:** Svelte 5 renamed `a11y-*` → `a11y_*`. Both `vite.config.mjs` and `config/building/vite.config.servers.mjs` must change `startsWith("a11y-")` → `startsWith("a11y_")` or the suppression silently stops working.
- **`vitePreprocess()` everywhere:** `svelte.config.mjs` drops `svelte-preprocess` + the per-mode tsconfig indirection and becomes just `preprocess: vitePreprocess()`; `config/building/vite.config.servers.mjs` does the same. `svelte-preprocess` and `rollup-plugin-svelte` are removed.
- **`@tsconfig/svelte@5` + explicit `"strict": false`.** v5 enables `strict` (incl. `noImplicitAny`). `src/frontend/tsconfig.json` (and the server tsconfig) must pin `"strict": false` explicitly with a comment, alongside the project's existing explicit opt-ins. Without this, `svelte-check` error counts explode and TOOL-03 fails.
- **Playwright harness repairs — the best available starting point for the safety net.** `config/testing/start.test.ts`:
  - A splash/loading window opens first, so `firstWindow()` can return the splash. Select the real window by polling `electronApp.windows().find(w => w.url().includes("index.html"))`, max 20 × 500 ms, `firstWindow()` as fallback.
  - The first-run Initialize popup is conditional — guard with `if ((await setupStart.count()) > 0)` so repeat runs don't hang.
  - `playwright.config.ts` gets `timeout: 90_000` (the E2E walks the whole app with built-in delays).
- **`@rollup/plugin-terser` 0.4.4 → 1.0.0**; `svelte-inspector` (the `vassbo/svelte-inspector` fork) removed.

### Where upstream is WRONG — DO NOT COPY
- **They deleted Svelte linting instead of migrating it.** `lint:svelte` was dropped from the `lint` script, `config/linting/eslint.svelte.js` was deleted (−45 lines), and `eslint-plugin-svelte3` removed with **no replacement plugin**. That is exactly what TOOL-03 forbids ("no existing check was dropped"). Migrate to `eslint-plugin-svelte` (flat-config only; `svelte/valid-compile` must be enabled explicitly because v3 removed it from `recommended`) and keep the check green.
- They did not set `cssFileName`; they rely solely on the `assetFileNames` hook. Set it in both configs as belt-and-braces — the four server apps' `index.html` files link `styles.css` by name.
- `config/building/rollup.config.mjs:188` still uses the old `a11y-` prefix on their branch — fix it here too if that file is still live.

### Consequence for this phase
Re-apply upstream's recipe on top of current `main`, then go further than upstream did: preserve the lint check, add the pinned baseline measurement (`svelte-check` resolves no tsconfig on current `main` — no root tsconfig, and `test:svelte` is unpinned under `continue-on-error`), and build the output-window pixel gate upstream never attempted.

</prior_art>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Follow the five ROADMAP success criteria exactly; they are the contract:

1. App launches in dev and packaged, all 464 components source-unchanged (six `mount()` sites + config only).
2. Output-window render gate — projector output pixel-identical at 1920×1080 vs. a pre-upgrade baseline captured with `TYPE=output`.
3. Production build emits exactly one `bundle.css`, `index.html` references non-empty `bundle.js`/`bundle.css`, and the `postBuild.js`/`cleanBuilds.js` string contracts hold.
4. `svelte-check` + Svelte ESLint + Vitest report no new errors/failures vs. the pre-upgrade baseline; no check dropped or silently made non-blocking.
5. Release smoke checklist green on packaged Windows/macOS/Linux: launch, open Settings, open an output, play a song, import a file — with `better-sqlite3`, `@discordjs/opus`, `osr-capture` loading on each platform.

</specifics>

<deferred>
## Deferred Ideas

- Vite 8 / Rolldown + `@sveltejs/vite-plugin-svelte` 7 — **RESOLVED: promoted into scope** (see Prior Art). Upstream evidence supersedes the earlier "defer until after Phase 1" call.
- Merging the upstream `svelte5` branch directly — rejected: 35 commits stale, only 2 commits of its own, and it drops the Svelte lint check.
- TypeScript 6.x — optional bump once 5.9 is proven; 6.0.3 is the peer-allowed ceiling.
- Frontend TypeScript `strict` burn-down (~2,733 `any`) — its own future effort, explicitly out of scope.
- Making the two non-blocking CI checks blocking — PITFALLS recommends flipping them for touched paths; confirm with the user before changing CI behaviour.

</deferred>

## User-authorized amendment — 2026-10-18

The user selected **Authorize fixes** for the blocked 01-04 parity findings. This narrowly amends the source-change prohibition for plan 01-04 only; it does not authorize broader migration cleanup.

1. Convert only Svelte non-void HTML elements identified by the Svelte 5 `element_invalid_self_closing_tag` compiler diagnostic to explicit opening and closing tags. The current recorded evidence is 161 production-build warnings across 84 source files (154 frontend warnings across 78 files; 7 server warnings across 6 files) and 157 matching `svelte-check` diagnostics. Re-inventory at execution time and record the exact file/line/tag list; those counts are evidence, not a hard-coded target. Do not alter component APIs, reactive syntax, styling, or unrelated markup.
2. Review every remaining `@typescript-eslint/no-unnecessary-type-assertion` and `@typescript-eslint/await-thenable` lint finding. Fix only individual cases proven to preserve runtime and observable behavior. Preserve intentional async scheduling/microtask behavior and `for await` semantics. Do not disable, suppress, or weaken any lint rule. Any valid or unsafe-to-fix finding that prevents baseline parity must be recorded with exact evidence and keep plan 01-04 blocked.
3. Retain the source/output safety gates: run the production build and relevant tests, and run the existing projector snapshot at `maxDiffPixels: 0` without updating snapshots. Any pixel difference is a hard stop; do not refresh the baseline.

All other Phase 1 boundaries remain in force: no broad refactor or restyle, no unrelated source changes, no CI non-blocking changes, no warning suppression, no disabling existing checks, and no change to the snapshot or threshold. This amendment supersedes only the frozen-source clauses that directly prevent the three listed actions; the earlier 01-04 blocked result and its recorded counts remain historical evidence in `PARITY.md` and `01-04-SUMMARY.md`.

## User-authorized residual-remediation continuation — 2026-10-18

The user authorized one narrow continuation before rerunning the final 01-04 gate. This amendment supersedes only the immediately relevant source restrictions; it does not change the Phase 1 goal or the original blocked 01-04 result.

1. **Four `await-thenable` deltas:** attempt behavior-preserving resolutions for `src/electron/cloud/drive.ts:209:9`, `src/electron/data/import.ts:24:9,36:9`, and `src/frontend/components/drawer/bible/scripture.ts:160:50`. Review candidate rewrites rather than assuming them safe: for the `Promise.all` sites, investigate materializing synchronous side effects before `Promise.resolve` wrapping and aggregation; for the `string[]` `for await` sites, investigate an async-generator delegation adapter (`async function* { yield* files }`) while retaining `for await`. Require independent focused probes for ordering/microtask traces, thenable and rejection propagation, and iterator-close behavior. If equivalence cannot be demonstrated for any finding, leave that source unchanged, record the evidence and blocker, and keep the final gate blocked. Preserve the three explicit baseline awaits in `src/electron/data/backup.ts` unchanged.
2. **Three fresh checker-only tags:** normalize exactly `src/frontend/components/drawer/info/EffectsInfo.svelte:4:1 <div>`, `src/frontend/components/drawer/info/OverlayInfo.svelte:14:5 <div>`, and `src/frontend/components/output/preview/PreviewCanvas.svelte:85:5 <canvas>`. These are the fresh final-checker sites from `PARITY.md`; do not substitute the stale `OverlayInfo.svelte:54:13` site. Preserve attributes and surrounding markup, add only explicit closing tags, and require a fresh pinned checker inventory with zero target sites afterward.
3. **Narrow Prettier normalization:** format only the exact 80 current Prettier-new paths in `PARITY.md` under `#### Prettier path-set comparison`: 79 Svelte files whose pre-existing source changes are authorized tag normalizations, plus `src/frontend/components/edit/scripts/chords.ts`, whose authorized current-only assertion cleanup has a one-expression line-wrap difference. Also format only the three newly changed checker-only tag files above. Use explicit file lists in batches of at most 12 paths. The measured current-only formatting deltas are close-tag spacing/indentation in Svelte and that single expression reflow in `chords.ts`; audit every resulting source hunk and retain no formatting outside the authorized diagnostic/lint hunks. Do not run Prettier on any other path.
4. **Unchanged safeguards:** keep every lint rule enabled; add no warning suppression; use no ESLint autofix; do not edit or regenerate baselines, tests, or snapshots; and preserve the projector gate's `maxDiffPixels: 0`. Temporary semantic probes may be created and retained outside the repository, but do not add or alter repository tests or change the fixed 181-test baseline. Plan 01-04 remains the owner of the post-remediation production build, all four lint jobs, full Vitest/Stylelint/Prettier comparisons, focused TypeScript evidence, full source-hunk audit, output-pixel test with `--retries=0`, and cleanup.
