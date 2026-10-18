# Phase 1 Plan 04 — Post-upgrade parity evidence

**Comparison revision:** `136d77575ec1f853c66eba3a1f44be7401e9234c` (`baseline/README.md`). All source-scope comparisons below use this pre-toolchain commit, not the previous plan tip.

## Task 1 — Scope, runtime surface, build contract, and output pixels

### Diff-scope audit

Commands were run with zsh-safe revision/path quoting (`"${BASE}:path"`). The complete plan-tip changed-path set is asserted as 46 paths after the required summary artifact is created; the unrelated, already-dirty `.planning/config.json` is not included or staged.

```text
git diff --name-only "$BASE" -- 'src/**/*.svelte' ':!src/frontend/components/settings/tabs/Connection.svelte'
[no output; exit 0]

git diff --numstat "$BASE" -- src/frontend/components/settings/tabs/Connection.svelte
3	3	src/frontend/components/settings/tabs/Connection.svelte

git diff --name-only "$BASE" -- src/electron
[no output; exit 0]

git diff --quiet "$BASE" -- src/electron/preload.ts src/types/Channels.ts
exit 0
```

`Connection.svelte` is the one explicitly authorized exception: its three-line `connections` → `connectionCount` local binding rename fixes Svelte 5's hard scoped-store-subscription error. No other `.svelte` file differs from `$BASE`; no `src/electron/**` file, preload surface, or IPC channel file differs.

The baseline positive control and current-state checks:

```text
git show "${BASE}:src/frontend/main.ts" | grep -c 'new App('
1

grep -rn 'new App(' src
[no output; 0 matches]

grep -rln 'svelte/internal|\$\$restProps|\.\$set(' src
[no output; 0 files]

grep -rl 'mount(' src/frontend/main.ts src/server/*/main.ts | wc -l
6
```

Thus the legacy-constructor grep has a real positive control in the pre-upgrade tree, and all six main/server entry files now use `mount()`.

### Complete plan-tip changed-path set

This is the exact expected set, including this artifact and the required `01-04-SUMMARY.md`. It excludes only the unrelated dirty `.planning/config.json`, `.planning/milestone.lock`, `.planning/state.json`, and `.gsd/` session data; none of those are staged by this plan.

```text
.planning/STATE.md
.planning/phases/01-toolchain-gate/01-01-SUMMARY.md
.planning/phases/01-toolchain-gate/01-02-SUMMARY.md
.planning/phases/01-toolchain-gate/01-03-PLAN.md
.planning/phases/01-toolchain-gate/01-03-SUMMARY.md
.planning/phases/01-toolchain-gate/01-04-PLAN.md
.planning/phases/01-toolchain-gate/01-04-SUMMARY.md
.planning/phases/01-toolchain-gate/COVERAGE.md
.planning/phases/01-toolchain-gate/PARITY.md
.planning/phases/01-toolchain-gate/RELEASE-SMOKE.md
.planning/phases/01-toolchain-gate/baseline/README.md
.planning/phases/01-toolchain-gate/baseline/format.txt
.planning/phases/01-toolchain-gate/baseline/lint.json
.planning/phases/01-toolchain-gate/baseline/svelte-check.txt
.planning/phases/01-toolchain-gate/baseline/vitest.json
config/building/vite.config.servers.mjs
config/linting/eslint.electron.json
config/linting/eslint.frontend.json
config/linting/eslint.svelte.flat.mjs
config/linting/eslint.svelte.js
config/testing/output-render.test.ts
config/testing/output-render.test.ts-snapshots/output-1920x1080-darwin.png
package-lock.json
package.json
scripts/assertBuildOutput.js
src/frontend/ai/scripture/BibleCacheManager.ts
src/frontend/audio/audioAnalyser.ts
src/frontend/components/export/projectLink.ts
src/frontend/components/settings/tabs/Connection.svelte
src/frontend/components/timeline/TimelineActions.ts
src/frontend/components/timeline/TimelinePlayback.ts
src/frontend/main.ts
src/frontend/tsconfig.json
src/frontend/utils/searchFast.ts
src/server/cam/main.ts
src/server/controller/main.ts
src/server/output_stream/main.ts
src/server/remote/main.ts
src/server/remote/util/socket.ts
src/server/remote/util/stores.ts
src/server/stage/main.ts
src/server/stage/util/itemHelpers.ts
src/server/stage/util/stores.ts
src/server/tsconfig.json
svelte.config.mjs
vite.config.mjs
```

