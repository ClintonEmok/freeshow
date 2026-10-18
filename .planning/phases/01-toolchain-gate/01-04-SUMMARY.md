---
phase: 01-toolchain-gate
plan: 04
status: blocked
subsystem: testing/toolchain
tags: [svelte5, vite8, eslint, typescript, svelte-check, vitest, prettier, parity]

# Dependency graph
requires:
  - phase: 01-toolchain-gate
    provides: [pre-upgrade check baselines, Svelte 5/Vite 8 toolchain migration, zero-diff projector snapshot]
provides:
  - baseline-referenced parity evidence in PARITY.md
  - verified production build and 1920x1080 zero-diff output gate
  - explicit blockers for lint-count and Svelte compiler-warning regressions
affects: [01-05 cross-platform smoke, Phase 7 lint-debt review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Run each lint job non-mutating and compare file/problem counts to the captured pre-upgrade JSON."
    - "Preserve legacy rule behavior explicitly when a major upgrade changes rule defaults."

key-files:
  created:
    - .planning/phases/01-toolchain-gate/PARITY.md
    - .planning/phases/01-toolchain-gate/01-04-SUMMARY.md
  modified:
    - vite.config.mjs
    - config/building/vite.config.servers.mjs
    - config/testing/output-render.test.ts
    - config/linting/eslint.electron.json
    - config/linting/eslint.frontend.json
    - src/frontend/tsconfig.json

key-decisions:
  - "Keep the output pixel threshold and snapshot unchanged; normalize Electron Retina capture with --force-device-scale-factor=1."
  - "Restore typescript-eslint v5 restrict-plus-operands semantics explicitly under v8 rather than silently losing the existing rule."
  - "Do not suppress Svelte 5 self-closing-tag warnings or mass-edit components; report them as unresolved under the frozen-source constraint."
  - "Do not disable or weaken existing lint rules to force aggregate parity; report the remaining over-baseline counts as blockers."

patterns-established:
  - "Parity artifacts contain the raw command, file count, problem totals, and per-rule explanation for every check."
  - "Production IIFE bundles restore import.meta.url semantics with a production-only define and output intro."

# Metrics
duration: 53min
completed: 2026-10-18
---

# Phase 1 Plan 4: Post-upgrade parity audit Summary

**Parity evidence preserves the production/output gates and check inventory, but Electron/frontend lint remain +34/+54 over baseline and Svelte 5 adds 161 build warnings, so the plan is blocked.**

## Performance

- **Duration:** 53 min
- **Started:** 2026-10-18T06:22:41Z
- **Completed:** 2026-10-18 (UTC)
- **Tasks:** 3/3 executed; acceptance outcome blocked
- **Files modified:** 8 plan-local files (6 configs/test files, `PARITY.md`, and this summary)

## Accomplishments

- Audited the entire phase diff against baseline commit `136d77575ec1f853c66eba3a1f44be7401e9234c`: the only `.svelte` change is the previously authorized 3-add/3-delete `Connection.svelte` store-binding rename; no `src/electron/**` change, no legacy `new App(` or private Svelte API, and all six entry points use `mount()`.
- Rebuilt production and reasserted the single CSS asset, minified bundle, production HTML literal, and four server stylesheet outputs. `cleanBuilds.js` restored the development HTML and left `public/index.html` clean.
- Re-ran the output gate at 1920×1080: **2/2 passed with `maxDiffPixels: 0`** against the unchanged Darwin baseline. The capture uses the agreed Electron device-scale normalization; no snapshot update was performed.
- Recorded all five baseline check categories, individual lint jobs, inventory, and raw results in `PARITY.md`. Vitest stayed at 179 passed / 2 known baseline failures / 0 skipped; Prettier's 40-file unformatted set is identical; stylelint stayed at 216; the two CI `continue-on-error` entries and all required scripts remain.
- Restored `restrict-plus-operands` v5 behavior after confirming v8's permissive defaults otherwise removed the 20 Electron findings. Added `allowJs`/`noEmit` to the frontend checker project to retain typed lint coverage of `simplex-noise.js` without emitting over inputs.
- Restored production `import.meta.url` behavior for Vite 8/Rolldown IIFE outputs and removed the `EMPTY_IMPORT_META` warnings without suppressing warnings.

## Task Commits

Each planned task was committed atomically:

1. **Task 1: Audit diff scope, entry sites, and build contract** — `1b10e3aa` (`fix(01-04): preserve build contract and output pixel parity`)
2. **Task 2: Measure checks against recorded baselines** — `6b28d122` (`docs(01-04): measure post-upgrade check parity`)
3. **Task 3: Classify deltas and hold the line** — `5773d1bc` (`fix(01-04): preserve typed lint coverage and baseline rule behavior`)

**Plan metadata:** recorded in the final documentation commit.

## Files Created/Modified

- `.planning/phases/01-toolchain-gate/PARITY.md` — baseline comparisons, full time-scoped path list, positive controls, raw output, issue classifications, and blockers.
- `vite.config.mjs`, `config/building/vite.config.servers.mjs` — production IIFE `import.meta.url` compatibility for Vite 8/Rolldown.
- `config/testing/output-render.test.ts` — deterministic Retina capture without snapshot or threshold changes.
- `config/linting/eslint.electron.json` — documented v8-only rule deferrals and explicit v5 `restrict-plus-operands` options.
- `config/linting/eslint.frontend.json` — documented deferral of migration-new rules only.
- `src/frontend/tsconfig.json` — include the JavaScript lint target in the typed project, prevent emit, and preserve the existing checker scope.
- `.planning/phases/01-toolchain-gate/01-04-SUMMARY.md` — this execution record.

## Decisions Made

- Kept the zero-pixel snapshot gate unchanged and normalized Electron's device scale factor to 1 for Retina hosts.
- Preserved the existing Electron plus-operands lint rule at its pre-upgrade behavior rather than accepting v8's new all-permissive defaults.
- Fixed the frontend parser coverage issue through tsconfig only; did not remove `.js` coverage or edit the source module.
- Left the 161 new compiler warnings visible. Component-wide edits would violate the authorized source scope, and suppressing them would contradict the user's instruction to investigate warnings rather than hide them.
- Did not weaken existing lint rules to force numeric parity. The two over-baseline lint jobs remain blockers.
- Did not update `STATE.md` or `ROADMAP.md`, as explicitly instructed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored production IIFE `import.meta.url` semantics**

- **Found during:** Task 1 production build.
- **Issue:** Vite 8/Rolldown no longer supplied the old IIFE `import.meta.url` behavior; the production bundle emitted `EMPTY_IMPORT_META` warnings.
- **Fix:** Added production-only `define` and bundle `output.intro` compatibility in renderer/server build configs; dev keeps native `import.meta.url`.
- **Files modified:** `vite.config.mjs`, `config/building/vite.config.servers.mjs`.
- **Verification:** `npm run build` passes, `EMPTY_IMPORT_META` count is 0, postBuild assertion passes, output pixels remain identical.
- **Committed in:** `1b10e3aa`.

**2. [Rule 1 - Bug] Preserved the old plus-operands lint behavior**

- **Found during:** Task 3 rule-delta investigation.
- **Issue:** typescript-eslint v8's changed defaults allowed operand types that v5 rejected, taking Electron's baseline 20 `restrict-plus-operands` findings to zero.
- **Fix:** Set the old false `allow*` options explicitly and skip compound assignments, restoring all 20 findings.
- **Files modified:** `config/linting/eslint.electron.json`.
- **Verification:** non-mutating Electron JSON lint reports 20 plus-operands findings; total remains 271 and the residual +34 is reported as a blocker.
- **Committed in:** `5773d1bc`.

**3. [Rule 3 - Blocking] Kept JavaScript typed-lint coverage under the v8 parser**

- **Found during:** Task 3 frontend lint run.
- **Issue:** The v8 parser rejected `src/frontend/components/output/effects/simplex-noise.js` because the file was not included in the TypeScript project; enabling JS inclusion initially caused an emit-over-input warning.
- **Fix:** Added `allowJs: true` and `noEmit: true` to the existing frontend tsconfig. No source or component was changed.
- **Files modified:** `src/frontend/tsconfig.json`.
- **Verification:** frontend lint still processes 255 files with zero parser errors; svelte-check reports 2174 files and no TS5055 warning.
- **Committed in:** `5773d1bc`.

---

**Total deviations:** 3 auto-fixed issues. **Impact:** config-only compatibility corrections; no source scope expansion and no existing lint rule was dropped.

## Issues Encountered

- **Electron lint:** 237 baseline problems → 271 (+34) after restoring the old plus-operands check. Existing-rule increases are `no-unused-vars` (+17), `no-unnecessary-type-assertion` (+15), and `await-thenable` (+3), partially offset by one fewer `no-shadow` finding. No existing rule was disabled to hide these.
- **Frontend lint:** 630 → 684 (+54) after resolving the one parser error. Increases are `no-unnecessary-type-assertion` (+47), `no-unused-vars` (+13), and `await-thenable` (+1), offset by the seven `consistent-type-imports` findings corrected during migration.
- **Svelte warnings:** the final build emits 161 `element_invalid_self_closing_tag` warnings (154 frontend, 7 server); svelte-check reports 157 such diagnostics plus 129 a11y and 5 other warnings (291 total vs 47 baseline). No warning was suppressed. The prior 01-03 estimate of 165 was corrected to the final clean build's 161.
- **Svelte checker file count:** 2174 vs 2244 baseline; `include`/`exclude` stayed unchanged and the configured frontend scope remains intact. The baseline did not retain a per-file TypeScript program manifest, so the 70-file dependency-resolution delta cannot be itemized.

### Blocking Findings

The plan's parity success criterion is unmet. Electron and frontend lint exceed baseline by 34 and 54 problems under pre-existing rules. Resolving them would require application-source changes prohibited by the current task constraints or disabling existing checks, which the user explicitly disallowed. The new Svelte compiler warnings are also unresolved because neither source-wide edits nor suppression are authorized. `PARITY.md` records the findings and evidence; the plan must remain **BLOCKED**.

## User Setup Required

None.

## Next Phase Readiness

The build/output contract and pixel baseline remain verified, so the independent packaged cross-platform smoke work in 01-05 can be investigated. However, Phase 1 parity is not closed: do not report the milestone/toolchain gate as fully passing until the user authorizes a disposition for the lint deltas and Svelte warning wall without weakening existing checks.

---
*Phase: 01-toolchain-gate*
*Plan: 04*
*Completed: 2026-10-18*
