---
phase: 01-toolchain-gate
plan: 01
subsystem: testing
tags: [svelte-check, eslint, stylelint, vitest, prettier, playwright, electron, pixel-diff, baseline, native-modules]

# Dependency graph
requires: []
provides:
    - "package.json's `test:svelte` pinned to `svelte-check --tsconfig config/typescript/tsconfig.svelte.json` (character-identical pre- and post-upgrade command)"
    - "Five committed pre-upgrade baselines under .planning/phases/01-toolchain-gate/baseline/ (svelte-check, four lint jobs, vitest, prettier, README)"
    - "config/testing/output-render.test.ts — the output-window pixel-diff gate, located by the output_window DOM hook, at exactly 1920x1080"
    - "config/testing/output-render.test.ts-snapshots/output-1920x1080-darwin.png — the committed pre-upgrade 1920x1080 baseline frame"
    - "RELEASE-SMOKE.md — the per-OS TOOL-04 smoke checklist incl. callable native-module checks"
    - "COVERAGE.md — the api-coverage seal input"
affects: [01-02, 01-03, 01-04, 01-05, "every later plan that compares against the recorded baselines"]

# Actuals (#2632) — chars/4 over the realized diff (133,133 chars incl. baseline dumps).
actuals:
    tokens: 33283
    tasks: 3
    commits: 3

tech-stack:
    added: [] # no new dependency — deliberately
    patterns:
        - "Pinned baseline command: a check whose invocation is ambiguous (bare `svelte-check` resolving no tsconfig) is pinned BEFORE any version moves, so pre- and post-upgrade runs are byte-identical"
        - "Per-OS pixel baselines with a platform-scoped test.skip carrying its own capture instructions — an unbaselined platform records a reason, never a failure or a self-written baseline"
        - "Non-blank baseline guard: inline PNG decode (node:zlib over IDAT + scanline unfilter) asserts 1920x1080 AND 'not a single uniform colour', so a blank capture cannot pass as 'no diff'"
        - "Two test() bodies per pixel spec: non-pixel flow assertions (hook, lyric text, viewport) run on every platform; only the pixel comparison is platform-scoped"

key-files:
    created:
        - config/testing/output-render.test.ts
        - config/testing/output-render.test.ts-snapshots/output-1920x1080-darwin.png
        - .planning/phases/01-toolchain-gate/baseline/svelte-check.txt
        - .planning/phases/01-toolchain-gate/baseline/lint.json
        - .planning/phases/01-toolchain-gate/baseline/vitest.json
        - .planning/phases/01-toolchain-gate/baseline/format.txt
        - .planning/phases/01-toolchain-gate/baseline/README.md
        - .planning/phases/01-toolchain-gate/RELEASE-SMOKE.md
        - .planning/phases/01-toolchain-gate/COVERAGE.md
    modified:
        - package.json # test:svelte only — 1 insertion, 1 deletion

key-decisions:
    - "Pinned test:svelte to the explicit tsconfig: there is no root tsconfig.json/jsconfig.json, and svelte-check's documented no-flag behaviour is an upwards traversal — so the unpinned command was silently resolving less than intended. 338 errors is the real baseline, not a near-clean result."
    - "Located the output page by the output_window DOM hook, written as a CLASS (`class=\"fill context #output_window\"`) not an id — FreeShow's `#`-prefixed class tokens are context-menu targets. The selector accepts an id or the class token."
    - "Created the projector window through the operator's own top-bar display toggle (#output_window_button -> toggleOutputs() -> OUTPUT TOGGLE_OUTPUTS -> OutputVisibility.toggleOutput -> OutputLifecycle.createOutput). No popup chain, and the sanctioned electronApp.evaluate + loadWindowContent fallback was never needed."
    - "Per-OS pixel baselines only: cross-OS comparison is not achievable (font rasterisation differs). An unbaselined platform test.skips with its capture instructions; the comparison run can never write its own baseline and never relies on retries."
    - "The only capture path is `--update-snapshots=all` (a bare `--update-snapshots` sets mode 'changed', so the platform guard would skip the very run meant to write the file)."
    - "RELEASE-SMOKE.md names callable native-module probes, not requires: better-sqlite3 opens an in-memory DB and runs `SELECT 1 AS n`; @discordjs/opus constructs an encoder and encodes a 20 ms frame; osr-capture calls its exported synchronous converter `convertBgraToUyvy(bgra, 2, 2)` and asserts an 8-byte Buffer, plus feature-detects `readback`."
    - "Left config/building/rollup.config.mjs untouched — dead code (zero references outside AGENTS.md); its stale `a11y-` prefix needs no change."
    - "Left src/server/cam/main.ts untouched — the fifth `new App(` site has no build path (config/building/vite.config.servers.mjs lists only remote/stage/controller/output_stream). Plan 01-03 updates it for grep-cleanliness only, with no test or build coverage."
    - "Left both `continue-on-error: true` entries in .github/workflows/ci.yml in place — recorded as findings; the count must stay exactly 2."

