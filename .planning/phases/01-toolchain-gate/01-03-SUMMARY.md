---
phase: 01-toolchain-gate
plan: 03
subsystem: infra
tags: [svelte5, legacy-mode, vite8, rolldown, typescript5, svelte-check4, vitest4, @tsconfig/svelte, vitePreprocess, verbatimModuleSyntax, mount, componentApi, a11y, pixel-gate]

# Dependency graph
requires:
    - phase: 01-toolchain-gate
      provides: "01-01's pre-upgrade baselines (baseline/svelte-check.txt 2244/338/47/598, lint.json, vitest.json), the pinned svelte-check invocation and the 1920x1080 `-darwin` output-window pixel baseline at `maxDiffPixels: 0`"
    - phase: 01-toolchain-gate
      provides: "01-02's scripts/assertBuildOutput.js wired into `postbuild`, `build.lib.cssFileName` on both library-mode configs, and the flat-config Svelte lint job that imports svelte.config.mjs"
provides:
    - "Svelte 5.57.2 running in legacy mode across the renderer and all five server apps with zero component-syntax rewrites (no `export let`/`$:`/`on:`/`<slot>`/`createEventDispatcher` touched)"
    - "Vite 8.0.16 + @sveltejs/vite-plugin-svelte 7.1.2 on the Rolldown pipeline, preserving the IIFE `build.lib` bundle for the main window and every output window"
    - "TypeScript 5.9.3 with an explicit `strict: false` pin (plus `module`/`moduleResolution`/`verbatimModuleSyntax` pins) so a future @tsconfig/svelte bump is a no-op"
    - "svelte.config.mjs rewritten to `vitePreprocess()`; `svelte-preprocess` and `svelte-inspector` removed"
    - "The six `new App(...)` sites replaced with `mount(App, ...)`; `componentApi` set nowhere"
    - "svelte-check 4.7.7 and Vitest 4.1.12 upgraded together with the compiler (TOOL-03's 'no loss of checks')"
    - "A verification that the `a11y_` snake_case prefix genuinely suppresses (129 a11y warnings exist at compile time, 0 reach the build log)"
affects: ["01-04 (parity judgment: 144-vs-338 errors, 291-vs-47 warnings, −71 FILES, lint:svelte 185-vs-172)", 01-05]

# Actuals (#2632) — chars/4 over the realized diff (excluding .planning).
actuals:
    tokens: 67626
    tasks: 3
    commits: 5

tech-stack:
    added:
        - "svelte@5.57.2"
        - "@sveltejs/vite-plugin-svelte@7.1.2"
        - "vite@8.0.16 (Rolldown pipeline; replaces esbuild + Rollup)"
        - "typescript@5.9.3"
        - "@tsconfig/svelte@5.0.0"
        - "svelte-check@4.7.7"
        - "vitest@4.1.12"
    removed:
        - "svelte-preprocess@4.10.7"
        - "svelte-inspector (git dependency, Svelte-3 fork)"
    held:
        - "prettier-plugin-svelte@^3.4.0 and prettier@^3.6.2 (a formatter bump would rewrite frozen source)"
        - "rollup-plugin-svelte@^7.2.2 (peers svelte >=3.5.0, referenced only by the dead rollup.config.mjs)"
        - "electron@37.10.3, electron-builder@^26.16.1, @rollup/plugin-terser@^1.0.0, npm-run-all2@^9.0.1"
    patterns:
        - "Pinned-over-base: override every flag the new base package flips (`strict`) rather than inheriting it, so the next base bump cannot silently change compiler behaviour"
        - "Suppression must be proven to suppress, not merely observed to be quiet: compare a checker that does NOT apply the filter (svelte-check) against the build log"
        - "Runtime classes are never type-only imports: `import type` on a class that is `new`-ed erases the binding, and under `verbatimModuleSyntax` that is a bundler error, not a type error"

key-files:
    created: []
    modified:
        - package.json
        - package-lock.json
        - svelte.config.mjs
        - vite.config.mjs
        - config/building/vite.config.servers.mjs
        - src/frontend/main.ts
        - src/server/remote/main.ts
        - src/server/stage/main.ts
        - src/server/controller/main.ts
        - src/server/output_stream/main.ts
        - src/server/cam/main.ts
        - src/frontend/tsconfig.json
        - src/server/tsconfig.json
        - src/frontend/components/settings/tabs/Connection.svelte
        - src/frontend/utils/searchFast.ts
        - src/frontend/audio/audioAnalyser.ts
        - src/frontend/components/export/projectLink.ts
        - src/frontend/components/timeline/TimelinePlayback.ts
        - src/frontend/components/timeline/TimelineActions.ts
        - src/frontend/ai/scripture/BibleCacheManager.ts
        - src/server/remote/util/socket.ts
        - src/server/remote/util/stores.ts
        - src/server/stage/util/itemHelpers.ts
        - src/server/stage/util/stores.ts

