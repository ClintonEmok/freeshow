---
phase: 01-toolchain-gate
plan: 02
subsystem: infra
tags: [vite, rollup, cssFileName, assetFileNames, terser, eslint, eslint-plugin-svelte, typescript-eslint, flat-config, ESLINT_USE_FLAT_CONFIG, svelte/valid-compile, build-guard]

# Dependency graph
requires:
    - phase: 01-toolchain-gate
      provides: "01-01's pre-upgrade baselines (baseline/lint.json per-job counts + ruleBreakdown), the pinned svelte-check command, and the output-window pixel gate with `maxDiffPixels: 0`"
provides:
    - "build.lib.cssFileName on both library-mode configs (`bundle` renderer / `styles` per server) plus an API-agnostic `assetFileNames` that survives Rollup 3 and 4"
    - "scripts/assertBuildOutput.js — a six-assertion build contract wired into `postbuild`, observed failing on five independent breakages"
    - "`terser` declared as a devDependency"
    - "config/linting/eslint.svelte.flat.mjs — the flat-config Svelte lint job (eslint-plugin-svelte@3) with an explicit, fixture-proven `svelte/valid-compile`"
    - "Both eslintrc lint jobs loading under typescript-eslint v8 (`recommended-type-checked`, no removed rule names)"
affects: [01-03, "01-04 (post-upgrade counts compare against baseline/lint.json)", 01-05]

# Actuals (#2632) — chars/4 over the realized diff.
actuals:
    tokens: 24300
    tasks: 3
    commits: 3

tech-stack:
    added:
        - "eslint-plugin-svelte@3.23.1 (flat-config only)"
        - "svelte-eslint-parser@1.9.0"
        - "typescript-eslint@8.71.2 (meta package; replaces @typescript-eslint/eslint-plugin@5 + @typescript-eslint/parser@5)"
        - "terser@^5.43.1 (was resolving only through npm hoisting)"
    removed:
        - "eslint-plugin-svelte3@4.0.0"
        - "@typescript-eslint/eslint-plugin@^5.62.0"
        - "@typescript-eslint/parser@^5.62.0"
    patterns:
        - "Build contract as an assertion: the emitted-asset name is stated by config where the tool allows it (`cssFileName`) and asserted by a script where it does not (the postbuild HTML literal)"
        - "A migrated lint job must be proven to FIRE, not just to pass: a fixture with a deliberate compile error is the only way to distinguish 'clean' from 'inert'"
        - "Check-population parity: where an upstream preset drops a rule that produced recorded findings, the rule is re-enabled explicitly rather than the lower number being adopted"

key-files:
    created:
        - scripts/assertBuildOutput.js
        - config/linting/eslint.svelte.flat.mjs
    modified:
        - vite.config.mjs
        - config/building/vite.config.servers.mjs
        - package.json
        - package-lock.json
        - config/linting/eslint.electron.json
        - config/linting/eslint.frontend.json
    deleted:
        - config/linting/eslint.svelte.js

key-decisions:
    - "`cssFileName` is added now even though Vite 4.5.14 ignores it: it is inert until plan 01-03's Vite bump, and having it in place means the CSS name never depends on the rename hook at any point in the migration."
    - "`lint:svelte` no longer passes `--fix`. eslint-plugin-svelte@3 declares `supportsAutofix: true` (svelte3 did not), so `--fix` silently rewrote `.svelte` sources — proven on a copy of Top.svelte. Criterion 1 (464 components source-unchanged) outranks keeping a flag whose only effect was to edit frozen components."
    - "`svelte/valid-compile` is enabled by hand with `ignoreWarnings: true`. It ships in NO eslint-plugin-svelte@3 preset (verified in the installed package: 0 occurrences in base.js/recommended.js/all.js), so a preset swap would have dropped the compiler check while reporting '0 problems'."
    - "The flat config is built on `svelte.configs.base` (3 rule ids) and `ts.configs.recommendedTypeChecked`, not the presets the code sketch in 01-RESEARCH.md suggested: `svelte.configs.recommended` carries 37 `svelte/*` rules that would fail 464 unchanged components, and typescript-eslint v8's non-type-checked `recommended` carries zero type-aware rules."
    - "The two rules typescript-eslint v8 dropped from its presets (`no-inferrable-types`, `no-empty-function`, 111 recorded findings) are re-enabled explicitly in all three configs, because adopting the lower number would be exactly the silent check loss TOOL-03 forbids."
    - "The `--fix` flags on `lint:electron` and `lint:frontend` are left untouched (pre-existing behaviour on non-frozen `.ts` files); every measurement in this summary was taken with the baseline's own convention (`--format json`, no `--fix`)."