patterns-established:
    - "Baseline-before-change: the measurement apparatus (pinned command, recorded numbers, committed frame, proven-failable gate) exists before the first dependency change"
    - "A gate must be observed failing once before it is trusted; the probe is reverted and the revert is proven byte-identical (sha256) and `git diff`-empty"

requirements-completed: [TOOL-03, TOOL-04]

coverage:
    - id: D1
      description: "`package.json`'s `test:svelte` pinned to `svelte-check --tsconfig config/typescript/tsconfig.svelte.json`"
      requirement: TOOL-03
      verification:
          - kind: other
            ref: "cmd: node -e \"const s=require('./package.json').scripts; s['test:svelte']==='svelte-check --tsconfig config/typescript/tsconfig.svelte.json'\""
            status: pass
      human_judgment: false
    - id: D2
      description: "Five committed pre-upgrade baselines (svelte-check 2244 FILES/338 ERRORS/47 WARNINGS; four lint jobs with per-job fileCount; vitest 60 suites/181 tests/2 failed/0 skipped; prettier 1039 candidates/40 unformatted) plus the commands that produced them"
      requirement: TOOL-03
      verification:
          - kind: other
            ref: "cmd: node -e \"require('./.planning/phases/01-toolchain-gate/baseline/lint.json') jobs electron|frontend|svelte|styles each fileCount>0; vitest.json has numTotalTests/numPassedTests/numSkippedTests/numTotalTestSuites; svelte-check.txt has the COMPLETED summary line; COVERAGE.md exact-match\""
            status: pass
      human_judgment: false
    - id: D3
      description: "Committed 1920x1080 output-window baseline PNG, asserted non-blank on every spec run (IHDR is 1920x1080 and the decoded samples are not a single uniform colour)"
      requirement: TOOL-04
      verification:
          - kind: e2e
            ref: "playwright:config/testing/output-render.test.ts#projector output frame is pixel-identical to the committed pre-upgrade baseline"
            status: pass
      human_judgment: false
    - id: D4
      description: "The pixel gate was observed failing against a deliberate 40px padding mutation of MainOutput.svelte, then passing again after a byte-identical revert"
      requirement: TOOL-04
      verification:
          - kind: manual_procedural
            ref: "observed: '27544 pixels (ratio 0.02 of all image pixels) are different' + diff image written; mutation reverted (sha256 511cca68…) and the gate re-ran green"
            status: pass
      human_judgment: true
      rationale: "The failure observation is a historical act, not a re-runnable assertion: re-confirming it requires re-introducing a deliberate source mutation and a production rebuild. A verifier must judge the recorded evidence rather than trust an automated status."
    - id: D5
      description: "Platform-scoped skip: with no `-<platform>.png` committed and snapshots not being updated, the pixel comparison skips with a recorded reason, launches no Electron, and writes no baseline"
      requirement: TOOL-04
      verification:
          - kind: other
            ref: "cmd: npx playwright test --config config/testing/playwright.config.ts output-render --reporter=json (with the snapshot directory moved aside) -> annotations[type=skip] = 'no darwin pixel baseline at …' ; duration 388ms ; no file created"
            status: pass
      human_judgment: false
    - id: D6
      description: "RELEASE-SMOKE.md — the TOOL-04 cross-OS checklist: launch, Settings, create output, play song, import file (mocked dialog), three callable native-module probes, per-OS baseline re-capture, and the workflow_dispatch-only evidence rule"
      requirement: TOOL-04
      verification:
          - kind: other
            ref: "cmd: test -s .planning/phases/01-toolchain-gate/RELEASE-SMOKE.md"
            status: pass
      human_judgment: true
      rationale: "The file exists and is non-empty, but its value is whether the procedure is complete and executable on three platforms — and it has not been executed yet. Plan 01-05 executes it."
    - id: D7
      description: "COVERAGE.md containing exactly the one required line"
      verification:
          - kind: other
            ref: "cmd: test \"$(cat .planning/phases/01-toolchain-gate/COVERAGE.md)\" = \"No external API integration: toolchain/dependency upgrade only — no service, SDK, or network contract is touched.\""
            status: pass
      human_judgment: false