key-decisions:
    - "`svelte.config.mjs` uses the array form `preprocess: [vitePreprocess()]`. `vitePreprocess()` defaults to `{ script: false, style: true }`, which is correct here: the repo has zero `<style lang=...>` blocks and zero code-emitting TypeScript features across all 547 `.svelte` files. RULE: if a code-emitting feature (`enum`, `using`, decorators, parameter properties) is ever added inside `<script lang=\"ts\">`, it must either move to a `.ts` module or `vitePreprocess({ script: true })` must be set."
    - "The inline `preprocess` at `vite.config.mjs:9` is load-bearing and was kept. Empirically confirmed this run: dev prints `no Svelte config found at /Users/clintonemok/Work/freeshow/public - using default configuration`, because `vite.config.mjs:20` sets `root: production ? \".\" : \"public\"` and `svelte.config.mjs` does not exist under `public/`. This closes RESEARCH Open Question 4 the opposite way from 'discovery works'."
    - "`src/frontend/tsconfig.json` pins `strict: false` explicitly with an explanatory comment. This single line is the difference between criterion 4 passing and failing by an order of magnitude — `@tsconfig/svelte@5` sets `strict: true`, which would switch on `noImplicitAny` across ~2,733 `any` uses. Verified clear: TS7006/TS7031 = 0 in the post-swap run."
    - "`src/server/tsconfig.json` got only the `module`/`moduleResolution` pins, no `strict` line: it already set `strict: true` and `noImplicitAny: true` explicitly, so the base flip is a no-op there. Recorded caveat: this file has no live consumer in this phase (referenced only by the dead rollup config), and the pinned svelte-check covers `src/frontend` only — the 83 server `.svelte` files are NOT covered by the pinned type check. That is a pre-existing gap carried forward, not a regression."
    - "`vite/client` was KEPT in `src/frontend/tsconfig.json` `types`. Upstream's `svelte5` branch dropped it; it types `import.meta.env`, which `src/frontend/main.ts:11` uses."
    - "`rollup-plugin-svelte@^7.2.2` was deliberately NOT removed even though upstream removed it, and `config/building/rollup.config.mjs` was left untouched. It is dead code with zero references and its stale `a11y-` prefix at line 188 is harmless."
    - "`src/server/cam/main.ts` was updated to `mount()` for grep-cleanliness only. It has no build path (`vite.config.servers.mjs:7-12` lists only remote/stage/controller/output_stream) and receives no test or build coverage — no work was invented for it."

patterns-established:
    - "Green build ≠ clean log: Svelte 5 introduces `element_invalid_self_closing_tag`, and `onwarn` only filters what it is told to filter — the build log is now materially noisier (165 warnings) even though exit code is 0"
    - "Compare a filtered log against an unfiltered checker to prove a suppression works (129 a11y warnings in svelte-check vs 0 `a11y_` codes in the build log)"
    - "A verification script that demands `import type` on a runtime class is wrong, not the code — `verbatimModuleSyntax` makes that a bundler error"

requirements-completed: [TOOL-01, TOOL-02]

