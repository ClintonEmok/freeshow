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

**The post-remediation production build and zero-pixel output gate pass; final parity remains blocked by three checker-only Svelte warnings, four async lint deltas, and 80 newly unformatted paths.**

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
- Recorded all five baseline check categories, individual lint jobs, inventory, and raw results in `PARITY.md`. After correcting the v8 `caughtErrors` default, Electron lint is 254 problems (+17) and frontend lint is 671 (+41); `no-unused-vars` exactly matches baseline in both. Vitest stayed at 179 passed / 2 known baseline failures / 0 skipped; Prettier's 40-file unformatted set is identical; stylelint stayed at 216; the two CI `continue-on-error` entries and all required scripts remain.
- Restored `restrict-plus-operands` v5 behavior after confirming v8's permissive defaults otherwise removed the 20 Electron findings. Added `allowJs`/`noEmit` to the frontend checker project to retain typed lint coverage of `simplex-noise.js` without emitting over inputs.
- Restored typescript-eslint v5's `no-unused-vars` caught-error semantics in both lint configs: v8 changed `caughtErrors` from `none` to `all`, which explained Electron's 42→25 and frontend's 17→4 findings without source debt. The frontend's existing ignore patterns and error severity remain unchanged.
- Restored production `import.meta.url` behavior for Vite 8/Rolldown IIFE outputs and removed the `EMPTY_IMPORT_META` warnings without suppressing warnings.

## Task Commits

Each planned task was committed atomically:

1. **Task 1: Audit diff scope, entry sites, and build contract** — `1b10e3aa` (`fix(01-04): preserve build contract and output pixel parity`)
2. **Task 2: Measure checks against recorded baselines** — `6b28d122` (`docs(01-04): measure post-upgrade check parity`)
3. **Task 3: Classify deltas and hold the line** — `5773d1bc` (`fix(01-04): preserve typed lint coverage and baseline rule behavior`)

**Post-blocker compatibility correction:** `949a2f46` (`fix(01-04): restore caught-error lint parity`).

**Plan metadata:** recorded in the final documentation commit.

## Files Created/Modified

- `.planning/phases/01-toolchain-gate/PARITY.md` — baseline comparisons, full time-scoped path list, positive controls, raw output, issue classifications, and blockers.
- `vite.config.mjs`, `config/building/vite.config.servers.mjs` — production IIFE `import.meta.url` compatibility for Vite 8/Rolldown.
- `config/testing/output-render.test.ts` — deterministic Retina capture without snapshot or threshold changes.
- `config/linting/eslint.electron.json` — documented v8-only rule deferrals and explicit v5 `restrict-plus-operands` and `no-unused-vars` behavior.
- `config/linting/eslint.frontend.json` — documented deferral of migration-new rules and explicit v5 `no-unused-vars` caught-error behavior, preserving existing ignore patterns.
- `src/frontend/tsconfig.json` — include the JavaScript lint target in the typed project, prevent emit, and preserve the existing checker scope.
- `.planning/phases/01-toolchain-gate/01-04-SUMMARY.md` — this execution record.

## Decisions Made

- Kept the zero-pixel snapshot gate unchanged and normalized Electron's device scale factor to 1 for Retina hosts.
- Preserved the existing Electron plus-operands lint rule at its pre-upgrade behavior rather than accepting v8's new all-permissive defaults.
- Set `caughtErrors: "none"` explicitly for `@typescript-eslint/no-unused-vars` in both configs to restore v5 behavior; retained the frontend's `varsIgnorePattern` and `argsIgnorePattern` and kept the rule enabled at error severity.
- Fixed the frontend parser coverage issue through tsconfig only; did not remove `.js` coverage or edit the source module.
- Left the 161 new compiler warnings visible. Component-wide edits would violate the authorized source scope, and suppressing them would contradict the user's instruction to investigate warnings rather than hide them.
- Did not disable existing lint rules to force numeric parity. The remaining `no-unnecessary-type-assertion` and `await-thenable` increases in both lint targets remain blockers.
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
- **Verification:** non-mutating Electron JSON lint reports 20 plus-operands findings. At this stage of the original run, the total was 271; the later caught-error-default correction reduced the final total to 254 (+17), with the remaining blockers recorded below.
- **Committed in:** `5773d1bc`.