The asserted plan-tip count is **46**. The only Svelte path in this set is the authorized `Connection.svelte` exception above.

### Production build contract

```text
npm run build
exit 0
Build output assertion passed: bundle.css (257310 bytes, 3 component selectors), bundle.js, production HTML literal, electron build

public/build/*.css count: 1 (bundle.css)
bundle.css: 257310 bytes
bundle.js: 3930171 bytes; source banner `// ----- FreeShow -----` absent (minified)
build/electron/{remote,stage,controller,output_stream}/styles.css: all 4 non-empty
production HTML literal in public/index.html: present
EMPTY_IMPORT_META warnings: 0
```

The Svelte 5/Rolldown build still emits **161** `element_invalid_self_closing_tag` warnings (154 frontend diagnostics across 78 source files and 7 server diagnostics across 6 files). These are new compiler warnings, not a failed build; they are left visible and unresolved rather than suppressed or mass-editing out-of-scope components. The previous 01-03 note estimated 165; this clean production rerun is the authoritative count for this plan. The checker independently reports 157 instances of the same code; the production bundle only compiles the reachable subset.

```text
node scripts/assertBuildOutput.js
Build output assertion passed: bundle.css (257310 bytes, 3 component selectors), bundle.js, production HTML literal, electron build

node scripts/cleanBuilds.js
exit 0
dev HTML literal restored: present
git status --porcelain public/index.html
[no output]
```

### Output-window pixel gate

```text
npx playwright test --config config/testing/playwright.config.ts output-render
2 passed (28.9s)
projector baseline: output-1920x1080-darwin.png, verified non-uniform at 1920x1080
maxDiffPixels: 0; no snapshot update flag used
```

The production build was run immediately before the pixel gate and cleaned afterward. Retina capture is normalized with Electron's `--force-device-scale-factor=1`; the snapshot and zero-pixel threshold are unchanged.

## Task 2 — Check measurements

All checks were run individually, without `--fix`, with their recorded baseline command arguments. `npm run lint` was not run because its chain invokes `--fix` in the Electron/frontend jobs and is already red at baseline. The formatting check was run directly as a non-mutating measurement; its expected exit 1 is not treated as a regression by itself.

### Baseline versus post-upgrade

| Check | Baseline (`baseline/`) | Post-upgrade result | Verdict |
|---|---|---|---|
| `svelte-check` | `2244 FILES / 338 ERRORS / 47 WARNINGS / 598 HINTS` | `2174 FILES / 144 ERRORS / 291 WARNINGS / 0 reported HINTS`; 138 files with problems | Error count is below baseline; file count remains in the thousands with the same project `include`/`exclude`. **Warning delta +244 is an unresolved finding**, composed below. |
| `lint:electron` | 149 files; 212 errors + 25 warnings = 237 problems | 149 files; 271 errors + 0 warnings = 271 problems (**+34**) | **BLOCKER:** existing-rule finding counts rose; see rule-by-rule attribution in Task 3. The baseline `restrict-plus-operands` behavior was restored explicitly. |
| `lint:frontend` | 255 files; 630 errors + 0 warnings = 630 problems | 255 files; 684 errors + 0 warnings = 684 problems (**+54**) | **BLOCKER:** existing-rule finding counts rose; see Task 3. The v8 parser error on `simplex-noise.js` was fixed without dropping the file. |
| `lint:svelte` | 464 files; 167 errors + 39 warnings = 206 problems | 464 files; 185 errors + 0 warnings = 185 problems (**−21**) | Problem total is lower. The 39 baseline Svelte compiler/a11y warnings are still surfaced by `svelte-check` (now 129 a11y warnings); v8 rule deltas and the compile-rule positive control are recorded below. |
| `lint:styles` | 464 files; 216 errors = 216 problems | 464 files; 216 errors = 216 problems | Pass; exact count and rule population unchanged (`csstools/use-logical`: 216). |
| Vitest | 12 files / 60 suites / 181 tests; 179 passed / 2 failed / 0 skipped / 0 todo | 60 suites / 181 tests; 179 passed / 2 failed / 0 pending / 0 todo; derived skipped = 0 | Pass; the only failures remain the two recorded `syncManager.test.ts` baseline failures. |
| Prettier | 1039 candidates / 547 `.svelte` candidates; 40 unformatted / 20 `.svelte` | 1040 candidates / 547 `.svelte` candidates; 40 unformatted / 20 `.svelte`; the 40-file list is byte-for-byte the baseline list | Pass; the one extra candidate is newly added `scripts/assertBuildOutput.js`, which is formatted. No formatter writes were run. |

### Raw command evidence

**Svelte checker** — same command as baseline:

```text
npx svelte-check --tsconfig config/typescript/tsconfig.svelte.json --output machine
exit 1
COMPLETED 2174 FILES 144 ERRORS 291 WARNINGS 138 FILES_WITH_PROBLEMS
TS5102 matches: 0
TS7006 / TS7031 matches: 0
warning composition: 157 element_invalid_self_closing_tag + 129 a11y_* + 5 other
```

`src/frontend/tsconfig.json` retains `include: ["."]` and `exclude: ["node_modules/*", "__sapper__/*", "public/*"]`; `svelte-check` continues to cover all 464 frontend Svelte files selected by that existing project scope. The 83 server Svelte files remain outside this checker, a pre-existing gap documented in 01-03. The reduced `FILES` number is the resolved TypeScript program population (primarily dependency declarations under the changed `@tsconfig/svelte`/TypeScript module-resolution defaults), not a narrowed include glob. The count is 70 below the baseline but still 2174, not a false-pass near-zero run. `allowJs: true` plus `noEmit: true` also keeps the JavaScript lint target in the TypeScript program without producing the TS5055 overwrite warning observed during the first probe.

**Electron lint** — baseline command, non-mutating (no `--fix`):

```text
npx eslint -c config/linting/eslint.electron.json --ext .js,.ts src/electron --format json
exit 1
149 files / 271 errors / 0 warnings / 271 problems
```

**Frontend lint** — baseline command, non-mutating (no `--fix`):

```text
npx eslint -c config/linting/eslint.frontend.json --ext .js,.ts src/frontend --format json
exit 1
255 files / 684 errors / 0 warnings / 684 problems
unnamed parser errors: 0
```

The first post-upgrade frontend run had one parser error for `src/frontend/components/output/effects/simplex-noise.js` because `allowJs` was false in the project. Adding `allowJs: true` and `noEmit: true` to the existing frontend tsconfig made the same 255-file lint job parse that file; it did not change source files or turn the error into an ignore.

**Svelte lint** — required replacement for the baseline `eslint-plugin-svelte3` invocation; flat config is non-mutating and runs on all 464 `.svelte` files:

```text
ESLINT_USE_FLAT_CONFIG=true npx eslint -c config/linting/eslint.svelte.flat.mjs src/frontend --format json
exit 1
464 files / 185 errors / 0 warnings / 185 problems
effective config: svelte/valid-compile = [2, {"ignoreWarnings":true}]
source findings under svelte/valid-compile: 0
```

The absence of a compile-error finding in the source corpus is not a zero-file/inert job: it processed 464 files and reported 185 real TypeScript lint findings. A controlled stdin positive control with a warning-producing component and `ignoreWarnings:false` produced three `svelte/valid-compile` findings (a11y click/role and non-void self-closing diagnostics); production config intentionally ignores warning diagnostics, while `svelte-check` reports those compiler warnings. The positive control did not modify a file:

```text
printf '<div on:click={() => {}} />\\n' | ESLINT_USE_FLAT_CONFIG=true npx eslint -c config/linting/eslint.svelte.flat.mjs --stdin --stdin-filename src/frontend/components/main/Top.svelte --rule 'svelte/valid-compile: ["error", {"ignoreWarnings":false}]' --format json
exit 1; svelte/valid-compile findings: 3
```

**Styles lint** — same command as baseline (Stylelint writes its JSON report to stderr in this CLI invocation):

```text
npx stylelint 'src/frontend/**/*.{css,scss,svelte}' --config config/linting/.stylelintrc.json --formatter json
exit 2
464 files / 216 errors / 216 problems; csstools/use-logical = 216
```

Exit 2 and 216 problems match the pre-upgrade red baseline; the JSON was parsed from stderr, not treated as empty output.

**Vitest** — same command as baseline:

```text
npx vitest run --config config/testing/vitest.config.ts --reporter=json
exit 1
numTotalTestSuites=60; numTotalTests=181; numPassedTests=179; numFailedTests=2; numPendingTests=0; numTodoTests=0
derived skipped = 181 - 179 - 2 = 0 (Vitest 4 JSON omits numSkippedTests; assertion statuses contain only passed/failed)
```

The two failing tests are the same baseline scenarios in `src/electron/cloud/syncManager.test.ts`; no test was skipped or added to a pending/todo state.

**Prettier** — same command as baseline:

```text
npx prettier --config config/formatting/.prettierrc.yaml --check src scripts
exit 1
Code style issues found in 40 files.
current unformatted list == baseline/format.txt unformatted list: true
candidate count: 1040 (baseline 1039 + the one new tracked .js build assertion); .svelte candidates: 547; unformatted .svelte: 20
```

The one extra candidate does not change the unformatted set. No `--write` command was run.

### Check inventory and non-blocking posture

```text
npm pkg get scripts.test:svelte scripts.test:unit scripts.test:playwright scripts.test:format scripts.lint:electron scripts.lint:frontend scripts.lint:svelte scripts.lint:styles
all eight named scripts: non-empty
scripts.lint members: lint:electron, lint:frontend, lint:svelte, lint:styles
scripts.lint:svelte contains --fix: no