patterns-established:
    - "Measure against the recorded baseline, never memory: every lint count in this summary is compared per-rule against `baseline/lint.json`, and every movement is classified (parity / new / reduction) rather than netted out"
    - "Destructive flags must be proven not to touch frozen sources before a migrated check is accepted (`--fix` probe on a copy)"
    - "Config keys that a dependency renames (`ban-types`, `no-var-requires`) are renamed with them, because leaving the old key silently changes behaviour while looking unchanged"

requirements-completed: [TOOL-02, TOOL-03]

coverage:
    - id: D1
      description: "Both library-mode build configs name their CSS through `build.lib.cssFileName` and read asset names through an API-agnostic `assetInfo.names ?? [assetInfo.name]` hook that cannot throw on Rollup 4"
      requirement: TOOL-02
      verification:
          - kind: other
            ref: "cmd: npm run build && ls public/build/*.css (exactly bundle.css) && for s in remote stage controller output_stream; do test -s build/electron/$s/styles.css; done"
            status: pass
      human_judgment: false
    - id: D2
      description: "scripts/assertBuildOutput.js asserts the single `bundle.css`, non-empty bundle.js, the production HTML literal, three real component selectors, and build/electron/index.js; wired into `postbuild`"
      requirement: TOOL-02
      verification:
          - kind: other
            ref: "cmd: npm run build (exit 0, assertion inside the postbuild chain) + five observed failures: renamed stylesheet, second CSS asset, dev HTML literal, missing .dragger selector, missing electron build"
            status: pass
      human_judgment: false
    - id: D3
      description: "`terser` declared in devDependencies (scripts/postBuild.js:4 requires it; it previously resolved only through npm hoisting)"
      requirement: TOOL-02
      verification:
          - kind: other
            ref: "cmd: node -e \"require('./package.json').devDependencies.terser\" && npm ls terser --depth=0"
            status: pass
      human_judgment: false
    - id: D4
      description: "The Svelte lint job runs on eslint-plugin-svelte@3 flat config with `svelte/valid-compile` explicitly enabled, and was observed producing a `svelte/valid-compile` finding for a deliberate compiler error"
      requirement: TOOL-03
      verification:
          - kind: other
            ref: "cmd: ESLINT_USE_FLAT_CONFIG=true npx eslint -c config/linting/eslint.svelte.flat.mjs <fixture with invalid CSS> -> 1 problem: 'Declaration cannot be empty(invalid-declaration)  svelte/valid-compile'"
            status: pass
      human_judgment: true
      rationale: "The fixture probe is a historical observation (the fixture is deliberately removed before commit). A verifier must judge the recorded transcript rather than re-run an assertion that no longer exists."
    - id: D5
      description: "The electron and frontend eslintrc jobs load and run under typescript-eslint v8 with no rule left undefined and no job reporting zero files"
      requirement: TOOL-03
      verification:
          - kind: other
            ref: "cmd: npx eslint -c config/linting/eslint.{electron,frontend}.json --ext .js,.ts src/{electron,frontend} --format json -> 149 files / 255 files, zero 'Definition for rule ... was not found'"
            status: pass
      human_judgment: false
    - id: D6
      description: "No rendered pixel changed: the output-window gate still passes against the committed pre-upgrade baseline at maxDiffPixels: 0"
      requirement: TOOL-02
      verification:
          - kind: e2e
            ref: "playwright:config/testing/output-render.test.ts -> 2 passed (42.0s), 'projector output frame is pixel-identical to the committed pre-upgrade baseline'"
            status: pass
      human_judgment: false
    - id: D7
      description: "All 464 `.svelte` components are source-unchanged (sha256 of the sorted file hashes is identical before and after the plan)"
      requirement: TOOL-03
      verification:
          - kind: other
            ref: "cmd: find src -name '*.svelte' | sort | xargs shasum -a 256 | shasum -a 256 -> 6e5441d05f3d0f6073d23c0bee5117268d548e2de14e67857c89c33d77aa97ce (identical to the pre-execution value); git diff --name-only c13fce7a..HEAD -- 'src/**/*.svelte' is empty"
            status: pass
      human_judgment: false

# Metrics
duration: 28min
completed: 2026-10-18
status: complete
---

# Phase 1 Plan 02: Pre-Bump Build and Lint Hardening Summary

**Deterministic CSS naming in both library-mode Vite configs plus a six-assertion build guard wired into `postbuild`, `terser` declared, and the Svelte lint job migrated to eslint-plugin-svelte@3 flat config with the compiler check kept alive by an explicit `svelte/valid-compile` — proven firing on a fixture, with all 464 `.svelte` components byte-identical throughout.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-10-17T23:36:17Z
- **Completed:** 2026-10-18T00:05:00Z
- **Tasks:** 3/3
- **Files modified:** 8 (2 created, 5 modified, 1 deleted)

## Accomplishments