coverage:
    - id: D1
      description: "Renderer runs on Svelte 5.57.2 in legacy mode with zero component-syntax rewrites — 546 of 547 components byte-identical, one authorized 3-line local-variable rename, no `componentApi` shim anywhere"
      requirement: TOOL-01
      verification:
          - kind: other
            ref: "cmd: git diff --name-only 30137730..HEAD -- '**/*.svelte' ':!src/frontend/components/settings/tabs/Connection.svelte' → empty; git diff --numstat for that file → 3/3 lines; grep -rn 'componentApi' src vite.config.mjs svelte.config.mjs → none"
            status: pass
      human_judgment: false
    - id: D2
      description: "The six `new App(...)` sites are `mount(App, ...)` and no `new App(` remains; the deprecated Svelte 4 instantiation shim is unused"
      requirement: TOOL-01
      verification:
          - kind: other
            ref: "cmd: grep -rn 'new App(' src → none; grep -rc 'mount(' src/frontend/main.ts src/server/*/main.ts → 6 files, 1 each"
            status: pass
      human_judgment: false
    - id: D3
      description: "Renderer builds on Vite 8.0.16 preserving the IIFE library bundle shared by the main window and every output window: `npm run build` exits 0 with the plan 01-02 assertion passing, exactly one non-empty `bundle.css`, a minified `bundle.js` and four non-empty server `styles.css`"
      requirement: TOOL-02
      verification:
          - kind: other
            ref: "cmd: npm run build (exit 0) — assertion output: 'Build output assertion passed: bundle.css (257310 bytes, 3 component selectors), bundle.js, production HTML literal, electron build'"
            status: pass
      human_judgment: false
    - id: D4
      description: "The output window renders pixel-identically to the plan 01-01 baseline at 1920x1080 with `maxDiffPixels: 0` (gate not regenerated)"
      requirement: TOOL-02
      verification:
          - kind: e2e
            ref: "playwright config/testing/playwright.config.ts output-render → 2 passed (42.8s) against output-1920x1080-darwin.png"
            status: pass
      human_judgment: false
    - id: D5
      description: "`npm start` reaches a ready dev server with no compiler errors and no `a11y_` warnings, with `public/build/` and `build/` proven absent beforehand and `public/index.html` restored to the dev literal afterwards"
      requirement: TOOL-01
      verification:
          - kind: other
            ref: "cmd: npm start → 'VITE v8.0.16 ready in 412 ms'; public/build + build absent immediately after preBuild; 0 error-severity Svelte diagnostics; 0 a11y hits; then node scripts/cleanBuilds.js && git status --porcelain public/index.html → empty"
            status: pass
      human_judgment: false
    - id: D6
      description: "TypeScript 5.9.3 with svelte-check 4.7.7 and Vitest 4.1.12 upgraded together, `strict: false` genuinely in effect, and Vitest at exact baseline parity (2 failed / 179 passed / 181 total — the two known pre-existing syncManager failures)"
      requirement: TOOL-03
      verification:
          - kind: unit
            ref: "cmd: npx vitest run --config config/testing/vitest.config.ts → Test Files 1 failed | 11 passed (12); Tests 2 failed | 179 passed (181)"
            status: pass
      human_judgment: false
    - id: D7
      description: "The `a11y_` snake_case warning prefix replaces `a11y-` in both Vite configs AND is proven to actually suppress (not merely to be silent)"
      requirement: TOOL-02
      verification:
          - kind: other
            ref: "cmd: grep -n 'a11y' vite.config.mjs config/building/vite.config.servers.mjs → `a11y_` in both, `a11y-` absent; `a11y_` codes in build log = 0 while svelte-check reports 129 real a11y warnings"
            status: pass
      human_judgment: false
    - id: D8
      description: "Criterion 4 — nothing was *silently* made different. This deliverable FAILED to be fully achievable: the build log now carries 165 NEW `element_invalid_self_closing_tag` warnings (158 frontend files + 7 server sites) that Svelte 3 did not emit. It is not a plan `fails_when` (exit 0, no `a11y_` code) but it is a material change in observable compiler output that criterion 4's intent covers."
      requirement: TOOL-02
      verification: []
      human_judgment: true
      rationale: "Whether 165 new warnings constitute acceptable log noise or a defect to fix is a judgment call with product consequences (threat T-03-07 is exactly about 'normalising ignored output — which is how a real warning gets missed'). Automation can count the warnings; it cannot decide whether to suppress them with a new `onwarn` prefix, fix the 165 sites, or leave them. Plan 01-04 owns the parity judgment."

# Metrics
duration: 47min
completed: 2026-10-18
status: complete
---

# Phase 1 Plan 3: Toolchain Swap Summary

**Svelte 3.59.2 → 5.57.2 legacy mode + Vite 4.5.14 → 8.0.16 (Rolldown) + TypeScript 4.9.5 → 5.9.3, with 546 of 547 components byte-identical, one authorized 3-line rename, a pixel-identical output window, and an exit-0 production build**

## Performance

- **Duration:** 47 min (this session; Tasks 1–2 were completed in a prior session)
- **Started:** 2026-10-18T00:31:16Z
- **Completed:** 2026-10-18T01:18:00Z
- **Tasks:** 3/3
- **Files modified:** 24 source/config files (2,321 insertions / 3,245 deletions, dominated by `package-lock.json`)

## Accomplishments

- **The whole build platform moved in one atomic step.** Seven devDependencies jumped majors simultaneously — Svelte (2 majors), Vite (4), TypeScript (1), `@sveltejs/vite-plugin-svelte` (5), `@tsconfig/svelte` (3), `svelte-check` (2), Vitest (2) — resolved from a single coherent `npm install` with no `--force` and no `--legacy-peer-deps`.
- **The migration is mechanical, and that is now proven rather than asserted.** `546 of 547` components are byte-identical. The single exception is a 3-line local-variable rename in `Connection.svelte`, authorized in `c354a394` and recorded below.
- **The output path is untouched.** The pixel gate passed 2/2 at `maxDiffPixels: 0` against the pre-upgrade `-darwin` baseline, and it was **compared, not regenerated** — no `--update-snapshots` was passed.
- **No `new App(` remains and `componentApi` is set nowhere**, so the deprecated Svelte 4 instantiation shim is genuinely unused rather than temporarily propping the app up.
- **The a11y suppression is proven to suppress.** This is stronger than the plan asked for: `svelte-check` (which does not apply the Vite `onwarn` filter) reports **129 real a11y warnings**, while the build log carries **0** `a11y_` codes. The kebab→snake rename works; the suppression is live, not inert.
- **`strict: false` landed.** The plan's exact Pitfall-1 signature check is clean: **TS7006/TS7031 = 0** in a 144-error run. Had `@tsconfig/svelte@5`'s `strict: true` leaked through, implicit-any errors would dominate in the thousands.