**3. [Rule 3 - Blocking] Kept JavaScript typed-lint coverage under the v8 parser**

- **Found during:** Task 3 frontend lint run.
- **Issue:** The v8 parser rejected `src/frontend/components/output/effects/simplex-noise.js` because the file was not included in the TypeScript project; enabling JS inclusion initially caused an emit-over-input warning.
- **Fix:** Added `allowJs: true` and `noEmit: true` to the existing frontend tsconfig. No source or component was changed.
- **Files modified:** `src/frontend/tsconfig.json`.
- **Verification:** frontend lint still processes 255 files with zero parser errors; svelte-check reports 2174 files and no TS5055 warning.
- **Committed in:** `5773d1bc`.

**4. [Rule 1 - Compatibility] Restored the v5 caught-error default for `no-unused-vars`**

- **Found during:** Post-blocker parity review.
- **Issue:** typescript-eslint v8 changed `caughtErrors` from the v5 default `none` to `all`, producing 17 Electron and 13 frontend findings that were behavior-default drift rather than new source debt.
- **Fix:** Added `caughtErrors: "none"` to the existing `@typescript-eslint/no-unused-vars` config in both lint files. The frontend's existing ignore patterns and error severity were preserved; the rule was not disabled.
- **Files modified:** `config/linting/eslint.electron.json`, `config/linting/eslint.frontend.json`.
- **Verification:** the two individual, non-mutating lint commands now report Electron 149 files / 254 problems / 25 no-unused-vars findings and frontend 255 files / 671 problems / 4 no-unused-vars findings, matching each job's baseline rule counts.

---

**Total deviations:** 4 auto-fixed issues. **Impact:** config-only compatibility corrections; no source scope expansion and no existing lint rule was dropped.

## Issues Encountered

- **Electron lint:** 237 baseline problems → 254 (+17) after restoring the old `restrict-plus-operands` and `no-unused-vars` semantics. `no-unused-vars` is 25/25; remaining increases are `no-unnecessary-type-assertion` (+15) and `await-thenable` (+3), partially offset by one fewer `no-shadow` finding.
- **Frontend lint:** 630 → 671 (+41) after resolving the parser error and restoring `no-unused-vars` semantics. `no-unused-vars` is 4/4; remaining increases are `no-unnecessary-type-assertion` (+47) and `await-thenable` (+1), offset by the seven `consistent-type-imports` findings corrected during migration.
- **Svelte warnings:** the final build emits 161 `element_invalid_self_closing_tag` warnings (154 frontend, 7 server); svelte-check reports 157 such diagnostics plus 129 a11y and 5 other warnings (291 total vs 47 baseline). No warning was suppressed. The prior 01-03 estimate of 165 was corrected to the final clean build's 161.
- **Svelte checker file count:** 2174 vs 2244 baseline; `include`/`exclude` stayed unchanged and the configured frontend scope remains intact. The baseline did not retain a per-file TypeScript program manifest, so the 70-file dependency-resolution delta cannot be itemized.

### Blocking Findings

The plan's parity success criterion is unmet. Electron and frontend lint exceed baseline by 17 and 41 problems. The remaining increases are explicitly under `no-unnecessary-type-assertion` and `await-thenable`: Electron +15/+3 and frontend +47/+1. Resolving them would require application-source changes prohibited by the current task constraints or disabling existing checks, which the user explicitly disallowed. The new Svelte compiler warnings are also unresolved because neither source-wide edits nor suppression are authorized. `PARITY.md` records the findings and evidence; the plan must remain **BLOCKED**.

## User Setup Required

None.

## Next Phase Readiness

This paragraph records the initial pre-remediation outcome only. The final post-remediation readiness result is in the continuation section below; plan 01-05 must not start while 01-04 remains blocked.

---
*Phase: 01-toolchain-gate*
*Plan: 04*
*Completed: 2026-10-18*

## Final post-remediation gate continuation

The execution narrative and blocker counts above preserve the original 01-04 run before the user's narrow source-remediation authorization and plans 01-06 through 01-09. This continuation records the final post-remediation gate; its fresh measurements supersede earlier interim/current-state counts without deleting that history.

### Continuation performance and task commits