grep -c 'continue-on-error: true' .github/workflows/ci.yml: 2
git show "${BASE}:.github/workflows/ci.yml" | grep -c 'continue-on-error: true': 2
git diff --name-only "$BASE"..HEAD -- .github/workflows/ci.yml: [no output]
```

No CI blocking behavior or check inventory was removed. The Electron/frontend ESLint jobs were invoked directly without their package-script `--fix` flags; the Svelte and style jobs were also run without autofix.

## Task 3 — Findings and resolutions

### Findings and resolutions

| Finding | Before → after | Lever / changed files | Disposition |
|---|---|---|---|
| v8 changed `restrict-plus-operands` defaults. The old v5 preset reported 20 Electron findings; v8's new permissive defaults initially reported 0 and made the Electron total 251. | Rule: 20 → 0 (initial) → 20 restored; Electron total: baseline 237 → final 271 (+34). | `config/linting/eslint.electron.json`: explicitly restore v5 behavior (`allowAny`, `allowBoolean`, `allowNullish`, `allowNumberAndString`, `allowRegExp` false; skip `+=` assignments). | Resolved without weakening the existing check. The rule is not silenced. Final lint total remains above baseline; see blocker below. |
| Electron existing-rule findings increased under the migrated parser/rule set. | Baseline 237 → final 271 (+34). `no-unused-vars` 25→42 (+17), `no-unnecessary-type-assertion` 3→18 (+15), `await-thenable` 3→6 (+3), `no-shadow` 32→31 (−1), `restrict-plus-operands` 20→20. Baseline/current unnamed parser diagnostics are 9/9. | No existing rule disabled; the plus rule's prior behavior is explicit in `config/linting/eslint.electron.json`. | **BLOCKER:** all increases are under existing checks; source fixes are prohibited by this plan's scope and dropping those rules would violate the user's preservation requirement. |
| Frontend ESLint v8 rejected the existing JavaScript module `simplex-noise.js` as outside its type-aware TS project. | Initial 685 problems including 1 unnamed parser error → final 684 problems and 0 parser errors; baseline is 630. | `src/frontend/tsconfig.json`: `allowJs: true` includes the already-linted JS file; `noEmit: true` keeps the check-only project from emitting over an input file. | The parser error is resolved with no source edit or coverage drop. The remaining +54 is a blocker, not hidden. |
| Frontend existing-rule findings remain above baseline. | Baseline 630 → final 684 (+54): `no-unnecessary-type-assertion` 26→73 (+47), `no-unused-vars` 4→17 (+13), `await-thenable` 0→1 (+1), `consistent-type-imports` 7→0 (−7). | No existing rule disabled. Only v8-only rules absent from the baseline were deferred in `config/linting/eslint.frontend.json`, with Phase 7 comments. | **BLOCKER:** +54 under existing checks remains. Source findings cannot be edited under the authorized scope; weakening these rules is not acceptable. |
| Enabling `allowJs` initially made svelte-check warn that it would overwrite `simplex-noise.js` (TS5055). | First allow-JS probe: 2175 FILES / 144 ERRORS / 292 WARNINGS; after check-only `noEmit`: 2174 / 144 / 291. | `src/frontend/tsconfig.json`: set `noEmit: true`; the final checker output has no TS5055 warning. | Resolved; the final `FILES` count remains in the thousands and `TS7006`/`TS7031` remain 0. |
| The `FILES` count decreased while the check remained pinned to the same project scope. | Baseline 2244 → final 2174 (−70); `include: ["."]` and the existing excludes are unchanged. | No scope glob was narrowed. The 464 frontend Svelte files remain in the project; the 83 server Svelte files remain outside this pre-existing frontend-only checker scope. | Classified as changed resolved-program/dependency population under TypeScript 5.9 and `@tsconfig/svelte` 5; the large non-zero count and unchanged source include/exclude guard against a no-project false pass. The baseline did not retain a per-file program manifest, so the 70 dependency-file delta cannot be enumerated file-by-file. |
| Svelte-check warning output increased, including new Svelte 5 self-closing-tag diagnostics. | Baseline 47 → final 291 (+244): 157 `element_invalid_self_closing_tag`, 129 `a11y_*`, and 5 other diagnostics. The production build emits 161 self-closing-tag warnings (154 frontend diagnostics across 78 files; 7 server diagnostics across 6 files; 84 unique source files total). | No warning was suppressed and no component was edited. `PARITY.md` records the actual rerun count (161), correcting the 01-03 estimate of 165. | **BLOCKER:** these new warnings remain visible. Mass-fixing `.svelte` files is outside scope; suppressing them is explicitly disallowed by the user. |
| Svelte lint compiler-warning output differs by tool version/configuration. | Baseline lint:svelte: 464 files / 167 errors / 39 compiler warnings / 206 problems. Final: 464 / 185 / 0 / 185. `svelte-check` still carries 129 current a11y warnings (baseline checker had 39 a11y + 8 CSS warnings). | `svelte/valid-compile` is enabled at error severity; effective config is `[2, {"ignoreWarnings":true}]`. A no-write stdin positive control with `ignoreWarnings:false` produced three rule findings. | No check is inert or removed: `lint:svelte` reports 185 real findings over 464 files, the rule's reporting path is proven, and compiler warnings remain observable via `svelte-check`. This row is below the baseline problem total. |
| Vitest result parity. | 179 passed / 2 failed / 0 skipped both before and after; 181 total tests and 60 suites. | No test/source changes. Current Vitest JSON omits `numSkippedTests`; its `numPendingTests` is 0 and assertion statuses are exactly 179 passed + 2 failed. | Pass; the same two `syncManager.test.ts` baseline failures remain. |
| Prettier and stylelint parity. | Prettier: 40 unformatted files and the identical 40-file set (20 `.svelte`); current candidates 1040 vs baseline 1039 due the new build assertion script. Stylelint: 464 files / 216 errors both runs. | No formatter write; no source/CSS changes. | Pass. The added candidate is formatted and does not change the baseline set. |
| Check inventory and CI blocking posture. | Eight required script names present; four lint members present; `continue-on-error: true` is 2 before and after. | No CI/script deletion or non-blocking change. | Pass; `lint:svelte` remains in the chain and its script has no `--fix`. |

### Blocking outcome

The planned parity gate is **not met**. The final Electron and frontend lint totals exceed their recorded baselines by 34 and 54 problems, respectively, under rules that were already part of the old checks. Reaching the baseline totals would require either modifying out-of-scope application source to address those findings or disabling existing rules; the latter is explicitly prohibited. In addition, the build now exposes 161 Svelte 5 `element_invalid_self_closing_tag` warnings (and svelte-check has 291 warnings versus 47 at baseline). These are intentionally not suppressed or rewritten because the user prohibited other `.svelte` edits and asked that warnings be investigated rather than hidden. The findings are classified, but remain unresolved; this plan must be reported **BLOCKED**, not complete.