## Task Commits

1. **Task 1: Install the new toolchain and switch every compiler entry point** — `cc6d0b94` (feat!) — Svelte 5 + Vite 8 + TypeScript 5.9; six `mount()` sites; `vitePreprocess()`; `a11y_` in both Vite configs
2. **Task 2: Pin the tsconfig surface and type-only the eight ambiguous imports** — `9b785ede` (fix) — `strict:false` + `module`/`moduleResolution`/`verbatimModuleSyntax` pins; 8 type-import lines
3. **Task 2 (follow-up): complete the type-import sweep, keep runtime classes as values** — `065c8c90` (fix) — the 3 extra ambiguous imports found beyond the plan's 8
4. **Task 3 (authorized exception): rename shadowed const in `Connection.svelte`** — `1cf9c0a2` (fix) — 3 lines, the only `.svelte` change in the phase
5. **Plan metadata:** `c354a394` (docs) — authorization of the criterion-1 exception

## Installation: resolved versions

Read from `node_modules/*/package.json` rather than trusting `package.json` ranges (threat T-03-01):

| Package | Planned | Resolved |
|---|---|---|
| `svelte` | 5.57.2 | **5.57.2** |
| `@sveltejs/vite-plugin-svelte` | 7.1.2 | **7.1.2** |
| `vite` | 8.0.16 | **8.0.16** |
| `typescript` | 5.9.3 | **5.9.3** |
| `@tsconfig/svelte` | 5.0.0 | **5.0.0** |
| `svelte-check` | 4.7.7 | **4.7.7** |
| `vitest` | 4.1.12 | **4.1.12** |
| `prettier-plugin-svelte` | ^3.4.0 (held) | **3.4.0** |
| `prettier` | ^3.6.2 (held) | **3.6.2** |
| `rollup` | (transitive) | 4.59.0 |
| `electron` | ^37.10.3 (held) | 37.10.3 |
| `terser` | ^5.43.1 | 5.43.1 |
| `@rollup/plugin-terser` | ^1.0.0 (held) | 1.0.0 |
| `eslint-plugin-svelte` | ^3.23.1 (held) | 3.23.1 |

**Lockfile audit (threat T-03-06).** `package-lock.json`: `2273 insertions / 3185 deletions`; 59 top-level dirs added, 116 removed, 23 version-changed. Every addition and removal traces to a known cause, and **no unintended package identity changed**:

- **Rolldown replaces esbuild + Rollup** — 22 `@rolldown/binding-*` added, `rolldown` + `@oxc-project/types` added; `esbuild` and all 24 `@esbuild/*` platform binaries removed.
- **Lightning CSS** (Vite 8's CSS minimiser) — `lightningcss` + 12 platform binaries added.
- **Svelte 5 runtime/compiler deps** — `@sveltejs/acorn-typescript`, `@sveltejs/load-config`, `aria-query`, `axobject-query`, `clsx`, `devalue`, `esm-env`, `esrap`, `locate-character`, `zimmerframe` added; `svelte-hmr`, `svelte-preprocess`, `svelte-inspector`, `@sveltejs/vite-plugin-svelte-inspector` removed.
- **Vitest 4 transitives** — `@vitest/*` bumped 2.1.9→4.1.12; `tinypool`, `tinyspy`, `vite-node`, `check-error`, `deep-eql`, `loupe`, `pathval` etc. removed.

`electron`, `electron-builder`, `@rollup/plugin-terser` and `npm-run-all2` are absent from the version-changed list — held constant as required.

## Task 3 verification results (all raw numbers)

### 1. Production build — PASS

`npm run build` → **exit 0**. Chain: `prebuild` → `build:frontend:prod` → `build:servers:prod` → `build:electron:prod` → `postbuild`.

Assertion output verbatim:

```
Build output assertion passed: bundle.css (257310 bytes, 3 component selectors), bundle.js, production HTML literal, electron build
```

**Terser: no fallback rung needed.** `postbuild` completed without `process.abort()`. Rung (a)/(b)/(c) of the RESEARCH Q2 ladder were not required — record the empirical result as "none needed".

### 2. Bundle and CSS contract — PASS

| Artifact | Size | Check |
|---|---|---|
| `public/build/bundle.css` | 257,310 B | exactly one CSS asset; non-empty |
| `public/build/bundle.js` | 3,930,087 B | non-empty; **minified** (0 occurrences of the `// ----- FreeShow -----` banner) |
| `build/electron/remote/styles.css` | 91,981 B | non-empty |
| `build/electron/stage/styles.css` | 19,059 B | non-empty |
| `build/electron/controller/styles.css` | 4,601 B | non-empty |
| `build/electron/output_stream/styles.css` | 1,482 B | non-empty |

### 3. Output-window pixel gate — PASS

```
npx playwright test --config config/testing/playwright.config.ts output-render
→ Running 2 tests using 1 worker
→ 2 passed (42.8s)
```

Baseline `output-1920x1080-darwin.png` verified non-uniform at capture. Threshold remained `maxDiffPixels: 0`; **no threshold change and no diff-artifact investigation was necessary**. `--update-snapshots` was not passed.

### 4. Dev launch — PASS

```
PREBUILD_CLEANED_BUILD_DIRS=1        # public/build and build both absent immediately after start
PUBLIC_BUILD_EXISTS=no
BUILD_EXISTS=no
VITE_READY=1                         # "VITE v8.0.16  ready in 412 ms"
```

- **0 error-severity Svelte diagnostics.**
- **0 a11y hits** of any spelling.
- **RESEARCH Open Question 4 is answered, and the answer is "discovery does not happen"**: the dev log prints
  `[vite-plugin-svelte] no Svelte config found at /Users/clintonemok/Work/freeshow/public - using default configuration.`
  Dev `root` is `public/` (`vite.config.mjs:20`), where `svelte.config.mjs` does not exist. The inline `preprocess` at `vite.config.mjs:9` is therefore **load-bearing, not decorative** — removing it would silently drop TypeScript preprocessing in dev while production (root `.`) kept working.

### 5. Dev state restore — PASS

`node scripts/cleanBuilds.js` → `git status --porcelain public/index.html` **empty**; `public/index.html` contains `<script type="module" src="/src/frontend/main.ts"></script>`; `public/build/` and `build/` both removed.

## The authorized criterion-1 exception

**File:** `src/frontend/components/settings/tabs/Connection.svelte` — **the only `.svelte` change in the whole phase**, `3 insertions / 3 deletions`.

```diff
-    {@const connections = Object.keys($connections[server.id.toUpperCase()] || {})?.length || 0}
+    {@const connectionCount = Object.keys($connections[server.id.toUpperCase()] || {})?.length || 0}
-                {#if connections}
-                    <span style="opacity: 0.5;font-size: 0.7em;margin-left: 5px;">{connections}</span>
+                {#if connectionCount}
+                    <span style="opacity: 0.5;font-size: 0.7em;margin-left: 5px;">{connectionCount}</span>
```

**Verified after the edit:** `grep -n 'connections'` on the file returns exactly two lines — the untouched store import at line 6 (`... connections, contentProviderData ...`) and line 224, where `$connections` still reads the imported store. No other identifier was renamed.

**Why it is not a criterion-1 violation.** The `{@const connections = …}` binding shadowed the top-level imported `connections` store in nested scope, so `$connections` became a *scoped* subscription. Svelte 5 raises a hard, unconditional compile error for this (`svelte.dev/e/store_invalid_scoped_subscription`); all five compile variants were enumerated and all five throw, while Svelte 4 compiled it silently. Renaming a local variable that shadows an imported store is a **latent-bug fix**: behaviour unchanged, no logic moved, no API changed, no other component touched. Rejecting it would mean Svelte 5 cannot ship at all and the milestone is abandoned over a shadowing bug Svelte 5 is right to reject. Confirmed by direct compile: `COMPILE OK (client, dev:false, runes:false)`.

Bound respected: 3 changed lines (limit 8), and the file is the only `.svelte` entry in the phase diff (verified with the plan's own exclusion-path command, which returns empty).

## Gate results vs. baseline

### svelte-check — measured, not reduced (plan 01-04 owns the parity judgment)

```
baseline/svelte-check.txt : COMPLETED 2244 FILES   338 ERRORS   47 WARNINGS  598 HINTS
post-swap (this run)      : COMPLETED 2173 FILES   144 ERRORS  291 WARNINGS  (svelte-check 4 no longer reports HINTS)
```

Command for both: `npx svelte-check --tsconfig config/typescript/tsconfig.svelte.json --output machine`.

**Pitfall 1 is clear:** `TS7006`/`TS7031` = **0**. Had `strict: true` leaked from `@tsconfig/svelte@5`, implicit-any errors would dominate the output.

**Pitfall 2 is clear:** no `TS5102` (the removed `importsNotUsedAsValues` no longer reaches the compiler).

**Error composition (144):**

| Count | Cause |
|---|---|
| 89 | `src/frontend/utils/popup.ts` alone — `Type '__sveltets_2_IsomorphicComponent<...>' is not assignable to type 'ComponentType'`, a single Svelte 5 component-typing consequence repeated |
| ~18 | `verbatimModuleSyntax` type-only-import errors inside `node_modules/json-bible` (a dependency's own source being type-checked) |
| ~37 | assorted scattered type errors (property-not-found, unused vars, one `Cannot find module '../../../types/Audio'`) |

**Warning composition (291):** 157 `element_invalid_self_closing_tag` + 129 `a11y_*` + 5 other. All 291 are in `.svelte` files and all are warnings, not errors.

**`FILES` moved 2244 → 2173 (−71).** Both runs used the identical tsconfig path; the chain changed underneath it (`@tsconfig/svelte` 2.0.1 → 5.0.0 plus the new `moduleResolution: "Bundler"` and `verbatimModuleSyntax` pins), which changes `node_modules`/`@types` resolution and therefore how many type declarations are pulled into the program. Flagged explicitly for 01-04 to judge — it is not attributable to any *source* file leaving the program (all 547 `.svelte` files are still checked: 288 of the new warnings come from `src/frontend/components/**`).

### Individual lint jobs (non-mutating only)

`npm run lint` was **not** run, per constraint and per 01-02's finding that the chain is red by construction (`npm-run-all -s` stops at `lint:electron`, which has 209 unfixable errors). Plan verification item 5 states `npm run lint` "still exits 0 with all four jobs" — that premise was already false at baseline; the item is not executable as written. `lint:electron` and `lint:frontend` carry `--fix` and were not invoked.

`lint:svelte` was run because it has **no** `--fix` and because `config/linting/eslint.svelte.flat.mjs:4` imports `svelte.config.mjs` — the file this plan rewrote. STATE.md flagged that dependency as a 01-03 obligation.

```
npm run lint:svelte → exit 1
  ✖ 185 problems (185 errors, 0 warnings)   across 94 files
  (01-02 post-migration: 172 err / 0 warn; baseline: 167 err / 39 warn)
```

- **The flat config still loads the new `svelte.config.mjs`** — the import resolves and the job runs. Obligation discharged.
- Rule distribution: `no-inferrable-types` 96, `no-unnecessary-type-assertion` 34, `no-empty-function` 15, `no-unused-vars` 14, `no-unused-expressions` 8, `require-await` 7, `no-redundant-type-constituents` 7, `no-unsafe-unary-minus` 2, `consistent-type-imports` 2.
- **+13 vs 01-02's 172.** The 111 findings from the two rules typescript-eslint v8 dropped from its presets are unchanged (96 + 15 = 111); the movement is in the *type-aware* rules, which now evaluate against TypeScript 5.9 and the new tsconfig instead of TypeScript 4.9. Better type information ⇒ more findings, on unchanged source.
- `Connection.svelte` appears once, at **line 84** (`no-unused-expressions` on `$disabledServers`) — outside all three of this session's diff hunks (`@@ -224`, `@@ -243,2`), so it is pre-existing.

### Vitest — exact baseline parity

```
Tests        2 failed | 179 passed (181)
Test Files   1 failed | 11 passed (12)
Duration     26.15s
```

`numTotalTests: 181`, `numPassedTests: 179`, `numFailedTests: 2`, `numSkippedTests: 0`. Both failures are the known pre-existing `src/electron/cloud/syncManager.test.ts` cases recorded in `baseline/` — **no newly failing test.**

### Format parity — exact

`npx prettier --config config/formatting/.prettierrc.yaml --check src scripts` → **40 files**, and the file *set* is byte-identical to `baseline/format.txt` (`comm -23` and `comm -13` both empty): zero new unformatted files, zero resolved. The touched files, including the edited `Connection.svelte`, pass prettier.

### Grep and diff gates

| Gate | Result |
|---|---|
| `grep -rn 'new App(' src` | **none** |
| `grep -rc 'mount(' src/frontend/main.ts src/server/*/main.ts` | **6 files, 1 each** |
| `grep -rn 'componentApi' src vite.config.mjs svelte.config.mjs` | **none** |
| `grep -rln 'svelte/internal\|\$\$restProps\|\.\$set(' src` | **none** |
| `a11y-` in either Vite config | **none** |
| `a11y_` in both Vite configs | `vite.config.mjs:15`, `vite.config.servers.mjs:79` |
| `svelte-preprocess` in `svelte.config.mjs`/`package.json` | **absent** |
| `git diff --name-only 30137730..HEAD -- '**/*.svelte' ':!Connection.svelte'` | **empty** |
| `git diff --numstat … Connection.svelte` | **3/3** (limit 8) |
| `git diff --name-only … -- src/electron src/preload.ts` | **empty** |
| `git diff --name-only … -- .github` | **empty** |
| `grep -c 'continue-on-error: true' .github/workflows/ci.yml` | **2** (unchanged) |
| Six entry-site diff | only `import { mount } from "svelte"` + the `mount(App, …)` line |

## Findings for plan 01-04

**1. 165 new `element_invalid_self_closing_tag` warnings — the build log is no longer clean.**

This is the one material surprise of the swap and it belongs to criterion 4's intent ("nothing silently made different") even though it trips none of the plan's `fails_when` conditions. Svelte 5 warns about self-closing non-void HTML elements; Svelte 3 accepted them silently. Composition: **158 distinct `src/frontend` files** (158 warnings) + **7 `src/server` sites**, of which the dev run surfaced `src/server/common/components/Checkbox.svelte:5`, `src/server/common/components/Loader.svelte:5`, `src/server/output_stream/App.svelte:172`, `src/server/remote/components/Auth.svelte:52`, `src/server/remote/components/MaterialButton.svelte:112`, `src/server/stage/App.svelte:138`, `src/server/stage/components/PreviewCanvas.svelte:66`, `src/server/stage/components/Timer.svelte:74` and `:76`.

They are **warnings, exit code stays 0, and they are not `a11y_` codes**, so the `onwarn` filter never sees them. Threat T-03-07 is precisely about log flooding training reviewers to ignore output, and 165 warnings is well past that line. Three defensible responses — **and this is 01-04's call, not a silent fix here**: (a) add `element_invalid_self_closing_tag` to the `onwarn` suppression alongside `a11y_`; (b) fix the 158+7 sites (a real 165-line source diff, which would itself collide with criterion 1's "464 components source-unchanged" and needs its own authorization); (c) accept them and record why. **Recommendation: (a)**, because it matches the a11y precedent exactly and keeps criterion 1 intact.

**2. `[EMPTY_IMPORT_META]` — 5 warnings, informational.**

`import.meta` is replaced with `{}` in `iife` output. Sites: `node_modules/pdfjs-dist/build/pdf.mjs:8188`, `src/server/stage/App.svelte:53`, `src/server/remote/components/Auth.svelte:18`. The two app sites are pre-existing `new URL("...", import.meta.url).href` logo lookups (`stage/App.svelte:15`, `remote/components/Auth.svelte:8`), untouched by this phase and untouched by any diff. An IIFE bundle cannot carry `import.meta` under any bundler; Rolldown simply words the warning differently from Rollup. **Not a regression** — recorded so it is not mistaken for one.

**3. RESOURCES for 01-04's parity judgment.**

- svelte-check: `144 ERRORS` (vs 338) and `291 WARNINGS` (vs 47) — read the composition above, not the net.
- `lint:svelte`: 185 errors / 0 warnings vs 172 at 01-02 vs 167 at baseline (+13 from TS-5.9-aware type rules).
- FILES: 2173 vs 2244 — explain by the tsconfig base change, verify no source file dropped.
- `bundle.js` is 3.93 MB minified. Vite 8's default minifier changed and the gate here is only "minified at all" (banner absent). A size *budget* is P2's job, but the new baseline number is 3,930,087 B / `bundle.css` 257,310 B.

## Deviations from Plan

### Authorized exception (not a deviation — pre-approved in `c354a394`)

**1. Criterion 1 — `Connection.svelte` 3-line rename.** Fully documented above and in the plan's `<criterion_1_amendment>`. Bounded exactly as authorized: ≤8 lines, the only `.svelte` file in the phase diff.

### Rule 3 - Blocking (from Task 1/2, committed in the prior session)

**2. Three additional ambiguous type imports beyond the plan's eight.**

- **Found during:** Task 2
- **Issue:** `verbatimModuleSyntax: true` (inherited from `@tsconfig/svelte@5`) promotes ambiguous value/type imports to bundler errors. The plan's enumerated set of 8 was incomplete.
- **Fix:** `src/frontend/ai/scripture/BibleCacheManager.ts`, `src/frontend/components/timeline/TimelineActions.ts`, `src/frontend/components/timeline/TimelinePlayback.ts` were also type-only-ed (1, 1 and 1 lines respectively; `TimelinePlayback.ts` carries the plan's `Unsubscriber` fix on one of its two lines).
- **Verification:** `npm run build` exits 0; svelte-check reports no "X is not exported by" bundler errors.
- **Committed in:** `065c8c90`

**3. Runtime classes kept as value imports, against the plan's verify script.**

- **Found during:** Task 2 verification (re-confirmed this session)
- **Issue:** the plan's Task 2 verify script requires `AudioMultichannel`, `AudioProcessor` and `PitchShiftNode` in `src/frontend/audio/audioAnalyser.ts` to be type-only. They are **runtime classes**, not types: `export class AudioMultichannel` (`audioMultichannel.ts:8`), `export class AudioProcessor` (`audioProcessor.ts:9`), `export class PitchShiftNode` (`audioProcessor.ts:50`). They are used as values — `AudioMultichannel.DEFAULT_CHANNELS`, `AudioProcessor.createNode(this.ac)`, `source instanceof PitchShiftNode`. Making them type-only would erase the bindings and, under `verbatimModuleSyntax`, produce a bundler error.
- **Fix:** none needed in the source — the committed code is correct. `MultichannelInfo` (an `export interface`) is type-only, as the plan intended; the three classes are not. The plan's **verify script** is what is wrong.
- **Verification:** running the plan's own assertion fails on exactly these 3 names and passes on the other 5 files: `not type-only: … AudioMultichannel / AudioProcessor / PitchShiftNode` → `FAIL 3`.
- **Committed in:** `065c8c90`
- **Action taken:** recorded here as a **known plan defect**. The plan file was deliberately **not** amended (per instruction), so 01-04 and later readers should treat the plan's Task 2 `<automated>` block as superseded by this note for those three names.

### Plan-defect note

**4. Plan verification item 5 is unexecutable as written.** It requires `npm run lint` to exit 0 with all four jobs. Per 01-02's recorded finding, the chain has never exited 0 — `npm-run-all -s` stops at `lint:electron` (209 unfixable baseline errors) — and running it applies `--fix` to `src/electron/**` and `src/frontend/**`. It was not run. Individual non-mutating jobs were used instead (`lint:svelte` above). This is a plan defect, not a phase failure.

---

**Total deviations:** 3 auto-fixed/handled (3 Rule 3 - Blocking) + 1 authorized exception + 2 recorded plan defects
**Impact on plan:** All three auto-fixes were mandatory for the build to compile and were strictly line-scoped. No scope creep: no logic changed, no component rewritten, no Electron/IPC/window option touched.

## Issues Encountered

- **Vite 8 is Rolldown, not Rollup.** The observability changed more than the plan anticipated: `[EMPTY_IMPORT_META]` and `element_invalid_self_closing_tag` are Rolldown/Svelte-5-era diagnostics. Nothing broke, but the log's composition is not comparable to the pre-upgrade log line-for-line. Recorded so 01-05's smoke evidence is read against the right expectations.
- **The `--force`-free install resolved cleanly on the first attempt.** No missing peer had to be added to the install group.
- **`postbuild` did not Terser-abort.** RESEARCH Q2's three-rung fallback ladder was not needed at any rung. The containment reasoning still holds: the shipped `public/build/bundle.js` is Vite-minified and never passed through Terser.
- **Dev launched an Electron window during the dev-launch proof** (expected — `start.js` spawns `electron .`). It was terminated with the rest of the process group; `pgrep` confirmed no survivors.

## User Setup Required

None — no external service configuration was required.

## Next Phase Readiness

**Ready.** The toolchain gate is closed on its own terms: Svelte 5.57.2 legacy mode, Vite 8.0.16, TypeScript 5.9.3, svelte-check 4.7.7 and Vitest 4.1.12 all install and build from one coherent tree; the app launches in dev and the output window is pixel-identical at zero tolerance.

**Carried into 01-04:**

- The **165 `element_invalid_self_closing_tag` warnings** decision (see Findings §1). This is the most consequential open item — it needs an explicit choice, not a default.
- svelte-check parity: 144/291 vs 338/47, with the −71 FILES delta to attribute.
- `lint:svelte` 185 vs 172 vs 167 — confirm the +13 is TS-5.9 type-awareness and not check loss.
- The two pre-existing Vitest failures remain the ceiling; nothing new may fail.

**Carried into 01-05:** the Linux `xvfb-run` screen-size widening (`1280x960` → `1920x1080`) is still required before `-linux.png`/`-win32.png` baselines can be committed; until then those platforms skip by design.

**Unchanged and asserted:** `src/electron/**` and `preload.ts` appear in no diff, `.github/**` appears in no diff, and `ci.yml` still carries exactly two `continue-on-error: true` entries. `prettier-plugin-svelte` remains `^3.4.0` and `svelte-preprocess` is gone.

**One rule to carry forward:** if a code-emitting TypeScript feature (`enum`, `using`, decorators, parameter properties) is ever introduced inside `<script lang="ts">`, `vitePreprocess()` must be given `{ script: true }` or the feature must move to a `.ts` module — the current `{ script: false, style: true }` default silently strips types without transforming such features.

---

*Phase: 01-toolchain-gate*
*Completed: 2026-10-18*