- **The CSS name is now stated, not derived.** Both configs set `build.lib.cssFileName` (`"bundle"` renderer, `"styles"` servers), and both `assetFileNames` hooks read `assetInfo.names ?? (assetInfo.name ? [assetInfo.name] : [])`. On Vite 4.5.14 the option is inert; the hook now cannot throw on Rollup 4's missing `name`, which is the failure that would have happened *after* CSS extraction. Verified: `npm run build` emits exactly one `public/build/bundle.css` (268,799 bytes) and all four server output directories hold a non-empty `styles.css`.
- **The build contract is loud.** `scripts/assertBuildOutput.js` (new, CJS, `join(__dirname, "..")` paths, `Error` instances only) asserts six things and is chained into `postbuild`, so `npm run build` itself fails on a broken contract. It was **observed failing five times**, once per assertion: renamed stylesheet, a second `.css` asset, the dev HTML literal, a renamed `.dragger` selector, and a missing `build/electron/index.js`.
- **`terser` is declared** (`^5.43.1`) — `scripts/postBuild.js:4` requires it and `vite.config.servers.mjs:106` sets `minify: "terser"`; it previously resolved only because npm hoisted it in from `@rollup/plugin-terser`.
- **The Svelte lint job is migrated, not deleted, and it fires.** `config/linting/eslint.svelte.flat.mjs` replaces `eslint.svelte.js`; `lint:svelte` runs in flat mode under ESLint 8.57.1 (`ESLINT_USE_FLAT_CONFIG=true`, `-c`, no `--ext`, no `--fix`) and stays in the `lint` chain — the deliberate divergence from upstream's `svelte5` branch, which deleted the job outright.
- **The pixel gate is unchanged.** `output-render` passed **2/2 in 42.0s** against the committed 1920×1080 baseline with `maxDiffPixels: 0`, proving this plan altered no rendered pixel.

## Check-loss evidence: post-migration lint findings per job

Measured with the baseline's own convention (`--format json`, **no** `--fix`) from the repo root: `node .planning/phases/01-toolchain-gate/baseline/lint.json` for the recorded numbers.

| Job | Baseline | After 01-02 | Movement |
|---|---|---|---|
| `lint:electron` (149 files) | 212 err / 25 warn (237) | **269 err / 0 warn (269)** | +57 err, −25 warn |
| `lint:frontend` (255 files) | 630 err / 0 warn (630) | **677 err / 0 warn (677)** | +47 err |
| `lint:svelte` (464 files) | 167 err / 39 warn (206) | **172 err / 0 warn (172)** | +5 err, −39 warn |
| `lint:styles` (464 files) | 216 err / 0 warn (216) | **216 err / 0 warn** | unchanged ✔ |

Zero files were lost by any job, and no job reports zero problems. Every movement is accounted for per rule:

**`lint:svelte` (the job being migrated) — 61 errors of TS findings + 111 re-enabled + 0 warnings:**

| Rule | Baseline | After | Class |
|---|---|---|---|
| `no-inferrable-types` | 96 | 96 | **parity — restored.** v8 dropped it from `recommended`; re-enabled explicitly |
| `no-empty-function` | 15 | 15 | **parity — restored.** Same cause |
| `require-await` | 7 | 7 | parity |
| `no-unnecessary-type-assertion` | 44 | 21 | **reduction — rule still on**; v8 resolves the assertion's type differently |
| `no-unused-vars` | 5 | 14 | **new +9** — v8's implementation reports more (unused catch params, unused imports) |
| `no-unused-expressions` | 0 | 8 | **new** — v8 enables it in `recommendedTypeChecked` |
| `no-redundant-type-constituents` | 0 | 7 | **new** — rule did not exist in v5 |
| `no-unsafe-unary-minus` | 0 | 2 | **new** — rule did not exist in v5 |
| `consistent-type-imports` | 0 | 2 | **new by design** — added by this migration (matching `eslint.frontend.json`) |
| `a11y-*` compiler warnings | 39 | 0 | **muted by design** — `ignoreWarnings: true` |

The 39 a11y warnings are **not** out of the toolchain: the same 39 A11y diagnostics appear in `baseline/svelte-check.txt` (39 of the 47 recorded `WARNINGS`), so `test:svelte` still reports them, and Phase 6 is where a11y becomes a formal requirement. The muted codes and their baseline counts are recorded here as the plan requires: `a11y-click-events-have-key-events` 16, `a11y-autofocus` 9, `a11y-label-has-associated-control` 6, `a11y-no-noninteractive-tabindex` 4, `a11y-missing-attribute` 2, `a11y-role-has-required-aria-props` 2.

The 19 new findings all sit in `.svelte` files, which **cannot be edited in this phase** (criterion 1, zero component rewrites). They are therefore reported rather than fixed or suppressed: suppressing them would drop checks that TOOL-03 forbids losing, and they are far below the baseline's noise level.