- **Started:** 2026-10-18T10:09:16Z
- **Completed:** 2026-10-18T10:22:13Z
- **Duration:** 13 min (rounded)
- **Tasks:** 3/3 executed; acceptance remains blocked
- **Task 1:** Fresh production rebuild, output assertion, and pinned checker evidence — `6560470a` (`docs(01-04): record fresh build and checker gate evidence`)
- **Task 2:** Non-mutating lint, full Vitest, formatter/style comparisons, and focused tests — `667a26f3` (`docs(01-04): record lint and test parity results`)
- **Task 3:** Source-hunk authorization audit, Darwin output-render comparison, and cleanup — `6db378a8` (`docs(01-04): record source audit and pixel gate`)
- **Final plan metadata:** committed separately after this summary and `STATE.md` update.

### Final results

- Fresh `npm run build` and separate `node scripts/assertBuildOutput.js` both exited 0. The fresh production log contains zero `element_invalid_self_closing_tag` warnings; the output contract and non-empty artifacts passed.
- Fresh pinned `svelte-check` exited 1 with `2174 FILES / 144 ERRORS / 137 WARNINGS`, below the 338-error baseline, but still reports three `element_invalid_self_closing_tag` sites: `EffectsInfo.svelte:4:1`, `OverlayInfo.svelte:14:5`, and `output/preview/PreviewCanvas.svelte:85:5`. The target-warning zero criterion therefore remains unmet; no new warning suppression was added.
- Each of the four non-mutating lint jobs retained file coverage and did not exceed its aggregate problem baseline. The individual async target-rule gates still fail: Electron `await-thenable` is 6 versus baseline 3; frontend is 1 versus baseline 0. These are the four preserved Promise/async-iterator cases, not a green target-rule parity result.
- Vitest exactly matches 60 suites / 181 tests / 179 passed / the same two `syncManager.test.ts` baseline failures / zero skipped. Stylelint remains 216 (baseline 216). Prettier reports 120 unformatted paths against baseline 40 (80 new paths); no format writes were made.
- The exact source-hunk audit against `88902f7b6b68de6885aa031a9b12873643d6f956` maps all 161 changed Svelte tag hunks across 84 files to fresh pre-remediation production diagnostics and all 30 changed application TypeScript files to individually reviewed lint findings or their explicit type-only dependent annotations/import cleanups. The five multi-line Svelte diagnostic-to-hunk offsets are identified in `PARITY.md`. The pre-existing `src/frontend/tsconfig.json` change is documented separately as configuration, not source remediation. The source audit passed; no additional application source was changed during this final gate.
- `output-render` ran with `--retries=0`: both 1920×1080 comparisons passed, zero skipped, at `maxDiffPixels: 0`. The Darwin snapshot SHA-256 stayed `1f040b92c1ede6a4237e817bfc389fb2a694f0c3c43b70f675a7579f3ea49162`. `cleanBuilds.js` exited 0, restored the development HTML literal, and left `public/index.html` clean.

### Final decisions and blockers

- Preserved all four current-only `await-thenable` findings; no change was proven to preserve Promise reactions, scheduling/rejection timing, or async-from-sync iterator-close behavior.
- Left the three checker-only target warnings visible and unmodified because they are not part of the fresh production warning inventory used to authorize S1–S7; no warning policy or suppression was changed.
- Did not format the 80 newly unformatted remediation paths during the final gate. Formatter writes are out of scope and would change the reviewed source hunks.
- The source-authorization and projector gates pass, but the required checker target-warning, individual async-lint, and Prettier baseline gates do not. **Plan 01-04 remains BLOCKED; do not mark it complete or start 01-05.**

### Continuation deviations and next-phase readiness

None. The gate tasks changed only `PARITY.md`; required metadata updates changed this summary and `STATE.md`. Build outputs were cleaned, no application source/build or lint config/test/baseline/snapshot was modified during this continuation, and unrelated untracked files were left untouched. The live checkout was discovered to be local `main`, ahead of `origin/main`, contrary to the earlier workspace note; no branch switch or push was attempted, and the release-on-push risk is recorded in `STATE.md`. Phase 1 and the milestone remain in progress. Revisit the three checker-only warnings, four async lint deltas, and 80 Prettier deltas within authorized scope, then rerun the affected final gates before proceeding to 01-05.