# Metrics
duration: 31min
completed: 2026-10-17
status: complete
---

# Phase 1 Plan 01: Freeze the Toolchain, Pin the Baseline Command, Stand Up the Pixel Gate Summary

**Pinned `svelte-check` to its real tsconfig (2244 files / 338 errors — the unpinned command was resolving nothing), recorded five pre-upgrade baselines and the per-OS TOOL-04 smoke checklist, and shipped a 1920×1080 output-window pixel gate proven capable of failing (27,544 pixels) and of skipping without self-writing a baseline.**

## Performance

- **Duration:** 31 min
- **Started:** 2026-10-17T23:00:00Z
- **Completed:** 2026-10-17T23:33:00Z
- **Tasks:** 3/3
- **Files modified:** 10 (9 created, 1 modified)

## Accomplishments

- **`test:svelte` is pinned** to `svelte-check --tsconfig config/typescript/tsconfig.svelte.json` — the same file `eslint.frontend.json` already names under `parserOptions.project`. There is no root `tsconfig.json`/`jsconfig.json`, so the old bare invocation traversed upwards, found nothing, and reported a near-clean result. The real baseline is **2244 FILES / 338 ERRORS / 47 WARNINGS / 598 HINTS** — and that count is in the thousands precisely so a future "near-zero" run is recognisable as a broken invocation rather than an improvement.
- **Five baselines recorded as committed files** (numbers and exact commands in `baseline/README.md`), plus a per-job lint breakdown that records the finding plan 01-02 needs: the Svelte lint job is **not inert** today — 464 files, 167 errors, 39 warnings, where all 39 warnings are Svelte compiler a11y diagnostics surfaced by the `eslint-plugin-svelte3` processor (kebab-case rule ids, **zero** ids under the literal `svelte3/` namespace).
- **The output-window pixel gate exists and works.** `config/testing/output-render.test.ts` boots the production path against a throwaway store, seeds the `test line 1…4` show, takes the first slide live, opens a projector window through the operator's own top-bar display toggle, locates it by the `output_window` DOM hook, and compares a 1920×1080 `scale: "css"` frame at `maxDiffPixels: 0`. The committed baseline is a real frame: black background, white two-line lyric, centred.
- **The gate was observed failing before it was trusted**: a deliberate `padding-top: 40px` in `MainOutput.svelte`'s `<style>` produced `27544 pixels (ratio 0.02 of all image pixels) are different` and a diff image; the mutation was then reverted and proven byte-identical (sha256 `511cca68…`, empty `git diff`), and the gate re-ran green.
- **Both branches of the platform guard are empirically exercised**: with the committed baseline temporarily removed, the pixel test **skipped** in 388 ms with its recorded reason and wrote nothing; with `--update-snapshots=all` and no baseline present it **ran and wrote** it (observed in the capture run: "A snapshot doesn't exist at …, writing actual.").
- **`RELEASE-SMOKE.md`** encodes TOOL-04 as numbered, per-OS steps including the callable native-module probes (open a SQLite DB, construct an Opus encoder, call `osr-capture`'s synchronous converter) and the `workflow_dispatch`-only evidence rule.

## Recorded pre-upgrade baselines

| # | Check | Number |
|---|---|---|
| 1 | `npx svelte-check --tsconfig config/typescript/tsconfig.svelte.json --output machine` | **2244 FILES / 338 ERRORS / 47 WARNINGS / 598 HINTS** |
| 2 | Electron lint (149 files) | 212 errors / 25 warnings |
| 2 | Frontend lint (255 files) | 630 errors / 0 warnings |
| 2 | Svelte lint (464 files) | 167 errors / 39 warnings (39 = Svelte compiler a11y diagnostics via the svelte3 processor) |
| 2 | Stylelint (464 files) | 216 errors / 0 warnings |
| 3 | `npx vitest run --config config/testing/vitest.config.ts --reporter=json` | 12 files / 60 suites / **181 tests: 179 passed, 2 failed, 0 skipped, 0 todo** |
| 4 | `npx prettier --config config/formatting/.prettierrc.yaml --check src scripts` | exit 1 · 1039 candidates · **40 unformatted (20 `.svelte`)** |
| 5 | Pixel baseline | `config/testing/output-render.test.ts-snapshots/output-1920x1080-darwin.png` (20,213 bytes, IHDR 1920×1080, colour type 2) |

Pre-existing, **not** regressions: the 2 Vitest failures both live in `src/electron/cloud/syncManager.test.ts`; the 40 Prettier misses are the standing backlog.

## Observed pixel-gate failure message

```
Error: expect(page).toHaveScreenshot(expected) failed
  27544 pixels (ratio 0.02 of all image pixels) are different.
  Snapshot: output-1920x1080.png
...
Expected: config/testing/output-render.test.ts-snapshots/output-1920x1080-darwin.png
Received: test-results/output-render-projector-ou-95a8f-mitted-pre-upgrade-baseline/output-1920x1080-actual.png
Diff:     test-results/output-render-projector-ou-95a8f-mitted-pre-upgrade-baseline/output-1920x1080-diff.png
1 failed
1 passed
```

Correct behaviour in every respect: the pixel test failed, the **flow test passed** (so the failure was pixel-only, not a broken capture), the diff image was written, and the committed baseline's sha256 was unchanged by the failing run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install the frozen toolchain and pin the svelte-check baseline command** — `136d7757` (chore)
2. **Task 2: Record the five pre-upgrade baselines, the release smoke checklist and COVERAGE.md** — `911edcf0` (test)
3. **Task 3: Build the output-window pixel gate and capture the pre-upgrade baseline frame** — `fdc2ec5e` (test)

**Plan metadata:** _(this commit)_

## Files Created/Modified

- `package.json` — `test:svelte` gains `--tsconfig config/typescript/tsconfig.svelte.json`; nothing else (1 insertion, 1 deletion)
- `config/testing/output-render.test.ts` — the pixel-diff gate (411 lines): flow assertions and the pixel comparison in separate `test()` bodies; platform-scoped skip; inline PNG decoder + non-blankness guard
- `config/testing/output-render.test.ts-snapshots/output-1920x1080-darwin.png` — the committed pre-upgrade baseline frame
- `.planning/phases/01-toolchain-gate/baseline/{svelte-check.txt,lint.json,vitest.json,format.txt,README.md}` — the five recorded baselines and the exact commands
- `.planning/phases/01-toolchain-gate/RELEASE-SMOKE.md` — the TOOL-04 cross-OS checklist
- `.planning/phases/01-toolchain-gate/COVERAGE.md` — the api-coverage seal input (exactly one line)

## Decisions Made

- **Pin `svelte-check` before any version moves**, so the pre- and post-upgrade runs are character-identical. The recorded 338 errors confirm the diagnosis rather than contradicting it.
- **Locate the output page by the `output_window` hook, written as a class token.** `src/frontend/MainOutput.svelte` has `class="fill context #output_window"`; the `#` is FreeShow's context-menu target convention (`class="context #output_screen"`, `class="context #drawer_top"`), so `document.querySelector("#output_window")` matches nothing. The spec's selector accepts an id or the class token.
- **Open the projector window through the operator's own top-bar display toggle** rather than the Settings → Outputs popup chain: `#output_window_button` → `toggleOutputs()` → `send(OUTPUT, ["TOGGLE_OUTPUTS"])` → `OutputVisibility.toggleOutput` → `OutputLifecycle.createOutput()`. No popups, no index-based window selection, and no test-only shortcut.
- **Per-OS baselines only**, with `test.skip` carrying the capture instructions when no `-<platform>.png` is committed. This is what makes T-01-07 (a dispatch auto-creating the snapshot it then passes against, masked by `retries`) impossible rather than merely unlikely.
- **`--update-snapshots=all` is the only sanctioned capture flag** (a bare `--update-snapshots` sets `"changed"`; the guard's `updateSnapshots !== "all"` clause would then skip the capture run).
- **Leave `config/building/rollup.config.mjs` alone** — dead code, zero references outside `AGENTS.md`; its stale `a11y-` prefix is deliberate.
- **Leave `src/server/cam/main.ts` alone** — the fifth `new App(` site has no build path; plan 01-03 updates it for grep-cleanliness with no test or build coverage.
- **Leave both `continue-on-error: true` entries in `ci.yml` in place** — recorded as findings, count still exactly 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The output-window DOM hook is a class token, not an id**

- **Found during:** Task 3 (first capture run)
- **Issue:** The plan (and `01-RESEARCH.md`) describe locating the output page by "the `#output_window` DOM hook". `MainOutput.svelte` writes it as `class="fill context #output_window"` — an id lookup matches nothing. The first run failed with `no window rendered #output_window after the display toggle` even though the output window **existed at exactly 1920×1080 and was already rendering `test line 1 test line 2`** (confirmed by a standalone diagnostic harness).
- **Fix:** selector `#output_window, [class~='#output_window']` — accepts an id or the class token. The header comment documents why.
- **Files modified:** `config/testing/output-render.test.ts`
- **Verification:** capture, comparison ×2, mutated (failing) and green runs all behave correctly; the flow test asserts the hook is present.
- **Committed in:** `fdc2ec5e` (Task 3 commit)

### Deviations from the named primary route (not auto-fixes — better routes, both still the operator path)

**2. Output creation went through the top-bar display toggle, not the Settings → Outputs create flow.**

The plan named "drive the UI … `send(OUTPUT, ["CREATE"], …)` from `OutputsTabs.svelte`/`Outputs.svelte`" as primary and `electronApp.evaluate` + `loadWindowContent` as the sanctioned fallback. `OutputsTabs.createOutput()` is a 2–3 modal popup chain (`choose_output_input`/`select_style`/`choose_output_type`) with locale-dependent text selectors — fragile for a pixel gate and better covered by the smoke checklist. The route actually used is popup-free and is the operator's own path:

1. click the seeded show's first slide **twice** — the first click materialises the default "Primary" output entry (`getActiveOutputs()` calls `addOutput(true)` when the store has none, but returns before the new entry is visible to it), the second writes `out.slide`;
2. click `#output_window_button` → `toggleOutputs()` → `TOGGLE_OUTPUTS` → `OutputVisibility.toggleOutput` → `OutputLifecycle.createOutput()`.

The scripted `loadWindowContent` fallback was **never needed** and is not present in the spec.

**3. Viewport route: no resize was required.**

`ensureOutputSize()` implements both routes the plan asked for (`page.setViewportSize` first, `BrowserWindow.setContentSize` second) and records which one fired. The observed route is **"window content (bounds already 1920x1080)"** — `defaultOutput.bounds` is `{0,0,1920,1080}`, `resolveOutputBounds` returns it unchanged when its centre lies on a display, and `outputOptions.enableLargerThanScreen` is set. Both fallbacks remain in place and would report `unsupported (ended at WxH)` rather than silently passing.

> **Carry-forward for plan 01-05:** because the window is *created* at the configured bounds, the Linux CI concern from `01-RESEARCH.md` stands. `playwright.yml` currently runs `xvfb-run --server-args="-screen 0 1280x960x24"`; a 1280×960 virtual screen will clamp the window and the capture will not be 1920×1080. It must be widened, as `RELEASE-SMOKE.md` precondition 3 records.

**4. The spec requires a production build to run; the plan's Task 3 verify block and its plan-level check 5 cannot both hold at the same instant.**

`NODE_ENV: "production"` makes the app `loadFile("public/index.html")`, so the spec only works while `public/index.html` carries the production script/link tags (which `npm run build` writes and `cleanBuilds.js` removes). Observed directly: with the dev tags restored, the renderer bundle 404s and the flow test times out. Resolution taken: run the spec against the production build (**exit 0**, 2 passed), then run `node scripts/cleanBuilds.js` and assert `git status --porcelain public/index.html` is empty and the dev literal is present — satisfying plan-level check 5. `playwright.yml` already satisfies the same precondition (`npm run build` precedes `npm run test:playwright`).

**5. The plan's verify block pipes the spec through `tail`, which hides its exit code**

`npx playwright test … 2>&1 | tail -20` returns `tail`'s status, so a failing spec would not break the `&&` chain. The spec was therefore also run without a pipe and its exit code asserted directly (`SPEC_EXIT=0`).

---

**Total deviations:** 1 auto-fixed (Rule 3 – blocking), 4 documented route/ordering deviations. No scope creep: all five are recorded for the next plan rather than absorbed silently.

## Issues Encountered

- **`npm ci` was already complete** before this plan started (1071 packages, native modules rebuilt for arm64) — Task 1's install step was recorded rather than re-run, and its remaining work (the `test:svelte` pin) was done.
- **Debugging the hook cost one diagnostic cycle.** A standalone Playwright Electron harness in the gitignored `test-output/` (since removed) dumped per-window DOM state and proved the output window was correct and only the selector was wrong — cheaper than guessing.
- **`npx prettier --check` exits 1 and reports 40 files.** Expected: this is the pre-upgrade baseline, recorded, not a regression. `config/**` is outside `test:format`'s scope (`--check src scripts`), which is why the new spec is not prettier-gated; it is written in the repo's style anyway.
- **Flow-test timeout when run without a build.** Explained in deviation 4; not a defect in the spec.

## User Setup Required

None — no external service configuration required. No new npm dependency was added, and `package-lock.json` is byte-identical (`git status --porcelain package-lock.json` is empty).

## Next Phase Readiness

**Ready for plan 01-02** (pre-bump hardening). It has everything it needs:

- `baseline/README.md` gives the exact commands; `baseline/lint.json` carries each job's `command`, `fileCount` and full `ruleBreakdown`, so the flat-config migration's parity claim is measured against recorded values rather than memory.
- The Svelte lint job's parity bar is explicit: it must keep surfacing the **same compiler diagnostics** (`svelte/valid-compile`, which `eslint-plugin-svelte@3` removed from `recommended`). The 39 recorded kebab-case a11y ids are the concrete evidence that this check exists today and must not vanish.
- The pixel gate is live and will catch any CSS/layout regression the pre-bump config work introduces — and it has been proven capable of failing, so a green run is now meaningful.

**Carry-forward items for later plans in this phase:**

- Plan 01-05 must widen `playwright.yml`'s `xvfb-run --server-args` to `-screen 0 1920x1080x24`, add the `update_snapshots` `workflow_dispatch` input, and commit `-linux.png`/`-win32.png` baselines via `--update-snapshots=all`. Until a platform's baseline is committed, its pixel comparison skips with a recorded reason — by design, not by accident.
- The pixel gate must be re-run **after** the toolchain swap (01-03) and compared against the committed `-darwin` baseline; that comparison is the phase's TOOL-04 evidence.
- `config/building/rollup.config.mjs` (dead) and `src/server/cam/main.ts` (unbuilt fifth entry) are deliberately untouched — recorded here so they are not rediscovered as omissions.
- `ci.yml` still has exactly **two** `continue-on-error: true` entries. Flipping either is a CI-behaviour change and remains out of scope for Phase 1.

---

*Phase: 01-toolchain-gate*
*Completed: 2026-10-17*