**`lint:electron` — every rule the config ever enabled is still enabled:**

| Rule | Baseline | After | Class |
|---|---|---|---|
| `no-unused-vars` | 25 warn | 42 err | **severity change** — v8's preset sets it to `error`; +17 reports from the stricter implementation |
| `no-redundant-type-constituents` | 0 | 10 | new in v8's presets |
| `no-base-to-string` | 0 | 7 | new in v8's presets |
| `prefer-promise-reject-errors` | 0 | 6 | new in v8's presets |
| `await-thenable` | 3 | 6 | v8 reports more |
| `no-unnecessary-type-assertion` | 3 | 13 | v8 reports more |
| `restrict-plus-operands` | 20 | 0 | **v8 semantics** — the rule's `defaultOptions` became permissive (`allowAny`/`allowNumberAndString`/… now `true`); the config never set options, so it inherits them. Rule still enabled |
| `no-require-imports` | 0 (rule absent) → 18 → **0** | 0 | **fixed** — see deviation 3; the config's `no-var-requires: "off"` was renamed to its v8 successor so legitimate CommonJS `require()` in the main process is not flagged |
| `no-shadow` | 32 | 31 | −1, core rule, no config cause identified — recorded rather than explained away |
| all others (`no-console` 62, `require-await` 34, `no-empty` 19, `guard-for-in` 2, `radix` 3, `unbound-method` 4, `max-classes-per-file` 4, `no-underscore-dangle` 7, `id-blacklist` 1, `(no-rule)` 9) | — | identical | parity |

**`lint:frontend`** is the same story (`no-inferrable-types` 94 → 94 restored; `no-inferrable-types`-class parity; +8 `no-redundant-type-constituents`, +4 `no-base-to-string`, +3 `no-duplicate-type-constituents`, +41→ but 26→41 `no-unnecessary-type-assertion`, +13 `no-unused-vars`, +1 each of `no-array-delete`/`await-thenable`/`prefer-promise-reject-errors`, and one new `(no-rule)` parse error — see deviation 6); every other rule is byte-identical, including `prefer-const` 164, `no-shadow` 111, `radix` 13.

**Interpretation for verification check 4 ("each job's problem count ≤ baseline"):** the **problem totals** fell for `lint:svelte` (206 → 172) and are unchanged for `lint:styles`, but **rose** for `lint:electron` (237 → 269) and `lint:frontend` (630 → 677). Those rises are the v8 presets doing *more* work (rules that did not exist in v5, a rule whose severity moved from `warn` to `error`, stricter implementations) — no rule that the pre-migration config enabled has been dropped, and the one case where a rename would have silently changed behaviour (`no-var-requires`) was fixed. This is reported as a finding, not waved through.

## The `svelte/valid-compile` fixture probe — it genuinely fired

- **Spike (RESEARCH Q3, MEDIUM confidence):** `npx cross-env ESLINT_USE_FLAT_CONFIG=true eslint -c config/linting/eslint.svelte.flat.mjs src/frontend/components/helpers/T.svelte` → exit 0, **no config-format error**. Option A (the ESLint 8.57 flat bridge) is viable; Option B (bump ESLint to ^9 + migrate all four configs) was not needed.
- **Fixture A** (the plan's suggested unterminated `{#if}`, temporary file under `src/frontend/`): `5:0 error Parsing error: Block was left open` — 1 problem, proving the job is not inert. Note this fixture produces an ESLint **parse** error, not a `svelte/valid-compile` finding.
- **Fixture B** (invalid CSS in `<style>`, i.e. a Svelte **compiler** error the parser accepts): `9:1 error Declaration cannot be empty(invalid-declaration)  svelte/valid-compile` — 1 problem. **This is the proof that `svelte/valid-compile` is loaded and reporting.**
- **Negative control:** fixture removed → ESLint reports the file does not exist (no findings), and `git status --porcelain src` is empty. Both fixtures were removed before the commit.
- **Preset claim verified against the installed package** (`node_modules/eslint-plugin-svelte/lib/configs/flat/`): `valid-compile` appears in **zero** preset files — `base.js` (3 ids: `svelte/comment-directive`, `svelte/system`, `svelte/svelte`), `recommended.js` (37 ids), `all.js` (1), `prettier.js` (12). It exists only as `lib/rules/valid-compile.js` and in `lib/utils/rules.js`'s registry.

## Task Commits

1. **Task 1: Make both library-mode build configs independent of Vite and Rollup defaults** — `8ece76cc` (chore)
2. **Task 2: Add the build-output assertion script and declare terser** — `412ddebf` (chore)
3. **Task 3: Migrate the Svelte lint job to eslint-plugin-svelte@3 flat config** — `d3a0c668` (chore) — amended from `1b67fee8` to include the deletion of `config/linting/eslint.svelte.js` in the same commit, as the plan requires

**Plan metadata:** _(this commit)_

## Files Created/Modified

- `scripts/assertBuildOutput.js` — **new.** Six assertions (one `bundle.css`; non-empty `bundle.css`; non-empty `bundle.js`; the production HTML literal present in `public/index.html`; `.dragger` + `.mediaContainer` + `.attributionString` present in the built CSS; `build/electron/index.js` present), throwing `Error` instances, Prettier-clean.
- `config/linting/eslint.svelte.flat.mjs` — **new.** `svelte.configs.base` + `ts.configs.recommendedTypeChecked` (minus its `.ts`-scoped `eslint-recommended` entry) + a `.svelte` override that pins the Svelte parser, the TS inner parser, `project: config/typescript/tsconfig.svelte.json` and `svelteConfig`, plus a global `ignores` list of the non-`.svelte` extensions flat config would otherwise pick up.
- `config/linting/eslint.svelte.js` — **deleted** (45 lines), replaced by the above.
- `vite.config.mjs`, `config/building/vite.config.servers.mjs` — `cssFileName` + the `names`-aware `assetFileNames` hook; the `a11y-` prefix and inline `preprocess` are deliberately untouched (plan 01-03).
- `config/linting/eslint.electron.json`, `config/linting/eslint.frontend.json` — `recommended-requiring-type-checking` → `recommended-type-checked`; `ban-types` → `no-restricted-types`; `no-var-requires` → `no-require-imports`; the six removed `"off"` rule names deleted; `no-inferrable-types` re-enabled.
- `package.json` — `postbuild` gains `&& node scripts/assertBuildOutput.js`; `lint:svelte` retargeted (loses `--ext` and `--fix`); `terser` added; the four-package lint swap.
- `package-lock.json` — 457 insertions / 136 deletions vs the plan base (see the supply-chain note below).

## Decisions Made

- **`cssFileName` now, even though Vite 4 ignores it** — the name never depends on the hook at any point in the migration.
- **`--fix` removed from `lint:svelte` only** (deviation 2) — the new plugin supports autofix; the old one did not.
- **`svelte.configs.base` + explicit `svelte/valid-compile`, not `configs.recommended`** — 37 style rules on 464 frozen components would breach the phase contract for no TOOL-03 benefit.
- **`ts.configs.recommendedTypeChecked`, not `ts.configs.recommended`** — the latter has zero type-aware rules and would prune a whole class of checks silently.
- **Drop the preset's `eslint-recommended` entry** — it carries `files: ["**/*.ts", …]` and would make this job lint (and fail on) plain TypeScript files now that `--ext` is gone.
- **Re-enable `no-inferrable-types` and `no-empty-function` in all three configs** (deviation 4) — v8 removed them from `recommended`; without them 111 recorded findings would vanish.
- **Leave `config/building/rollup.config.mjs` untouched** — dead code, zero references; its stale `a11y-` prefix is harmless.
- **Leave `lint:electron` and `lint:frontend` `--fix` flags alone** — pre-existing behaviour on non-frozen `.ts` files; measurements follow the baseline convention (no `--fix`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm nested the v8 packages where ESLint could not resolve them**

- **Found during:** Task 3, immediately after the install/uninstall
- **Issue:** Installing `typescript-eslint@8.71.2` while `@typescript-eslint/*@5` still occupied the root slot made npm place the v8 plugin and parser under `node_modules/typescript-eslint/node_modules/…`. After the uninstall, `require.resolve("@typescript-eslint/eslint-plugin")` from the repo root still failed, so both eslintrc jobs would have died with "Failed to load plugin '@typescript-eslint'". `npm dedupe` and a plain re-install both kept the nesting.
- **Fix:** removed the `typescript-eslint` / `@typescript-eslint/*` entries from the lockfile and re-ran `npm install`, letting npm place them fresh. All ten `@typescript-eslint/*` v8 packages are now at the top level; `npm install` then reports "up to date" (idempotent) and `npm ci --dry-run` exits 0 (lock ↔ manifest in sync).
- **Files modified:** `package-lock.json`
- **Verification:** `require.resolve` for both packages resolves; `npm ls @typescript-eslint/eslint-plugin` shows the root-level tree; both jobs ran.
- **Committed in:** `d3a0c668` (Task 3 commit)

**2. [Rule 3 - Blocking] `--fix` under eslint-plugin-svelte@3 rewrites `.svelte` sources**

- **Found during:** Task 3, before accepting the migrated job
- **Issue:** `eslint-plugin-svelte@3`'s `svelte/svelte` processor declares `supportsAutofix: true`; `eslint-plugin-svelte3` did not. The migrated job reports 118 fixable findings inside `.svelte` files, so keeping the plan's `--fix` would have silently edited frozen components. Proved on a copy: `cp Top.svelte zzfixprobe.svelte`, `--fix`, and the copy came back with `activePage.set(user.activePage as any)` → `activePage.set(user.activePage)`.
- **Fix:** `lint:svelte` runs without `--fix` (the plan's own verify block only requires `ESLINT_USE_FLAT_CONFIG=true`, no `--ext`, and `lint:svelte` still in the chain — all hold). Findings are reported instead of auto-applied.
- **Files modified:** `package.json`
- **Verification:** the full 464-file job ran twice with no `src` change; `git status --porcelain src` empty; the 464-file sha256 is identical to the pre-execution hash.
- **Committed in:** `d3a0c668` (Task 3 commit)

**3. [Rule 1 - Bug] typescript-eslint v8 renamed `no-var-requires`, silently re-enabling a rule the electron config disables**

- **Found during:** Task 3, first electron measurement (18 new `no-require-imports` findings)
- **Issue:** v8 marks `@typescript-eslint/no-var-requires` deprecated with `replacedBy: ["@typescript-eslint/no-require-imports"]`. The electron config's `no-var-requires: "off"` therefore stopped disabling anything, and v8's preset turned the successor on — flagging 18 legitimate CommonJS `require()` calls in the main process (`src/electron` compiles to CJS; CONVENTIONS.md documents this rule as off for electron).
- **Fix:** renamed the key to `no-require-imports` in both configs (electron keeps `"off"`, frontend keeps its `"error"`), the same treatment the plan prescribes for `ban-types` → `no-restricted-types`.
- **Files modified:** `config/linting/eslint.electron.json`, `config/linting/eslint.frontend.json`
- **Verification:** electron re-measured: `no-require-imports` 18 → **0** and the total dropped 287 → 269.
- **Committed in:** `d3a0c668` (Task 3 commit)

**4. [Rule 2 - Missing critical] v8's presets dropped two rules that produced 111 recorded findings**

- **Found during:** Task 3, first `.svelte` measurement (96 + 15 findings had disappeared)
- **Issue:** `@typescript-eslint/no-inferrable-types` and `@typescript-eslint/no-empty-function` are in v5's `recommended` but in **no** v8 preset (neither is deprecated in v8 — they are simply no longer preset members). The plan's premise that `recommendedTypeChecked` "reproduces the old job's rule population" does not hold, so adopting the lower numbers would have been exactly the silent check loss TOOL-03 forbids — the same class of loss the plan blocks on for `svelte/valid-compile`.
- **Fix:** re-enabled both as `"error"` in the flat config and in both eslintrc configs, so the pre-migration population is preserved. The flat-config passes the plan's greps unchanged.
- **Files modified:** `config/linting/eslint.svelte.flat.mjs`, `config/linting/eslint.electron.json`, `config/linting/eslint.frontend.json`
- **Verification:** `no-inferrable-types` 96/94 → 96/94 and `no-empty-function` 15/33/6 → 15/33/6 against the baselines.
- **Committed in:** `d3a0c668` (Task 3 commit)

**5. [Rule 2 - Missing critical] The flat config as sketched would have linted non-Svelte files and parsed `.svelte` files with the wrong parser**

- **Found during:** Task 3 spike (two successive configuration errors)
- **Issue:** (a) `ts.configs.recommendedTypeChecked`'s first entry sets the TypeScript parser for *all* files, so with the Svelte parser only coming from `svelte.configs.base` (spread earlier) `.svelte` files were parsed as TS (`Parsing error: '>' expected`). (b) Flat config lints `.js`/`.mjs`/`.cjs` when a directory is passed and ignores the preset's `files`-scoped entries differently from eslintrc — the job tried to lint `src/frontend/IPC/main.ts` and `simplex-noise.js`, and the type-aware rules rejected them for lack of a project.
- **Fix:** the `.svelte` override now pins `parser: svelteParser` explicitly (outer) with `parserOptions.parser: ts.parser` (inner); the preset's `.ts`-scoped `eslint-recommended` entry is filtered out; a global `ignores` list (`**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}`) states the job's scope as `--ext .svelte` used to.
- **Files modified:** `config/linting/eslint.svelte.flat.mjs`
- **Verification:** the full job reports 464 files — exactly the baseline's file count — with no parse errors in `.svelte` files.
- **Committed in:** `d3a0c668` (Task 3 commit)

### Deviations from the plan's stated expectations (not code defects)

**6. `npm run lint` cannot exit 0, and could not before this plan either.** The verify block chains `npm run lint && echo "lint chain green"`, and its `<fails_when>` treats a non-zero exit as failure. The recorded baseline shows the chain was already red at `lint:electron` (212 errors of which 3 fixable → 209 remain → exit 1), and `npm-run-all -s` stops at the first job. Observed live: `npm run lint` → **exit 1**, `✖ 256 problems` after `--fix` applied its 13 fixes, `ERROR: "lint:electron" exited with 1.` The four jobs were therefore verified individually with non-mutating invocations, and the deliberate `--fix` write to `src/electron/**/*.ts` (7 files) was restored immediately — `git status --porcelain src` empty afterwards. **The plan's own verification item 8 ("no `src/electron/**` change") and its verify block cannot both hold at the same instant**, for the same reason.

**7. `npm run lint` must not be used as a verification command at all**, because `lint:electron`/`lint:frontend` carry `--fix` and rewrite `.ts` files. Every count in this summary uses the baseline's convention (`--format json`, no `--fix`), so the numbers are comparable to `baseline/lint.json` argument-for-argument.

**8. `npx prettier --check src scripts` scope unchanged** — the new script is format-clean (`All matched files use Prettier code style!`), so the plan's Task 2 requirement holds. No baseline movement is claimed for `test:format` (that is plan 01-04's comparison).

**9. One new parse error appears in `lint:frontend`** — `src/frontend/components/output/effects/simplex-noise.js` (a vendored third-party noise implementation) is outside the TS project, and typescript-eslint v8 reports that as a parse error where v5 fell back silently. Accepted and recorded rather than suppressed: excluding the file or narrowing `--ext` would be a scope change, and no finding of any kind was lost (baseline: 0 findings on that file).

**10. One full-suite Vitest run showed a transient third failure** — `zip.test.ts :: rejects and removes the truncated zip if a file disappears while zipping` (a filesystem-race test) failed in the first post-change full run (178/3) while the machine was loaded with a build and a Playwright run. It passes **5/5 in isolation, three consecutive runs**, and the repeat full run matched the baseline exactly: **60 suites / 181 tests / 179 passed / 2 failed** — the two recorded pre-existing `syncManager.test.ts` failures. No file this plan touched is on the zip path. Recorded as a flake, not a regression, and not hidden.

**Total deviations:** 5 auto-fixed (3 blocking, 2 missing-critical) + 5 recorded expectation gaps/findings. No scope creep: nothing outside this plan's `files_modified` set was changed (verified by `git diff --name-only c13fce7a..HEAD`).

## Supply-chain note (T-02-01 / T-02-05)

- **Task 2:** adding `terser@5.43.1` to the root `devDependencies` cost the lockfile **exactly one line** — the package was already resolved and marked `dev: true`, so no new package entered the tree.
- **Task 3 lockfile diff:** **457 insertions / 136 deletions** vs the plan base. Top-level deltas are confined to the intended set — added `eslint-plugin-svelte@3.23.1`, `svelte-eslint-parser@1.9.0`, `typescript-eslint@8.71.2`, `@typescript-eslint/{eslint-plugin,parser,scope-manager,type-utils,types,typescript-estree,utils,visitor-keys}@8.71.2`, `@typescript-eslint/project-service`, `@typescript-eslint/tsconfig-utils`, `ts-api-utils`, `yaml`, `lilconfig`, `postcss-*`; removed `eslint-plugin-svelte3@4.0.0`, `@types/json-schema`, `@types/semver`, `tsutils`, `natural-compare-lite`, and the v5 `@typescript-eslint/*` tree.
- **Two transitive version movements are forced by the intended packages, not drift:** `@eslint-community/regexpp` 4.12.1 → 4.12.2 (required: `@typescript-eslint/eslint-plugin@8.71.2` declares `^4.12.2`) and `semver` 7.7.2 → 7.8.5 (required: v8's `typescript-estree` declares `^7.7.3`, which 7.7.2 does not satisfy). Nothing else in the lockfile changed version.
- **Integrity hashes of the four added packages** (audit trail): `eslint-plugin-svelte@3.23.1` `sha512-+w86Jlx4IRUuuvtqD6j4njql+akx+81JnpvbN5de3AV5iq2SexvST/Jr51CiTlKeY0i+vhoKjPO/ywFKIP75sA==`; `svelte-eslint-parser@1.9.0` `sha512-aKdKQAZP7MobfVcQNyy5Yk0QjlC9m5T1lTS0qA7+0EIsFzFX3WgbGHfb8267QK+4hI8Az9+2f+hk5sp39op8sg==`; `typescript-eslint@8.71.2` `sha512-Rz4effbMy2g9wnvOJZG6SbVavX313Lap1vNEbk1RUochzickvzP8P4HB+bkNg5e50eVz1hQGjh9K1omI1xB4Bw==`; `terser@5.43.1` (unchanged entry, `dev: true`).
- All three newly installed packages were requested at the exact versions the research pinned, and each of those versions is the current `latest` in its range, so no `npm install` can resolve to something else. No `--force` and no `--legacy-peer-deps` was used.

## Issues Encountered

- **`npm install` ran on every lockfile edit** and each time re-ran the `postinstall` native rebuild (`electron-builder install-app-deps`), which is slow but harmless; the native modules (`better-sqlite3`, `osr-capture`, `openmediatransport`) all rebuilt cleanly.
- **The `--formatter json` output of Stylelint had to be captured with `--output-file`** — a plain stdout redirect produced a truncated file. With the explicit output file: **464 files / 216 problems / all `csstools/use-logical`**, identical to the baseline.
- **The plan's suggested fixture (an unterminated `{#if}`) is caught by the parser, not by `svelte/valid-compile`.** Both were run: the plan's fixture proves the job is not inert, and an invalid-CSS fixture proves the specific rule is loaded. Both findings are recorded above.

## Plan-level verification

| # | Check | Result |
|---|---|---|
| 1 | `npm run build` exits 0 with the assertion inside `postbuild` | **PASS** — exit 0; "Build output assertion passed: bundle.css (268799 bytes, 3 component selectors), bundle.js, production HTML literal, electron build" |
| 2 | Exactly `bundle.css`; four server `styles.css` non-empty | **PASS** — `public/build/bundle.css`; remote 95,888 / stage 20,200 / controller 5,119 / output_stream 1,521 bytes |
| 3 | `npm run lint` exits 0 with all four jobs | **FAIL — plan premise wrong** (deviation 6): exit 1, stopping at `lint:electron`, which was already red in the baseline. All four jobs were run individually instead |
| 4 | Per-job counts ≤ baseline | **svelte 206→172 ✔, styles 216→216 ✔; electron 237→269 and frontend 630→677 rise**, fully accounted for rule-by-rule above (v8 preset additions and semantics, no rule the config enabled was lost) |
| 5 | `output-render` pixel gate unchanged | **PASS** — 2 passed (42.0s), `maxDiffPixels: 0` |
| 6 | `cleanBuilds.js` then `public/index.html` clean | **PASS** — `git status --porcelain public/index.html` empty; dev literal present |
| 7 | Vitest totals match the baseline | **PASS** — 60 suites / 181 tests / 179 passed / 2 failed (same two `syncManager.test.ts` failures); first run additionally flaked `zip.test.ts` (deviation 10) |
| 8 | Only this plan's files in the diff | **PASS** — `git diff --name-only c13fce7a..HEAD` = the 8 `files_modified` paths; nothing under `src/**` |
| 9 | `scripts/postBuild.js` and `config/building/rollup.config.mjs` unmodified | **PASS** — both absent from the diff |
| 10 | Exactly one dependency added beyond Task 3's swap; lockfile diff recorded | **PASS** — added `terser`, `eslint-plugin-svelte`, `svelte-eslint-parser`, `typescript-eslint`; removed `eslint-plugin-svelte3`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`; no other dependency version touched (lockfile: 457/136) |

Guards held: `.github/workflows/release.yml` untouched; `.github/workflows/ci.yml` untouched with **exactly 2** `continue-on-error: true` entries; `lint:svelte` still in the `lint` chain; all 464 `.svelte` files byte-identical (sha256 `6e5441d0…` unchanged), and no `.svelte` rewrite was ever written to disk.

## User Setup Required

None — no external service configuration. The only dependency mutations are the four intended devDependency entries, all resolved and integrity-recorded above.

## Next Phase Readiness

**Ready for plan 01-03 (the version bumps).** The build contract it must preserve is now stated in config and asserted by script:

- `vite.config.mjs` / `config/building/vite.config.servers.mjs` already carry `cssFileName`, so when Vite 8 lands the CSS name is deterministic with or without the hook. The `a11y-` prefix (both files) and `svelte.config.mjs`'s `sveltePreprocess` are deliberately still v3/v4 spellings — they belong to 01-03, and switching the prefix early would flood the Svelte 3 build log and pollute the baseline evidence.
- `config/linting/eslint.svelte.flat.mjs` reads `svelteConfig` from `svelte.config.mjs`, so whatever 01-03 does to that file must keep it importable by an ESM flat config (`vitePreprocess()` will be fine; the old `svelte-preprocess` dependency is removed in 01-03 anyway).
- Carry-forward: **the `lint` chain is red at `lint:electron` by construction** (pre-existing backlog). Do not use `npm run lint`'s exit code as a gate, and do not run it while `.ts` files must stay frozen — it applies `--fix` to `src/electron/**` and `src/frontend/**`.
- Carry-forward: **flat config lints `.js`/`.mjs`/`.cjs` by default**, which is why the flat config carries its own global `ignores` list. Any future flat config in this repo needs the same explicit scoping.
- Carry-forward for 01-04: the post-upgrade comparison must use `--format json` **without** `--fix`, and must compare against the numbers in this summary's tables, not against the pre-plan baseline alone — the electron/frontend totals intentionally rise because v8's presets check more.

---

*Phase: 01-toolchain-gate*
*Completed: 2026-10-18*
