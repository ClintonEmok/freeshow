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
| `svelte-check` | `2244 FILES / 338 ERRORS / 47 WARNINGS / 598 HINTS` | `2174 FILES / 144 ERRORS / 291 WARNINGS`; svelte-check 4 emits no HINTS field; 138 files with problems | Error count is below baseline; file count remains in the thousands with the same project `include`/`exclude`. **Warning delta +244 is an unresolved finding**, composed below. |
| `lint:electron` | 149 files; 212 errors + 25 warnings = 237 problems | 149 files; 254 errors + 0 warnings = 254 problems (**+17**) | **BLOCKER:** `no-unnecessary-type-assertion` (+15) and `await-thenable` (+3) remain above baseline; `no-unused-vars` now exactly matches the v5 baseline after restoring its old caught-error default. The baseline `restrict-plus-operands` behavior is also explicit. |
| `lint:frontend` | 255 files; 630 errors + 0 warnings = 630 problems | 255 files; 671 errors + 0 warnings = 671 problems (**+41**) | **BLOCKER:** `no-unnecessary-type-assertion` (+47) and `await-thenable` (+1) remain above baseline; `no-unused-vars` now exactly matches the v5 baseline after restoring its old caught-error default. The v8 parser error on `simplex-noise.js` was fixed without dropping the file. |
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
149 files / 254 errors / 0 warnings / 254 problems
rule counts: `@typescript-eslint/no-unused-vars` 25; `@typescript-eslint/no-unnecessary-type-assertion` 18; `@typescript-eslint/await-thenable` 6
full rule breakdown: `no-console` 62; `@typescript-eslint/require-await` 34; `no-shadow` 31; `@typescript-eslint/no-unused-vars` 25; `@typescript-eslint/restrict-plus-operands` 20; `no-empty` 19; `@typescript-eslint/no-unnecessary-type-assertion` 18; `(no-rule)` 9; `no-underscore-dangle` 7; `@typescript-eslint/await-thenable` 6; `@typescript-eslint/no-empty-function` 6; `@typescript-eslint/unbound-method` 4; `max-classes-per-file` 4; `radix` 3; `@typescript-eslint/consistent-type-imports` 2; `guard-for-in` 2; `@typescript-eslint/prefer-for-of` 1; `id-blacklist` 1
```

**Frontend lint** — baseline command, non-mutating (no `--fix`):

```text
npx eslint -c config/linting/eslint.frontend.json --ext .js,.ts src/frontend --format json
exit 1
255 files / 671 errors / 0 warnings / 671 problems
unnamed parser errors: 0
rule counts: `@typescript-eslint/no-unused-vars` 4; `@typescript-eslint/no-unnecessary-type-assertion` 73; `@typescript-eslint/await-thenable` 1
full rule breakdown: `prefer-const` 164; `no-shadow` 111; `@typescript-eslint/no-inferrable-types` 94; `@typescript-eslint/no-unnecessary-type-assertion` 73; `@typescript-eslint/prefer-for-of` 49; `no-empty` 42; `no-console` 33; `@typescript-eslint/no-empty-function` 33; `radix` 13; `@typescript-eslint/require-await` 12; `spaced-comment` 11; `@typescript-eslint/array-type` 8; `object-shorthand` 6; `one-var` 6; `@typescript-eslint/no-unused-vars` 4; `max-classes-per-file` 2; `@typescript-eslint/no-unused-expressions` 2; `eqeqeq` 2; `@typescript-eslint/dot-notation` 2; `no-undef-init` 1; `@typescript-eslint/await-thenable` 1; `@typescript-eslint/no-implied-eval` 1; `@typescript-eslint/no-this-alias` 1
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
| v8 changed `restrict-plus-operands` defaults. The old v5 preset reported 20 Electron findings; v8's new permissive defaults initially reported 0 and made the Electron total 251. | Rule: 20 → 0 (initial) → 20 restored; Electron total after both compatibility corrections: baseline 237 → final 254 (+17). | `config/linting/eslint.electron.json`: explicitly restore v5 behavior (`allowAny`, `allowBoolean`, `allowNullish`, `allowNumberAndString`, `allowRegExp` false; skip `+=` assignments). | Resolved without weakening the existing check. The rule is not silenced. Remaining lint deltas are limited to the blockers below. |
| typescript-eslint v8 changed `no-unused-vars`'s `caughtErrors` default from v5's `none` to `all`; caught-error findings were version-default behavior drift, not new source debt. | Before correction: Electron `no-unused-vars` 42 vs baseline 25; frontend 17 vs baseline 4. After explicit `caughtErrors: "none"`: Electron 25 / total 254 (baseline 237, +17); frontend 4 / total 671 (baseline 630, +41). | `config/linting/eslint.electron.json` explicitly sets `caughtErrors: "none"`; `config/linting/eslint.frontend.json` adds the same option while preserving `varsIgnorePattern` and `argsIgnorePattern`. Severity remains `error`; the rule remains enabled. | Resolved: both per-rule counts exactly match the captured v5 baseline. This restores old default semantics without disabling the check or changing source. |
| Electron existing-rule findings remain above baseline after restoring the old caught-error default. | Baseline 237 → final 254 (+17). `no-unused-vars` 25→25; `no-unnecessary-type-assertion` 3→18 (+15); `await-thenable` 3→6 (+3); `no-shadow` 32→31 (−1); `restrict-plus-operands` 20→20. Baseline/current unnamed parser diagnostics are 9/9. | No existing rule disabled; v5 `restrict-plus-operands` and `no-unused-vars` semantics are explicit in `config/linting/eslint.electron.json`. | **BLOCKER:** the `no-unnecessary-type-assertion` and `await-thenable` increases remain under existing checks. Source fixes are prohibited by this plan's scope; dropping those rules would violate the preservation requirement. |
| Frontend ESLint v8 rejected the existing JavaScript module `simplex-noise.js` as outside its type-aware TS project. | Initial 685 problems including 1 unnamed parser error → final 671 problems and 0 parser errors; baseline is 630. | `src/frontend/tsconfig.json`: `allowJs: true` includes the already-linted JS file; `noEmit: true` keeps the check-only project from emitting over an input file. | The parser error is resolved with no source edit or coverage drop. The remaining +41 is a blocker, not hidden. |
| Frontend existing-rule findings remain above baseline after restoring the old caught-error default. | Baseline 630 → final 671 (+41): `no-unused-vars` 4→4; `no-unnecessary-type-assertion` 26→73 (+47); `await-thenable` 0→1 (+1); `consistent-type-imports` 7→0 (−7). | No existing rule disabled. The frontend `no-unused-vars` config retains its existing ignore patterns and adds only v5's `caughtErrors: "none"`; v8-only rules absent from the baseline remain documented in `config/linting/eslint.frontend.json`. | **BLOCKER:** the `no-unnecessary-type-assertion` and `await-thenable` increases remain under existing checks. Source findings cannot be edited under the authorized scope; weakening these rules is not acceptable. |
| Enabling `allowJs` initially made svelte-check warn that it would overwrite `simplex-noise.js` (TS5055). | First allow-JS probe: 2175 FILES / 144 ERRORS / 292 WARNINGS; after check-only `noEmit`: 2174 / 144 / 291. | `src/frontend/tsconfig.json`: set `noEmit: true`; the final checker output has no TS5055 warning. | Resolved; the final `FILES` count remains in the thousands and `TS7006`/`TS7031` remain 0. |
| The `FILES` count decreased while the check remained pinned to the same project scope. | Baseline 2244 → final 2174 (−70); `include: ["."]` and the existing excludes are unchanged. | No scope glob was narrowed. The 464 frontend Svelte files remain in the project; the 83 server Svelte files remain outside this pre-existing frontend-only checker scope. | Classified as changed resolved-program/dependency population under TypeScript 5.9 and `@tsconfig/svelte` 5; the large non-zero count and unchanged source include/exclude guard against a no-project false pass. The baseline did not retain a per-file program manifest, so the 70 dependency-file delta cannot be enumerated file-by-file. |
| Svelte-check warning output increased, including new Svelte 5 self-closing-tag diagnostics. | Baseline 47 → final 291 (+244): 157 `element_invalid_self_closing_tag`, 129 `a11y_*`, and 5 other diagnostics. The production build emits 161 self-closing-tag warnings (154 frontend diagnostics across 78 files; 7 server diagnostics across 6 files; 84 unique source files total). | No warning was suppressed and no component was edited. `PARITY.md` records the actual rerun count (161), correcting the 01-03 estimate of 165. | **BLOCKER:** these new warnings remain visible. Mass-fixing `.svelte` files is outside scope; suppressing them is explicitly disallowed by the user. |
| Svelte lint compiler-warning output differs by tool version/configuration. | Baseline lint:svelte: 464 files / 167 errors / 39 compiler warnings / 206 problems. Final: 464 / 185 / 0 / 185. `svelte-check` still carries 129 current a11y warnings (baseline checker had 39 a11y + 8 CSS warnings). | `svelte/valid-compile` is enabled at error severity; effective config is `[2, {"ignoreWarnings":true}]`. A no-write stdin positive control with `ignoreWarnings:false` produced three rule findings. | No check is inert or removed: `lint:svelte` reports 185 real findings over 464 files, the rule's reporting path is proven, and compiler warnings remain observable via `svelte-check`. This row is below the baseline problem total. |
| Vitest result parity. | 179 passed / 2 failed / 0 skipped both before and after; 181 total tests and 60 suites. | No test/source changes. Current Vitest JSON omits `numSkippedTests`; its `numPendingTests` is 0 and assertion statuses are exactly 179 passed + 2 failed. | Pass; the same two `syncManager.test.ts` baseline failures remain. |
| Prettier and stylelint parity. | Prettier: 40 unformatted files and the identical 40-file set (20 `.svelte`); current candidates 1040 vs baseline 1039 due the new build assertion script. Stylelint: 464 files / 216 errors both runs. | No formatter write; no source/CSS changes. | Pass. The added candidate is formatted and does not change the baseline set. |
| Check inventory and CI blocking posture. | Eight required script names present; four lint members present; `continue-on-error: true` is 2 before and after. | No CI/script deletion or non-blocking change. | Pass; `lint:svelte` remains in the chain and its script has no `--fix`. |

### Blocking outcome

The planned parity gate is **not met**. After restoring the v5 `no-unused-vars` caught-error default, Electron and frontend totals exceed their recorded baselines by 17 and 41 problems. The explicit remaining lint blockers are Electron `no-unnecessary-type-assertion` (+15) and `await-thenable` (+3), and frontend `no-unnecessary-type-assertion` (+47) and `await-thenable` (+1). Resolving them would require either modifying out-of-scope application source or disabling existing rules; the latter is explicitly prohibited. In addition, the build exposes 161 Svelte 5 `element_invalid_self_closing_tag` warnings (and svelte-check has 291 warnings versus 47 at baseline). These are intentionally not suppressed or rewritten because the user prohibited other `.svelte` edits and asked that warnings be investigated rather than hidden. The findings are classified, but remain unresolved; this plan must be reported **BLOCKED**, not complete.

The build/output checks below are from the final Task 3 verification. The subsequent caught-error-default correction changed only the two lint configs, so the two non-mutating lint jobs were rerun separately and their final results are recorded above; build and pixel checks were not repeated for this lint-only adjustment.

```text
npx eslint -c config/linting/eslint.electron.json --ext .js,.ts src/electron --format json: 149 files / 254 problems; no-unused-vars 25, no-unnecessary-type-assertion 18, await-thenable 6
npx eslint -c config/linting/eslint.frontend.json --ext .js,.ts src/frontend --format json: 255 files / 671 problems; no-unused-vars 4, no-unnecessary-type-assertion 73, await-thenable 1
npm run build: exit 0; bundle.css 257310 bytes; bundle.js 3930171 bytes; one CSS asset; four server styles.css files non-empty; assertBuildOutput passed; 161 self-closing warnings; EMPTY_IMPORT_META = 0
npx playwright test --config config/testing/playwright.config.ts output-render: 2 passed (29.0s), maxDiffPixels = 0
node scripts/cleanBuilds.js: exit 0; dev HTML literal restored; git status --porcelain public/index.html: empty
```

## Addendum — authorized remediation evidence and revised baseline inventory

This addendum supplements, and does not overwrite, the original blocked 01-04 measurements above. The original 46-path list is historical evidence only, not revised source-scope acceptance. The new application-source audit compares Plan 01-04 additions and remediation batches with the exact plan-start/01-03 tip `88902f7b6b68de6885aa031a9b12873643d6f956`. The pre-upgrade revision `136d77575ec1f853c66eba3a1f44be7401e9234c` remains the check-count baseline, not the source-hunk diff base.

### Reproduced target ESLint diagnostics

The isolated baseline reproduction ran `npm ci --ignore-scripts --omit=optional` successfully at revision `136d77575ec1f853c66eba3a1f44be7401e9234c`. Baseline versions: ESLint `8.57.1`, `@typescript-eslint/eslint-plugin` / parser `5.62.0`, TypeScript `4.9.5`, Svelte `3.59.2`, Vite `4.5.14`. Current pre-remediation versions: ESLint `8.57.1`, `@typescript-eslint/eslint-plugin` / parser `8.71.2`, TypeScript `5.9.3`, Svelte `5.57.2`, Vite `8.0.16`.

Baseline and current detailed JSON use these exact commands, without `--fix`:

```text
npx eslint -c config/linting/eslint.electron.json --ext .js,.ts src/electron --format json
npx eslint -c config/linting/eslint.frontend.json --ext .js,.ts src/frontend --format json
```

The baseline reproduction matches exactly: Electron 149 files / 212 errors / 25 warnings / 237 problems; frontend 255 / 630 / 0 / 630. Current pre-remediation: Electron 149 / 254 errors / 0 warnings / 254 problems; frontend 255 / 671 errors / 0 warnings / 671 problems.

Normalized identity is repository-relative source path + rule id + exact diagnostic source range with whitespace collapsed. Absolute checkout prefixes, line/column shifts, version-specific `message`, and `messageId` are ignored. Identical source ranges use multiset counts so repeated findings are retained. This checked normalization differs from the earlier preliminary comparison: frontend is 23 matched / 3 baseline-only / 51 current-only, not 15 / 11 / 59; Electron is 4 / 2 / 20. The rule-level deltas remain `50−3=47` frontend assertions, `17−2=15` Electron assertions, plus 1 frontend and 3 Electron `await-thenable` findings.

| Scope | Rule | Baseline | Current pre-remediation | Matched | Baseline-only | Current-only |
|---|---|---:|---:|---:|---:|---:|
| Electron | `no-unnecessary-type-assertion` | 3 | 18 | 1 | 2 | 17 |
| Electron | `await-thenable` | 3 | 6 | 3 | 0 | 3 |
| Frontend | `no-unnecessary-type-assertion` | 26 | 73 | 23 | 3 | 50 |
| Frontend | `await-thenable` | 0 | 1 | 0 | 0 | 1 |
| **Total** | | **32** | **98** | **27** | **5** | **71** |

The following table is the durable per-file inventory from the detailed baseline/current JSON. Locations are line:column; em dashes mean there was no finding for that scope/rule. The last column is matched / baseline-only / current-only after normalized range comparison.

| File | Rule | Baseline locations | Current pre-remediation locations | Matched / baseline-only / current-only |
|---|---|---|---|---|
| `src/electron/cloud/drive.ts` | `await-thenable` | — | 209:9 | 0 / 0 / 1 |
| `src/electron/contentProviders/canva/CanvaContentLibrary.ts` | `no-unnecessary-type-assertion` | — | 337:28, 406:24 | 0 / 0 / 2 |
| `src/electron/contentProviders/ContentProviderRegistry.ts` | `no-unnecessary-type-assertion` | — | 83:51, 104:33, 157:40 | 0 / 0 / 3 |
| `src/electron/contentProviders/onStage/connect.ts` | `no-unnecessary-type-assertion` | — | 310:35 | 0 / 0 / 1 |
| `src/electron/data/backup.ts` | `await-thenable` | 24:13, 30:9, 34:9 | 24:13, 30:9, 34:9 | 3 / 0 / 0 |
| `src/electron/data/import.ts` | `await-thenable` | — | 24:9, 36:9 | 0 / 0 / 2 |
| `src/electron/data/store.ts` | `no-unnecessary-type-assertion` | 215:21 | 215:21, 222:16 | 1 / 0 / 1 |
| `src/electron/data/zip.ts` | `no-unnecessary-type-assertion` | — | 134:26, 274:30 | 0 / 0 / 2 |
| `src/electron/ndi/NdiSender.ts` | `no-unnecessary-type-assertion` | 114:27 | — | 0 / 1 / 0 |
| `src/electron/omt/OmtSender.ts` | `no-unnecessary-type-assertion` | 125:27 | — | 0 / 1 / 0 |
| `src/electron/servers.ts` | `no-unnecessary-type-assertion` | — | 124:9, 125:38, 127:9, 129:9, 129:36, 130:9, 163:9, 165:9 | 0 / 0 / 8 |
| `src/frontend/audio/effects/audioEffectsHelpers.ts` | `no-unnecessary-type-assertion` | 143:45 | 143:45 | 1 / 0 / 0 |
| `src/frontend/components/actions/apiHelper.ts` | `no-unnecessary-type-assertion` | — | 591:12 | 0 / 0 / 1 |
| `src/frontend/components/context/contextMenuSearch.ts` | `no-unnecessary-type-assertion` | — | 25:23 | 0 / 0 / 1 |
| `src/frontend/components/context/loadItems.ts` | `no-unnecessary-type-assertion` | — | 245:40 | 0 / 0 / 1 |
| `src/frontend/components/context/menuClick.ts` | `no-unnecessary-type-assertion` | — | 2469:62 | 0 / 0 / 1 |
| `src/frontend/components/drawer/bible/scripture.ts` | `await-thenable` | — | 160:50 | 0 / 0 / 1 |
| `src/frontend/components/drawer/bible/scripture.ts` | `no-unnecessary-type-assertion` | 1060:33 | 192:71, 1060:33, 1416:102 | 1 / 0 / 2 |
| `src/frontend/components/drawer/calendar/calendars.ts` | `no-unnecessary-type-assertion` | 200:72 | 200:72 | 1 / 0 / 0 |
| `src/frontend/components/drawer/calendar/event.ts` | `no-unnecessary-type-assertion` | 76:43 | 76:43 | 1 / 0 / 0 |
| `src/frontend/components/drawer/pages/interactions.ts` | `no-unnecessary-type-assertion` | 704:31 | 704:31 | 1 / 0 / 0 |
| `src/frontend/components/edit/scripts/chords.ts` | `no-unnecessary-type-assertion` | — | 18:5, 24:5 | 0 / 0 / 2 |
| `src/frontend/components/edit/scripts/itemHelpers.ts` | `no-unnecessary-type-assertion` | — | 198:21 | 0 / 0 / 1 |
| `src/frontend/components/export/projectLink.ts` | `no-unnecessary-type-assertion` | — | 107:12, 132:20 | 0 / 0 / 2 |
| `src/frontend/components/helpers/array.ts` | `no-unnecessary-type-assertion` | 90:45 | 90:45, 90:45 | 1 / 0 / 1 |
| `src/frontend/components/helpers/clipboard.ts` | `no-unnecessary-type-assertion` | — | 1032:17, 1034:22, 1453:90 | 0 / 0 / 3 |
| `src/frontend/components/helpers/dropActions.ts` | `no-unnecessary-type-assertion` | — | 681:70 | 0 / 0 / 1 |
| `src/frontend/components/helpers/history.ts` | `no-unnecessary-type-assertion` | — | 41:47, 322:13, 360:13 | 0 / 0 / 3 |
| `src/frontend/components/helpers/historyHelpers.ts` | `no-unnecessary-type-assertion` | 475:74, 477:23, 478:23 | 475:74, 477:23, 478:23 | 3 / 0 / 0 |
| `src/frontend/components/helpers/output.ts` | `no-unnecessary-type-assertion` | 1519:34, 1676:55, 2091:18 | 1519:34, 1676:55, 2091:18, 2091:18 | 3 / 0 / 1 |
| `src/frontend/components/helpers/showActions.ts` | `no-unnecessary-type-assertion` | 999:32 | 999:32 | 1 / 0 / 0 |
| `src/frontend/components/helpers/shows.ts` | `no-unnecessary-type-assertion` | — | 133:49, 133:63 | 0 / 0 / 2 |
| `src/frontend/components/main/popups/localization/translation.ts` | `no-unnecessary-type-assertion` | — | 80:28 | 0 / 0 / 1 |
| `src/frontend/components/output/preview/SpotifyManager.ts` | `no-unnecessary-type-assertion` | 66:28 | 66:28 | 1 / 0 / 0 |
| `src/frontend/components/quicksearch/quicksearch.ts` | `no-unnecessary-type-assertion` | — | 330:25 | 0 / 0 / 1 |
| `src/frontend/components/quicksearch/searchHighlight.ts` | `no-unnecessary-type-assertion` | 13:60 | 13:60 | 1 / 0 / 0 |
| `src/frontend/components/show/formatTextEditor.ts` | `no-unnecessary-type-assertion` | — | 84:31 | 0 / 0 / 1 |
| `src/frontend/components/slide/views/websiteDomPool.ts` | `no-unnecessary-type-assertion` | — | 196:20, 196:34, 196:57, 199:20, 202:20, 202:41, 226:13, 231:35, 231:100, 231:118 | 0 / 0 / 10 |
| `src/frontend/components/stage/stage.ts` | `no-unnecessary-type-assertion` | — | 47:39 | 0 / 0 / 1 |
| `src/frontend/components/system/textbox.ts` | `no-unnecessary-type-assertion` | 18:23, 39:31, 88:27, 216:23, 311:23 | 18:23, 39:31, 88:27, 216:23, 311:23 | 5 / 0 / 0 |
| `src/frontend/components/timeline/TimelineActions.ts` | `no-unnecessary-type-assertion` | — | 133:17, 156:17, 157:17 | 0 / 0 / 3 |
| `src/frontend/converters/powerpoint/PowerPointHelper.ts` | `no-unnecessary-type-assertion` | — | 295:28, 1416:12 | 0 / 0 / 2 |
| `src/frontend/converters/songbeamer.ts` | `no-unnecessary-type-assertion` | — | 128:12 | 0 / 0 / 1 |
| `src/frontend/IPC/responsesMain.ts` | `no-unnecessary-type-assertion` | 619:57, 620:60, 621:64 | — | 0 / 3 / 0 |
| `src/frontend/show/slides.ts` | `no-unnecessary-type-assertion` | — | 51:13, 91:13, 318:9, 343:40, 347:21, 432:13, 437:40 | 0 / 0 / 7 |
| `src/frontend/utils/cloudSync.ts` | `no-unnecessary-type-assertion` | 353:62 | 353:62 | 1 / 0 / 0 |
| `src/frontend/utils/drive.ts` | `no-unnecessary-type-assertion` | — | 52:32 | 0 / 0 / 1 |
| `src/frontend/utils/obsTalk.ts` | `no-unnecessary-type-assertion` | 51:13, 74:13 | 51:13, 74:13 | 2 / 0 / 0 |

### Fresh pre-remediation production warning inventory

The production build succeeded before remediation and emitted 161 `element_invalid_self_closing_tag` warnings across 84 source files: 154 frontend diagnostics in 78 files and 7 server diagnostics in 6 files. These are fresh pre-edit locations used to assign S1-S7; line/column values are before the authorized edits. The raw log is not permanent evidence, so the complete relative-path/location/tag inventory is recorded here. At this planning revision, the pinned `svelte-check` rerun against this exact pre-remediation state has not yet been captured; plan 01-06 Task 1 is explicitly ordered to capture it before any remediation source edit. Its earlier 157 target-warning count remains history, not a substitute for the fresh inventory.

| File | Pre-edit diagnostic locations and element tags |
|---|---|
| `src/frontend/ai/components/floating/AiTranscription.svelte` | 94:20 `<div>` |
| `src/frontend/components/draw/Draw.svelte` | 27:8 `<div>`; 29:8 `<div>` |
| `src/frontend/components/draw/DrawSettings.svelte` | 129:8 `<div>` |
| `src/frontend/components/draw/Fill.svelte` | 28:0 `<div>` |
| `src/frontend/components/draw/Paint.svelte` | 146:0 `<canvas>` |
| `src/frontend/components/draw/Particles.svelte` | 31:4 `<div>` |
| `src/frontend/components/drawer/Card.svelte` | 37:12 `<div>`; 39:12 `<div>` |
| `src/frontend/components/drawer/audio/Audio.svelte` | 416:8 `<div>`; 449:8 `<div>` |
| `src/frontend/components/drawer/audio/AudioMeter.svelte` | 174:20 `<div>`; 175:20 `<span>`; 176:20 `<div>`; 180:20 `<span>` |
| `src/frontend/components/drawer/audio/effects/AudioCompressor.svelte` | 162:12 `<div>`; 168:4 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioDelay.svelte` | 99:4 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioFilter.svelte` | 152:4 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioLimiter.svelte` | 134:12 `<div>`; 140:4 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioNoiseGate.svelte` | 108:4 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioReverb.svelte` | 101:4 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioStereoShaper.svelte` | 105:4 `<div>` |
| `src/frontend/components/drawer/bible/Scripture.svelte` | 1284:8 `<div>`; 1291:12 `<div>` |
| `src/frontend/components/drawer/calendar/Calendar.svelte` | 239:36 `<span>` |
| `src/frontend/components/drawer/calendar/CalendarsManagement.svelte` | 42:24 `<span>` |
| `src/frontend/components/drawer/live/BMDStream.svelte` | 73:4 `<canvas>`; 77:12 `<canvas>` |
| `src/frontend/components/drawer/live/Capture.svelte` | 89:12 `<canvas>` |
| `src/frontend/components/drawer/live/Mic.svelte` | 105:20 `<div>`; 106:20 `<span>` |
| `src/frontend/components/drawer/live/NDIStream.svelte` | 53:4 `<canvas>`; 58:12 `<canvas>` |
| `src/frontend/components/drawer/live/OMTStream.svelte` | 53:4 `<canvas>`; 57:12 `<canvas>` |
| `src/frontend/components/drawer/media/Media.svelte` | 584:20 `<div>` |
| `src/frontend/components/drawer/pages/Interactions.svelte` | 422:24 `<div>` |
| `src/frontend/components/drawer/pages/InteractionsInfo.svelte` | 54:12 `<div>` |
| `src/frontend/components/drawer/player/Vimeo.svelte` | 178:8 `<iframe>` |
| `src/frontend/components/edit/ItemAddMenu.svelte` | 125:24 `<div>` |
| `src/frontend/components/edit/editbox/Editbox.svelte` | 275:8 `<div>` |
| `src/frontend/components/edit/editbox/EditboxCropping.svelte` | 214:4, 215:4, 216:4, 217:4, 219:4, 220:4, 221:4, 222:4, 224:4, 225:4, 226:4, 227:4 `<div>` |
| `src/frontend/components/edit/editbox/EditboxLines.svelte` | 757:12 `<div>` |
| `src/frontend/components/edit/editors/AudioEditor.svelte` | 47:4 `<div>`; 48:4 `<div>` |
| `src/frontend/components/edit/editors/MediaEditor.svelte` | 71:12 `<div>`; 75:12 `<div>` |
| `src/frontend/components/inputs/MaterialButton.svelte` | 121:8 `<span>` |
| `src/frontend/components/inputs/MaterialCheckbox.svelte` | 37:4 `<div>`; 38:4 `<div>`; 64:4 `<span>` |
| `src/frontend/components/inputs/MaterialColorInput.svelte` | 206:8 `<div>`; 213:8 `<span>` |
| `src/frontend/components/inputs/MaterialDropdown.svelte` | 282:4 `<div>`; 314:4 `<span>` |
| `src/frontend/components/inputs/MaterialFilePicker.svelte` | 59:4 `<div>`; 101:4 `<span>` |
| `src/frontend/components/inputs/MaterialFolderPicker.svelte` | 53:4 `<div>`; 75:4 `<span>` |
| `src/frontend/components/inputs/MaterialNumberInput.svelte` | 155:4 `<div>`; 176:4 `<span>` |
| `src/frontend/components/inputs/MaterialPopupButton.svelte` | 66:4 `<div>`; 111:4 `<span>` |
| `src/frontend/components/inputs/MaterialRadialPicker.svelte` | 154:4 `<div>`; 182:4 `<span>` |
| `src/frontend/components/inputs/MaterialTextInput.svelte` | 80:4 `<div>`; 90:4 `<span>` |
| `src/frontend/components/inputs/MaterialTextarea.svelte` | 36:4 `<div>`; 37:4 `<textarea>`; 39:4 `<span>` |
| `src/frontend/components/inputs/MaterialTimePicker.svelte` | 62:4 `<div>`; 72:4 `<span>` |
| `src/frontend/components/inputs/MaterialToggleSwitch.svelte` | 38:4 `<div>`; 39:4 `<div>`; 57:8 `<div>`; 60:4 `<span>` |
| `src/frontend/components/main/Loader.svelte` | 5:0 `<div>` |
| `src/frontend/components/main/ProgressPanel.svelte` | 87:28 `<div>`; 109:28 `<div>` |
| `src/frontend/components/main/Top.svelte` | 100:12 `<div>`; 155:12 `<div>` |
| `src/frontend/components/main/popups/ChooseMediaInput.svelte` | 71:12 `<div>` |
| `src/frontend/components/main/popups/ManageFonts.svelte` | 164:22 `<div>` |
| `src/frontend/components/media/Video.svelte` | 233:8 `<video>`; 241:8 `<video>` |
| `src/frontend/components/output/layers/BackgroundMedia.svelte` | 55:74 `<div>` |
| `src/frontend/components/output/layers/PdfOutput.svelte` | 80:8 `<canvas>` |
| `src/frontend/components/output/tools/MediaControls.svelte` | 119:16 `<div>`; 123:16 `<div>`; 142:16 `<div>` |
| `src/frontend/components/show/AudioPreview.svelte` | 166:4 `<canvas>` |
| `src/frontend/components/show/ProjectContentList.svelte` | 477:12 `<div>`; 494:12 `<div>` |
| `src/frontend/components/show/Projects.svelte` | 539:20 `<div>`; 545:20 `<div>`; 556:24 `<div>` |
| `src/frontend/components/show/VideoShow.svelte` | 371:20 `<video>`; 382:20 `<video>`; 421:16 `<div>`; 459:16 `<div>` |
| `src/frontend/components/show/pdf/PdfPreview.svelte` | 210:16 `<canvas>` |
| `src/frontend/components/show/tools/HighlightedNotes.svelte` | 65:4 `<textarea>` |
| `src/frontend/components/show/tools/Notes.svelte` | 32:4 `<textarea>` |
| `src/frontend/components/show/tools/SlideGroups.svelte` | 132:12 `<div>` |
| `src/frontend/components/slide/Layouts.svelte` | 158:12 `<div>`; 144:16 `<div>` |
| `src/frontend/components/slide/Reference.svelte` | 90:8, 99:8, 115:8, 126:8, 136:8 `<div>` |
| `src/frontend/components/slide/SkeletonSlide.svelte` | 22:12 `<div>`; 33:8 `<div>`; 38:12 `<div>` |
| `src/frontend/components/slide/Slide.svelte` | 280:8 `<div>`; 289:8 `<div>`; 415:28 `<div>`; 419:20 `<div>`; 425:28 `<div>`; 429:32 `<div>` |
| `src/frontend/components/slide/views/Captions.svelte` | 85:12 `<webview>` |
| `src/frontend/components/slide/views/MediaItem.svelte` | 191:16 `<video>`; 200:16 `<video>` |
| `src/frontend/components/slide/views/Timer.svelte` | 151:4 `<div>`; 153:4 `<div>` |
| `src/frontend/components/slide/views/Visualizer.svelte` | 243:0 `<canvas>` |
| `src/frontend/components/slide/views/Website.svelte` | 87:8 `<div>` |
| `src/frontend/components/stage/SkeletonStageSlide.svelte` | 20:12 `<div>` |
| `src/frontend/components/system/Movebox.svelte` | 97:8 `<div>`; 101:12 `<div>` |
| `src/frontend/components/system/SelectElem.svelte` | 338:16, 342:16, 345:16, 346:16, 349:16 `<span>`; 353:12 `<span>` |
| `src/frontend/components/system/Snaplines.svelte` | 126:4 `<div>` |
| `src/frontend/components/timeline/TimelineEasing.svelte` | 219:24, 222:24, 230:24, 253:24 `<div>` |
| `src/server/common/components/Checkbox.svelte` | 5:4 `<div>` |
| `src/server/common/components/Loader.svelte` | 5:0 `<div>` |
| `src/server/output_stream/App.svelte` | 172:4 `<canvas>` |
| `src/server/remote/components/MaterialButton.svelte` | 112:8 `<span>` |
| `src/server/stage/components/PreviewCanvas.svelte` | 66:4 `<canvas>` |
| `src/server/stage/components/Timer.svelte` | 74:4 `<div>`; 76:4 `<div>` |

### Final gate reminder

The earlier 01-04 production build/pixel test were pre-edit and do not satisfy final acceptance. Plan 01-06 first captures the fresh pinned checker inventory before its S1/S2 edits; plans 01-07 through 01-09 then run in parallel with disjoint ownership, covering the remaining S3-S7 paths and T1-T4 files. Together plans 01-06 through 01-09 divide the 84 warning paths into seven 12-file batches and the 47 target-lint files into batches of 12, 12, 12 and 11. Final plan 01-04 must run the post-edit build and explicit `assertBuildOutput.js`; fresh production and pinned checker warning inventories; all four non-mutating lint jobs; full Vitest JSON/status comparison (60 suites / 181 total / 179 passed / the same two baseline failures / zero skipped, while continuing other checks); Prettier and Stylelint comparisons; focused tests for changed TypeScript; source-hunk authorization against the exact 01-03 tip; and `output-render` with `--retries=0` (actually executed, 2 passed, 0 skipped, `maxDiffPixels: 0`, unchanged snapshot), followed by `cleanBuilds.js` and public HTML cleanliness. Any unsafe/unresolved over-baseline delta or failed gate remains blocking.

## Fresh pinned svelte-check inventory before remediation

Date: 2026-10-18 (UTC; checker completed at 2026-10-18T08:37:38Z)

Source revision: `2ee3eae0e169f138c977221a8f2e25f52d698901`

Source worktree status before checker/remediation (`git status --porcelain -- src`): empty (no tracked or untracked source changes).

Pinned version: `4.7.7` — `package.json` devDependency `svelte-check: 4.7.7`, `package-lock.json` resolved `node_modules/svelte-check` version `4.7.7`, installed `node_modules` version `4.7.7`.

Version command: `npx svelte-check --version` → `svelte-check, 4.7.7` (exit 0).

Checker command: `npx svelte-check --tsconfig config/typescript/tsconfig.svelte.json --output machine`

Exit status: `1` (expected nonzero for known checker errors; the complete output was retained rather than filtered). Raw output: `/private/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/phase1-remediation.5oVIXc/svelte-check-pre-remediation.raw`; separately captured status: `/private/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/phase1-remediation.5oVIXc/svelte-check-pre-remediation.exit`.

Fresh totals: `2174 FILES / 144 ERRORS / 291 WARNINGS / HINTS not reported by svelte-check 4.7.7` (`138 FILES_WITH_PROBLEMS`). Warning composition: 157 `element_invalid_self_closing_tag`; 129 `a11y_*`; 5 other warnings (4 `css_unused_selector`, 1 CSS compatibility warning for `appearance`). The target diagnostics below are frontend-scoped: 157 instances across 81 files. The separate pre-remediation production-build inventory remains authoritative for server Svelte paths and reports 161 target diagnostics overall (154 frontend across 78 files + 7 server across 6 files). These inventories have different compiler scopes/reachability and location columns; their totals are intentionally not merged. The 157 count in the earlier checker run remains historical and is not substituted for this fresh capture (the fresh count happens to also be 157).

Every fresh checker `element_invalid_self_closing_tag` diagnostic (repo-relative file, current line:column, non-void tag):

| Repo-relative file | Fresh checker diagnostic locations and non-void tags |
|---|---|
| `src/frontend/ai/components/floating/AiTranscription.svelte` | 94:21 `<div>` |
| `src/frontend/components/draw/Draw.svelte` | 27:9 `<div>`, 29:9 `<div>` |
| `src/frontend/components/draw/DrawSettings.svelte` | 129:9 `<div>` |
| `src/frontend/components/draw/Fill.svelte` | 28:1 `<div>` |
| `src/frontend/components/draw/Paint.svelte` | 146:1 `<canvas>` |
| `src/frontend/components/draw/Particles.svelte` | 31:5 `<div>` |
| `src/frontend/components/drawer/Card.svelte` | 37:13 `<div>`, 39:13 `<div>` |
| `src/frontend/components/drawer/audio/Audio.svelte` | 416:9 `<div>`, 449:9 `<div>` |
| `src/frontend/components/drawer/audio/AudioMeter.svelte` | 174:21 `<div>`, 175:21 `<span>`, 176:21 `<div>`, 180:21 `<span>` |
| `src/frontend/components/drawer/audio/effects/AudioCompressor.svelte` | 162:13 `<div>`, 168:5 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioDelay.svelte` | 99:5 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioFilter.svelte` | 152:5 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioLimiter.svelte` | 134:13 `<div>`, 140:5 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioNoiseGate.svelte` | 108:5 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioReverb.svelte` | 101:5 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioStereoShaper.svelte` | 105:5 `<div>` |
| `src/frontend/components/drawer/bible/Scripture.svelte` | 1284:9 `<div>`, 1291:13 `<div>` |
| `src/frontend/components/drawer/calendar/Calendar.svelte` | 239:37 `<span>` |
| `src/frontend/components/drawer/calendar/CalendarsManagement.svelte` | 42:25 `<span>` |
| `src/frontend/components/drawer/info/EffectsInfo.svelte` | 4:1 `<div>` |
| `src/frontend/components/drawer/info/OverlayInfo.svelte` | 14:5 `<div>` |
| `src/frontend/components/drawer/live/BMDStream.svelte` | 73:5 `<canvas>`, 77:13 `<canvas>` |
| `src/frontend/components/drawer/live/Capture.svelte` | 89:13 `<canvas>` |
| `src/frontend/components/drawer/live/Mic.svelte` | 105:21 `<div>`, 106:21 `<span>` |
| `src/frontend/components/drawer/live/NDIStream.svelte` | 53:5 `<canvas>`, 58:13 `<canvas>` |
| `src/frontend/components/drawer/live/OMTStream.svelte` | 53:5 `<canvas>`, 57:13 `<canvas>` |
| `src/frontend/components/drawer/media/Media.svelte` | 584:21 `<div>` |
| `src/frontend/components/drawer/pages/Interactions.svelte` | 422:25 `<div>` |
| `src/frontend/components/drawer/pages/InteractionsInfo.svelte` | 54:13 `<div>` |
| `src/frontend/components/drawer/player/Vimeo.svelte` | 178:9 `<iframe>` |
| `src/frontend/components/edit/ItemAddMenu.svelte` | 125:25 `<div>` |
| `src/frontend/components/edit/editbox/Editbox.svelte` | 275:9 `<div>` |
| `src/frontend/components/edit/editbox/EditboxCropping.svelte` | 214:5, 215:5, 216:5, 217:5, 219:5, 220:5, 221:5, 222:5, 224:5, 225:5, 226:5, 227:5 `<div>` |
| `src/frontend/components/edit/editbox/EditboxLines.svelte` | 757:13 `<div>` |
| `src/frontend/components/edit/editors/AudioEditor.svelte` | 47:5 `<div>`, 48:5 `<div>` |
| `src/frontend/components/edit/editors/MediaEditor.svelte` | 71:13 `<div>`, 75:13 `<div>` |
| `src/frontend/components/inputs/MaterialButton.svelte` | 121:9 `<span>` |
| `src/frontend/components/inputs/MaterialCheckbox.svelte` | 37:5 `<div>`, 38:5 `<div>`, 64:5 `<span>` |
| `src/frontend/components/inputs/MaterialColorInput.svelte` | 206:9 `<div>`, 213:9 `<span>` |
| `src/frontend/components/inputs/MaterialDropdown.svelte` | 282:5 `<div>`, 314:5 `<span>` |
| `src/frontend/components/inputs/MaterialFilePicker.svelte` | 59:5 `<div>`, 101:5 `<span>` |
| `src/frontend/components/inputs/MaterialFolderPicker.svelte` | 53:5 `<div>`, 75:5 `<span>` |
| `src/frontend/components/inputs/MaterialNumberInput.svelte` | 155:5 `<div>`, 176:5 `<span>` |
| `src/frontend/components/inputs/MaterialPopupButton.svelte` | 66:5 `<div>`, 111:5 `<span>` |
| `src/frontend/components/inputs/MaterialRadialPicker.svelte` | 154:5 `<div>`, 182:5 `<span>` |
| `src/frontend/components/inputs/MaterialTextInput.svelte` | 80:5 `<div>`, 90:5 `<span>` |
| `src/frontend/components/inputs/MaterialTextarea.svelte` | 36:5 `<div>`, 37:5 `<textarea>`, 39:5 `<span>` |
| `src/frontend/components/inputs/MaterialTimePicker.svelte` | 62:5 `<div>`, 72:5 `<span>` |
| `src/frontend/components/inputs/MaterialToggleSwitch.svelte` | 38:5 `<div>`, 39:5 `<div>`, 57:9 `<div>`, 60:5 `<span>` |
| `src/frontend/components/main/Loader.svelte` | 5:1 `<div>` |
| `src/frontend/components/main/ProgressPanel.svelte` | 87:29 `<div>`, 109:29 `<div>` |
| `src/frontend/components/main/Top.svelte` | 100:13 `<div>`, 155:13 `<div>` |
| `src/frontend/components/main/popups/ChooseMediaInput.svelte` | 71:13 `<div>` |
| `src/frontend/components/main/popups/ManageFonts.svelte` | 164:23 `<div>` |
| `src/frontend/components/media/Video.svelte` | 233:9 `<video>`, 241:9 `<video>` |
| `src/frontend/components/output/layers/BackgroundMedia.svelte` | 55:75 `<div>` |
| `src/frontend/components/output/layers/PdfOutput.svelte` | 80:9 `<canvas>` |
| `src/frontend/components/output/preview/PreviewCanvas.svelte` | 85:5 `<canvas>` |
| `src/frontend/components/output/tools/MediaControls.svelte` | 119:17 `<div>`, 123:17 `<div>`, 142:17 `<div>` |
| `src/frontend/components/show/AudioPreview.svelte` | 166:5 `<canvas>` |
| `src/frontend/components/show/ProjectContentList.svelte` | 477:13 `<div>`, 494:13 `<div>` |
| `src/frontend/components/show/Projects.svelte` | 539:21 `<div>`, 545:21 `<div>`, 556:25 `<div>` |
| `src/frontend/components/show/VideoShow.svelte` | 371:21 `<video>`, 382:21 `<video>`, 421:17 `<div>`, 459:17 `<div>` |
| `src/frontend/components/show/pdf/PdfPreview.svelte` | 210:17 `<canvas>` |
| `src/frontend/components/show/tools/HighlightedNotes.svelte` | 65:5 `<textarea>` |
| `src/frontend/components/show/tools/Notes.svelte` | 32:5 `<textarea>` |
| `src/frontend/components/show/tools/SlideGroups.svelte` | 132:13 `<div>` |
| `src/frontend/components/slide/Layouts.svelte` | 158:13 `<div>`, 144:17 `<div>` |
| `src/frontend/components/slide/Reference.svelte` | 90:9 `<div>`, 99:9 `<div>`, 115:9 `<div>`, 126:9 `<div>`, 136:9 `<div>` |
| `src/frontend/components/slide/SkeletonSlide.svelte` | 22:13 `<div>`, 33:9 `<div>`, 38:13 `<div>` |
| `src/frontend/components/slide/Slide.svelte` | 280:9 `<div>`, 289:9 `<div>`, 415:29 `<div>`, 419:21 `<div>`, 425:29 `<div>`, 429:33 `<div>` |
| `src/frontend/components/slide/views/Captions.svelte` | 85:13 `<webview>` |
| `src/frontend/components/slide/views/MediaItem.svelte` | 191:17 `<video>`, 200:17 `<video>` |
| `src/frontend/components/slide/views/Timer.svelte` | 151:5 `<div>`, 153:5 `<div>` |
| `src/frontend/components/slide/views/Visualizer.svelte` | 243:1 `<canvas>` |
| `src/frontend/components/slide/views/Website.svelte` | 87:9 `<div>` |
| `src/frontend/components/stage/SkeletonStageSlide.svelte` | 20:13 `<div>` |
| `src/frontend/components/system/Movebox.svelte` | 97:9 `<div>`, 101:13 `<div>` |
| `src/frontend/components/system/SelectElem.svelte` | 338:17 `<span>`, 342:17 `<span>`, 345:17 `<span>`, 346:17 `<span>`, 349:17 `<span>`, 353:13 `<span>` |
| `src/frontend/components/system/Snaplines.svelte` | 126:5 `<div>` |
| `src/frontend/components/timeline/TimelineEasing.svelte` | 219:25 `<div>`, 222:25 `<div>`, 230:25 `<div>`, 253:25 `<div>` |

## Post-remediation final verification

This addendum records the final-gate rerun after 01-06/07/08/09. It preserves the original blocked measurements and inventories above. All raw command output and independent status files are retained outside the repository under `/private/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/phase1-01-04-final/`; no source, build/lint configuration, test, baseline, or snapshot was changed for this gate.

### Task 1 — fresh production build and pinned checker

| Command | Exit | Evidence |
|---|---:|---|
| `npm run build` | 0 | Complete stdout/stderr: `phase1-01-04-final/build.raw`; independent status: `build.exit` (`0`). This is a fresh build after all remediation batches. |
| `node scripts/assertBuildOutput.js` | 0 | Explicit separate invocation after build; complete output: `assert-build-output.raw`; independent status: `assert-build-output.exit` (`0`). Output: `Build output assertion passed: bundle.css (257310 bytes, 3 component selectors), bundle.js, production HTML literal, electron build`. |
| `npx svelte-check --tsconfig config/typescript/tsconfig.svelte.json --output machine` | 1 | Complete machine output: `svelte-check.raw`; independent status: `svelte-check.exit` (`1`, known nonzero for checker errors). Summary: `COMPLETED 2174 FILES 144 ERRORS 137 WARNINGS 85 FILES_WITH_PROBLEMS`; project resolution is credible (`FILES >= 1000`) and errors are below the baseline 338. |

Fresh production outputs: `public/build/bundle.js` 3,930,171 bytes; `public/build/bundle.css` 257,310 bytes; `build/electron/index.js` exists and is non-empty; the production HTML literal is present in `public/index.html` at this stage. The production log has **zero** `element_invalid_self_closing_tag` diagnostics (zero target-code records in the complete captured log). Its four Svelte plugin warnings are unrelated `css_unused_selector` diagnostics at `Popup.svelte:203:4`, `FloatingInputs.svelte:71:4`, `FloatingInputs.svelte:74:4`, and `Tabs.svelte:150:4`; no target self-closing warning or `a11y_` warning was emitted. The production log's warning-code outcome is therefore target `0`, CSS-unused-selector `4`.

Fresh pinned-checker warning composition (137 total, extracted from all machine `WARNING` records): `a11y_autofocus` 9; `a11y_click_events_have_key_events` 16; `a11y_role_has_required_aria_props` 2; `a11y_consider_explicit_label` 4; `a11y_label_has_associated_control` 5; `a11y_no_noninteractive_element_interactions` 3; `a11y_no_static_element_interactions` 84; `a11y_no_noninteractive_tabindex` 4; `a11y_missing_attribute` 2 (129 a11y total); `css_unused_selector` 4; one compatibility warning for standard `appearance`; and `element_invalid_self_closing_tag` 3. The exact remaining checker target locations and tags are:

| Repo-relative path | Fresh line:column | Tag |
|---|---:|---|
| `src/frontend/components/drawer/info/EffectsInfo.svelte` | 4:1 | `<div>` |
| `src/frontend/components/drawer/info/OverlayInfo.svelte` | 14:5 | `<div>` |
| `src/frontend/components/output/preview/PreviewCanvas.svelte` | 85:5 | `<canvas>` |

The first two paths match the previously noted checker-only area. The fresh output additionally reports `output/preview/PreviewCanvas.svelte:85:5`; it is unchanged from the exact source comparison revision and is recorded as an additional checker-only target finding rather than silently omitted. No `OverlayInfo.svelte:54` target finding appears in this fresh run. These three current checker diagnostics violate the zero-target checker requirement and block Task 1 acceptance; no source or warning-policy change is authorized here. The existing `svelte/valid-compile` `ignoreWarnings: true` a11y policy remains unchanged, and no new suppression was added.

### Task 2 — non-mutating lint, tests, formatting, and focused test review

Each command below ran independently, with complete stdout/stderr and exit status stored separately under `phase1-01-04-final/`. No autofix, snapshot update, baseline edit, `npm run lint`, or formatter write was invoked.

| Job / exact command | Files | Errors / warnings / problems (baseline → current) | Exit | Raw output and independent status |
|---|---:|---|---:|---|
| Electron: `npx eslint -c config/linting/eslint.electron.json --ext .js,.ts src/electron --format json` | 149 / 149 | 212/25/237 → 237/0/237 | 1 | `lint-electron.stdout`, `lint-electron.stderr`, `lint-electron.exit` |
| Frontend: `npx eslint -c config/linting/eslint.frontend.json --ext .js,.ts src/frontend --format json` | 255 / 255 | 630/0/630 → 621/0/621 | 1 | `lint-frontend.stdout`, `lint-frontend.stderr`, `lint-frontend.exit` |
| Svelte: `ESLINT_USE_FLAT_CONFIG=true npx eslint -c config/linting/eslint.svelte.flat.mjs src/frontend --format json` | 464 / 464 | 167/39/206 → 185/0/185 | 1 | `lint-svelte.stdout`, `lint-svelte.stderr`, `lint-svelte.exit` |
| Styles: `npx stylelint 'src/frontend/**/*.{css,scss,svelte}' --config config/linting/.stylelintrc.json --formatter json` | 464 / 464 | 216/0/216 → 216/0/216 | 2 | JSON is in `lint-styles.stderr` (`lint-styles.stdout` is empty); status `lint-styles.exit` |

All four jobs retain nonzero file coverage. Per-job **problem totals** are at or below baseline. Target-rule comparison, read from the complete JSON (not aggregate totals): Electron `no-unnecessary-type-assertion` 1 vs 3 (within baseline), `await-thenable` 6 vs 3 (**over by 3**); frontend `no-unnecessary-type-assertion` 23 vs 26 (within baseline), `await-thenable` 1 vs 0 (**over by 1**). The six Electron await findings are the three unchanged baseline matches in `src/electron/data/backup.ts:24:13, 30:9, 34:9` plus current-only `src/electron/cloud/drive.ts:209:9` and `src/electron/data/import.ts:24:9, 36:9`; the frontend current-only finding is `src/frontend/components/drawer/bible/scripture.ts:160:50`. These four current-only async cases remain the exact unresolved parity blockers; no await or loop was changed. The unchanged Svelte flat config still enables `svelte/valid-compile` with `ignoreWarnings: true`; its source/file coverage remains 464, and the per-job total 185 is below its 206-problem baseline. Stylelint remains exactly 216 `csstools/use-logical` findings.

#### Vitest baseline comparison

Command: `npx vitest run --config config/testing/vitest.config.ts --reporter=json`; complete JSON/stdout `vitest.stdout`, stderr `vitest.stderr`, independent exit `vitest.exit` (`1`). Result: 60 suites; 181 total tests; 179 passed; 2 failed; 0 pending/todo; **0 skipped**. Vitest 4 omits `numSkippedTests`, so skipped count was derived by tallying every assertion status in all 12 `testResults`: exactly 179 `passed` + 2 `failed`, with no skipped/pending/todo/disabled status (and `numPendingTests=0`). The only failures are the exact baseline failures in `src/electron/cloud/syncManager.test.ts`: `Scenario 1: if not found locally, and marked as 'deleted' in cloud: skip` (`expected true to be false`) and `should fall back to file mtime when neither device has ever tracked a real edit time (backward compatibility)` (`expected 1 to be 2`). This exactly matches `baseline/vitest.json`; nonzero exit is expected and did not stop later checks.

#### Prettier path-set comparison

Command: `npx prettier --config config/formatting/.prettierrc.yaml --check src scripts`; exit `1`. Complete stdout/stderr and independent status are `prettier.stdout`, `prettier.stderr`, and `prettier.exit`. The baseline has 40 unformatted paths; the current run has 120: **80 new paths, zero resolved, and no formatter writes**. The exact new path set is:

```text
src/frontend/ai/components/floating/AiTranscription.svelte
src/frontend/components/draw/Draw.svelte
src/frontend/components/draw/DrawSettings.svelte
src/frontend/components/draw/Fill.svelte
src/frontend/components/draw/Paint.svelte
src/frontend/components/draw/Particles.svelte
src/frontend/components/drawer/Card.svelte
src/frontend/components/drawer/audio/Audio.svelte
src/frontend/components/drawer/audio/AudioMeter.svelte
src/frontend/components/drawer/audio/effects/AudioCompressor.svelte
src/frontend/components/drawer/audio/effects/AudioDelay.svelte
src/frontend/components/drawer/audio/effects/AudioFilter.svelte
src/frontend/components/drawer/audio/effects/AudioLimiter.svelte
src/frontend/components/drawer/audio/effects/AudioNoiseGate.svelte
src/frontend/components/drawer/audio/effects/AudioReverb.svelte
src/frontend/components/drawer/audio/effects/AudioStereoShaper.svelte
src/frontend/components/drawer/bible/Scripture.svelte
src/frontend/components/drawer/calendar/Calendar.svelte
src/frontend/components/drawer/calendar/CalendarsManagement.svelte
src/frontend/components/drawer/live/BMDStream.svelte
src/frontend/components/drawer/live/Capture.svelte
src/frontend/components/drawer/live/Mic.svelte
src/frontend/components/drawer/live/NDIStream.svelte
src/frontend/components/drawer/live/OMTStream.svelte
src/frontend/components/drawer/media/Media.svelte
src/frontend/components/drawer/pages/Interactions.svelte
src/frontend/components/drawer/pages/InteractionsInfo.svelte
src/frontend/components/edit/ItemAddMenu.svelte
src/frontend/components/edit/editbox/EditboxCropping.svelte
src/frontend/components/edit/editors/AudioEditor.svelte
src/frontend/components/edit/editors/MediaEditor.svelte
src/frontend/components/edit/scripts/chords.ts
src/frontend/components/inputs/MaterialButton.svelte
src/frontend/components/inputs/MaterialCheckbox.svelte
src/frontend/components/inputs/MaterialColorInput.svelte
src/frontend/components/inputs/MaterialDropdown.svelte
src/frontend/components/inputs/MaterialFilePicker.svelte
src/frontend/components/inputs/MaterialFolderPicker.svelte
src/frontend/components/inputs/MaterialNumberInput.svelte
src/frontend/components/inputs/MaterialPopupButton.svelte
src/frontend/components/inputs/MaterialRadialPicker.svelte
src/frontend/components/inputs/MaterialTextInput.svelte
src/frontend/components/inputs/MaterialTextarea.svelte
src/frontend/components/inputs/MaterialTimePicker.svelte
src/frontend/components/inputs/MaterialToggleSwitch.svelte
src/frontend/components/main/Loader.svelte
src/frontend/components/main/ProgressPanel.svelte
src/frontend/components/main/Top.svelte
src/frontend/components/main/popups/ChooseMediaInput.svelte
src/frontend/components/main/popups/ManageFonts.svelte
src/frontend/components/media/Video.svelte
src/frontend/components/output/layers/BackgroundMedia.svelte
src/frontend/components/output/layers/PdfOutput.svelte
src/frontend/components/output/tools/MediaControls.svelte
src/frontend/components/show/AudioPreview.svelte
src/frontend/components/show/ProjectContentList.svelte
src/frontend/components/show/Projects.svelte
src/frontend/components/show/VideoShow.svelte
src/frontend/components/show/pdf/PdfPreview.svelte
src/frontend/components/show/tools/HighlightedNotes.svelte
src/frontend/components/show/tools/Notes.svelte
src/frontend/components/show/tools/SlideGroups.svelte
src/frontend/components/slide/Layouts.svelte
src/frontend/components/slide/Reference.svelte
src/frontend/components/slide/SkeletonSlide.svelte
src/frontend/components/slide/Slide.svelte
src/frontend/components/slide/views/Captions.svelte
src/frontend/components/slide/views/MediaItem.svelte
src/frontend/components/slide/views/Timer.svelte
src/frontend/components/slide/views/Visualizer.svelte
src/frontend/components/stage/SkeletonStageSlide.svelte
src/frontend/components/system/Movebox.svelte
src/frontend/components/system/SelectElem.svelte
src/frontend/components/timeline/TimelineEasing.svelte
src/server/common/components/Checkbox.svelte
src/server/common/components/Loader.svelte
src/server/output_stream/App.svelte
src/server/remote/components/MaterialButton.svelte
src/server/stage/components/PreviewCanvas.svelte
src/server/stage/components/Timer.svelte
```

This is a baseline-gate failure. These exact remediation-path formatting deltas are recorded, not auto-formatted, because this final gate authorizes no source write.

#### Focused tests and changed TypeScript files

The exact 01-03-tip-to-current audit identifies 30 changed `.ts` files. Repository-wide search of `src/**/*.test.ts` / `*.integration.test.ts` found focused tests for three changed modules: `src/electron/data/zip.ts` → `src/electron/data/zip.test.ts` (run: `npx vitest run --config config/testing/vitest.config.ts src/electron/data/zip.test.ts`, exit 0, 5/5 passed); `src/electron/data/store.ts` → `src/electron/cloud/syncManager.test.ts` (run: `npx vitest run --config config/testing/vitest.config.ts src/electron/cloud/syncManager.test.ts`, exit 1, 28 passed / same 2 baseline failures); and `src/frontend/components/helpers/array.ts` → nearest `src/frontend/utils/search.test.ts` (run: `npx vitest run --config config/testing/vitest.config.ts src/frontend/utils/search.test.ts`, exit 0, 39/39 passed; this test mocks the helper module rather than directly exercising its assertion site). Independent raw stdout/stderr and statuses are `focused-zip.*`, `focused-syncManager.*`, and `focused-search.*` in the evidence directory.

Explicit absence evidence: no focused test/importing test was found for the remaining 27 changed TypeScript files: `src/electron/contentProviders/ContentProviderRegistry.ts`, `src/electron/contentProviders/canva/CanvaContentLibrary.ts`, `src/electron/contentProviders/onStage/connect.ts`, `src/electron/servers.ts`, `src/frontend/components/actions/apiHelper.ts`, `src/frontend/components/context/contextMenuSearch.ts`, `src/frontend/components/context/loadItems.ts`, `src/frontend/components/context/menuClick.ts`, `src/frontend/components/drawer/bible/scripture.ts`, `src/frontend/components/edit/scripts/chords.ts`, `src/frontend/components/edit/scripts/itemHelpers.ts`, `src/frontend/components/export/projectLink.ts`, `src/frontend/components/helpers/clipboard.ts`, `src/frontend/components/helpers/dropActions.ts`, `src/frontend/components/helpers/history.ts`, `src/frontend/components/helpers/output.ts`, `src/frontend/components/helpers/shows.ts`, `src/frontend/components/main/popups/localization/translation.ts`, `src/frontend/components/quicksearch/quicksearch.ts`, `src/frontend/components/show/formatTextEditor.ts`, `src/frontend/components/slide/views/websiteDomPool.ts`, `src/frontend/components/stage/stage.ts`, `src/frontend/components/timeline/TimelineActions.ts`, `src/frontend/converters/powerpoint/PowerPointHelper.ts`, `src/frontend/converters/songbeamer.ts`, `src/frontend/show/slides.ts`, and `src/frontend/utils/drive.ts`. Full Vitest remains the available suite-level evidence for these files; no test was created or changed.

### Task 3 — source-hunk authorization and Darwin output-render gate

#### Exact source-hunk audit

Comparison revision: `88902f7b6b68de6885aa031a9b12873643d6f956` (the exact 01-03/01-04 plan-start tip). The audited input was `git diff --unified=0 88902f7b6b68de6885aa031a9b12873643d6f956..HEAD`; its complete captured diff is `phase1-01-04-final/source-diff-unified0.raw` outside the repository. This replaces the historical 46-path assertion above; no path-count-only acceptance was used.

The read-only audit parsed the old/new source lines and compared each production diagnostic coordinate against the source at the comparison revision. Results: **161** production-inventoried compiler sites across **84** Svelte paths and **161** exact tag-close source changes across those same 84 paths; Git groups these into 142 unified-diff hunk ranges. Every old diagnostic coordinate/tag matched the original source, and each changed line is exactly the single-token transformation `/>` → `></tag>`; there were zero extra/missing paths, tags, sites, or other Svelte text changes. The table maps every pre-fix production diagnostic to its physical changed hunk line. The five multi-line opening-tag cases whose changed `/>` line differs from the diagnostic line are separately mapped in the 01-07/01-09 summaries and shown explicitly below.

| Application-source file | Pre-fix production diagnostic(s) | Exact changed hunk line(s) and tag |
|---|---|---|
| `src/frontend/ai/components/floating/AiTranscription.svelte` | 94:20 `<div>` | 94 `<div>` |
| `src/frontend/components/draw/Draw.svelte` | 27:8 `<div>`, 29:8 `<div>` | 27 `<div>`, 29 `<div>` |
| `src/frontend/components/draw/DrawSettings.svelte` | 129:8 `<div>` | 129 `<div>` |
| `src/frontend/components/draw/Fill.svelte` | 28:0 `<div>` | 28 `<div>` |
| `src/frontend/components/draw/Paint.svelte` | 146:0 `<canvas>` | 146 `<canvas>` |
| `src/frontend/components/draw/Particles.svelte` | 31:4 `<div>` | 31 `<div>` |
| `src/frontend/components/drawer/Card.svelte` | 37:12 `<div>`, 39:12 `<div>` | 37 `<div>`, 39 `<div>` |
| `src/frontend/components/drawer/audio/Audio.svelte` | 416:8 `<div>`, 449:8 `<div>` | 416 `<div>`, 449 `<div>` |
| `src/frontend/components/drawer/audio/AudioMeter.svelte` | 174:20 `<div>`, 175:20 `<span>`, 176:20 `<div>`, 180:20 `<span>` | 174 `<div>`, 175 `<span>`, 176 `<div>`, 180 `<span>` |
| `src/frontend/components/drawer/audio/effects/AudioCompressor.svelte` | 162:12 `<div>`, 168:4 `<div>` | 162 `<div>`, 168 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioDelay.svelte` | 99:4 `<div>` | 99 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioFilter.svelte` | 152:4 `<div>` | 152 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioLimiter.svelte` | 134:12 `<div>`, 140:4 `<div>` | 134 `<div>`, 140 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioNoiseGate.svelte` | 108:4 `<div>` | 108 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioReverb.svelte` | 101:4 `<div>` | 101 `<div>` |
| `src/frontend/components/drawer/audio/effects/AudioStereoShaper.svelte` | 105:4 `<div>` | 105 `<div>` |
| `src/frontend/components/drawer/bible/Scripture.svelte` | 1284:8 `<div>`, 1291:12 `<div>` | 1284 `<div>`, 1291 `<div>` |
| `src/frontend/components/drawer/calendar/Calendar.svelte` | 239:36 `<span>` | 239 `<span>` |
| `src/frontend/components/drawer/calendar/CalendarsManagement.svelte` | 42:24 `<span>` | 42 `<span>` |
| `src/frontend/components/drawer/live/BMDStream.svelte` | 73:4 `<canvas>`, 77:12 `<canvas>` | 73 `<canvas>`, 77 `<canvas>` |
| `src/frontend/components/drawer/live/Capture.svelte` | 89:12 `<canvas>` | 89 `<canvas>` |
| `src/frontend/components/drawer/live/Mic.svelte` | 105:20 `<div>`, 106:20 `<span>` | 105 `<div>`, 106 `<span>` |
| `src/frontend/components/drawer/live/NDIStream.svelte` | 53:4 `<canvas>`, 58:12 `<canvas>` | 53 `<canvas>`, 58 `<canvas>` |
| `src/frontend/components/drawer/live/OMTStream.svelte` | 53:4 `<canvas>`, 57:12 `<canvas>` | 53 `<canvas>`, 57 `<canvas>` |
| `src/frontend/components/drawer/media/Media.svelte` | 584:20 `<div>` | 584 `<div>` |
| `src/frontend/components/drawer/pages/Interactions.svelte` | 422:24 `<div>` | 422 `<div>` |
| `src/frontend/components/drawer/pages/InteractionsInfo.svelte` | 54:12 `<div>` | 54 `<div>` |
| `src/frontend/components/drawer/player/Vimeo.svelte` | 178:8 `<iframe>` | 178 `<iframe>` |
| `src/frontend/components/edit/ItemAddMenu.svelte` | 125:24 `<div>` | 125 `<div>` |
| `src/frontend/components/edit/editbox/Editbox.svelte` | 275:8 `<div>` | 275 `<div>` |
| `src/frontend/components/edit/editbox/EditboxCropping.svelte` | 214:4, 215:4, 216:4, 217:4, 219:4, 220:4, 221:4, 222:4, 224:4, 225:4, 226:4, 227:4 `<div>` | 214 `<div>`, 215 `<div>`, 216 `<div>`, 217 `<div>`, 219 `<div>`, 220 `<div>`, 221 `<div>`, 222 `<div>`, 224 `<div>`, 225 `<div>`, 226 `<div>`, 227 `<div>` |
| `src/frontend/components/edit/editbox/EditboxLines.svelte` | 757:12 `<div>` | 779 `<div>` (multi-line opening tag) |
| `src/frontend/components/edit/editors/AudioEditor.svelte` | 47:4 `<div>`, 48:4 `<div>` | 47 `<div>`, 48 `<div>` |
| `src/frontend/components/edit/editors/MediaEditor.svelte` | 71:12 `<div>`, 75:12 `<div>` | 71 `<div>`, 75 `<div>` |
| `src/frontend/components/inputs/MaterialButton.svelte` | 121:8 `<span>` | 121 `<span>` |
| `src/frontend/components/inputs/MaterialCheckbox.svelte` | 37:4 `<div>`, 38:4 `<div>`, 64:4 `<span>` | 37 `<div>`, 38 `<div>`, 64 `<span>` |
| `src/frontend/components/inputs/MaterialColorInput.svelte` | 206:8 `<div>`, 213:8 `<span>` | 206 `<div>`, 213 `<span>` |
| `src/frontend/components/inputs/MaterialDropdown.svelte` | 282:4 `<div>`, 314:4 `<span>` | 282 `<div>`, 314 `<span>` |
| `src/frontend/components/inputs/MaterialFilePicker.svelte` | 59:4 `<div>`, 101:4 `<span>` | 59 `<div>`, 101 `<span>` |
| `src/frontend/components/inputs/MaterialFolderPicker.svelte` | 53:4 `<div>`, 75:4 `<span>` | 53 `<div>`, 75 `<span>` |
| `src/frontend/components/inputs/MaterialNumberInput.svelte` | 155:4 `<div>`, 176:4 `<span>` | 155 `<div>`, 176 `<span>` |
| `src/frontend/components/inputs/MaterialPopupButton.svelte` | 66:4 `<div>`, 111:4 `<span>` | 66 `<div>`, 111 `<span>` |
| `src/frontend/components/inputs/MaterialRadialPicker.svelte` | 154:4 `<div>`, 182:4 `<span>` | 154 `<div>`, 182 `<span>` |
| `src/frontend/components/inputs/MaterialTextInput.svelte` | 80:4 `<div>`, 90:4 `<span>` | 80 `<div>`, 90 `<span>` |
| `src/frontend/components/inputs/MaterialTextarea.svelte` | 36:4 `<div>`, 37:4 `<textarea>`, 39:4 `<span>` | 36 `<div>`, 37 `<textarea>`, 39 `<span>` |
| `src/frontend/components/inputs/MaterialTimePicker.svelte` | 62:4 `<div>`, 72:4 `<span>` | 62 `<div>`, 72 `<span>` |
| `src/frontend/components/inputs/MaterialToggleSwitch.svelte` | 38:4 `<div>`, 39:4 `<div>`, 57:8 `<div>`, 60:4 `<span>` | 38 `<div>`, 39 `<div>`, 57 `<div>`, 60 `<span>` |
| `src/frontend/components/main/Loader.svelte` | 5:0 `<div>` | 5 `<div>` |
| `src/frontend/components/main/ProgressPanel.svelte` | 87:28 `<div>`, 109:28 `<div>` | 87 `<div>`, 109 `<div>` |
| `src/frontend/components/main/Top.svelte` | 100:12 `<div>`, 155:12 `<div>` | 100 `<div>`, 155 `<div>` |
| `src/frontend/components/main/popups/ChooseMediaInput.svelte` | 71:12 `<div>` | 71 `<div>` |
| `src/frontend/components/main/popups/ManageFonts.svelte` | 164:22 `<div>` | 164 `<div>` |
| `src/frontend/components/media/Video.svelte` | 233:8 `<video>`, 241:8 `<video>` | 233 `<video>`, 241 `<video>` |
| `src/frontend/components/output/layers/BackgroundMedia.svelte` | 55:74 `<div>` | 55 `<div>` |
| `src/frontend/components/output/layers/PdfOutput.svelte` | 80:8 `<canvas>` | 80 `<canvas>` |
| `src/frontend/components/output/tools/MediaControls.svelte` | 119:16 `<div>`, 123:16 `<div>`, 142:16 `<div>` | 119 `<div>`, 123 `<div>`, 142 `<div>` |
| `src/frontend/components/show/AudioPreview.svelte` | 166:4 `<canvas>` | 166 `<canvas>` |
| `src/frontend/components/show/ProjectContentList.svelte` | 477:12 `<div>`, 494:12 `<div>` | 477 `<div>`, 494 `<div>` |
| `src/frontend/components/show/Projects.svelte` | 539:20 `<div>`, 545:20 `<div>`, 556:24 `<div>` | 539 `<div>`, 545 `<div>`, 556 `<div>` |
| `src/frontend/components/show/VideoShow.svelte` | 371:20 `<video>`, 382:20 `<video>`, 421:16 `<div>`, 459:16 `<div>` | 371 `<video>`, 382 `<video>`, 421 `<div>`, 459 `<div>` |
| `src/frontend/components/show/pdf/PdfPreview.svelte` | 210:16 `<canvas>` | 210 `<canvas>` |
| `src/frontend/components/show/tools/HighlightedNotes.svelte` | 65:4 `<textarea>` | 65 `<textarea>` |
| `src/frontend/components/show/tools/Notes.svelte` | 32:4 `<textarea>` | 32 `<textarea>` |
| `src/frontend/components/show/tools/SlideGroups.svelte` | 132:12 `<div>` | 132 `<div>` |
| `src/frontend/components/slide/Layouts.svelte` | 144:16 `<div>`, 158:12 `<div>` | 144 `<div>`, 158 `<div>` |
| `src/frontend/components/slide/Reference.svelte` | 90:8, 99:8, 115:8, 126:8, 136:8 `<div>` | 90 `<div>`, 99 `<div>`, 115 `<div>`, 126 `<div>`, 136 `<div>` |
| `src/frontend/components/slide/SkeletonSlide.svelte` | 22:12 `<div>`, 33:8 `<div>`, 38:12 `<div>` | 22 `<div>`, 33 `<div>`, 38 `<div>` |
| `src/frontend/components/slide/Slide.svelte` | 280:8 `<div>`, 289:8 `<div>`, 415:28 `<div>`, 419:20 `<div>`, 425:28 `<div>`, 429:32 `<div>` | 280 `<div>`, 289 `<div>`, 415 `<div>`, 419 `<div>`, 425 `<div>`, 429 `<div>` |
| `src/frontend/components/slide/views/Captions.svelte` | 85:12 `<webview>` | 85 `<webview>` |
| `src/frontend/components/slide/views/MediaItem.svelte` | 191:16 `<video>`, 200:16 `<video>` | 191 `<video>`, 200 `<video>` |
| `src/frontend/components/slide/views/Timer.svelte` | 151:4 `<div>`, 153:4 `<div>` | 151 `<div>`, 153 `<div>` |
| `src/frontend/components/slide/views/Visualizer.svelte` | 243:0 `<canvas>` | 243 `<canvas>` |
| `src/frontend/components/slide/views/Website.svelte` | 87:8 `<div>` | 104 `<div>` (multi-line opening tag) |
| `src/frontend/components/stage/SkeletonStageSlide.svelte` | 20:12 `<div>` | 20 `<div>` |
| `src/frontend/components/system/Movebox.svelte` | 97:8 `<div>`, 101:12 `<div>` | 97 `<div>`, 101 `<div>` |
| `src/frontend/components/system/SelectElem.svelte` | 338:16, 342:16, 345:16, 346:16, 349:16 `<span>`, 353:12 `<span>` | 338 `<span>`, 342 `<span>`, 345 `<span>`, 346 `<span>`, 349 `<span>`, 353 `<span>` |
| `src/frontend/components/system/Snaplines.svelte` | 126:4 `<div>` | 129 `<div>` (multi-line opening tag) |
| `src/frontend/components/timeline/TimelineEasing.svelte` | 219:24, 222:24, 230:24, 253:24 `<div>` | 219 `<div>`, 222 `<div>`, 250 `<div>` (for 230), 273 `<div>` (for 253) |
| `src/server/common/components/Checkbox.svelte` | 5:4 `<div>` | 5 `<div>` |
| `src/server/common/components/Loader.svelte` | 5:0 `<div>` | 5 `<div>` |
| `src/server/output_stream/App.svelte` | 172:4 `<canvas>` | 172 `<canvas>` |
| `src/server/remote/components/MaterialButton.svelte` | 112:8 `<span>` | 112 `<span>` |
| `src/server/stage/components/PreviewCanvas.svelte` | 66:4 `<canvas>` | 66 `<canvas>` |
| `src/server/stage/components/Timer.svelte` | 74:4 `<div>`, 76:4 `<div>` | 74 `<div>`, 76 `<div>` |

For the 30 changed application `.ts` files, the complete changed-line list and target diagnostic attribution is below. Finding-level behavioral reviews are in the corresponding T1/T2/T3/T4 classification tables in `01-07-SUMMARY.md`, `01-08-SUMMARY.md`, and `01-09-SUMMARY.md`. Each code hunk maps to an individually reviewed current-only `no-unnecessary-type-assertion`; annotation/import lines are direct type-preservation or cleanup dependencies. No `src/**/*.js` path changed.

| Application-source file | Changed hunk line(s) | Reviewed target diagnostic(s) / attribution |
|---|---|---|
| `src/electron/contentProviders/ContentProviderRegistry.ts` | 83, 104, 157 | `no-unnecessary-type-assertion` at 83:51, 104:33, 157:40 |
| `src/electron/contentProviders/canva/CanvaContentLibrary.ts` | 344, 413 | `no-unnecessary-type-assertion` at 337:28 and 406:24; each assertion spans to the hunk line |
| `src/electron/contentProviders/onStage/connect.ts` | 310 | `no-unnecessary-type-assertion` at 310:35 |
| `src/electron/data/store.ts` | 222 | `no-unnecessary-type-assertion` at 222:16 |
| `src/electron/data/zip.ts` | 134, 274 | `no-unnecessary-type-assertion` at 134:26, 274:30 |
| `src/electron/servers.ts` | 124–125, 127, 129–130, 163, 165 | `no-unnecessary-type-assertion` at 124:9, 125:38, 127:9, 129:9/36, 130:9, 163:9, 165:9 |
| `src/frontend/components/actions/apiHelper.ts` | 589, 591 | `no-unnecessary-type-assertion` at 591:12; line 589 adds the preserving `Promise<API_id_value>` return annotation |
| `src/frontend/components/context/contextMenuSearch.ts` | 25 | `no-unnecessary-type-assertion` at 25:23 |
| `src/frontend/components/context/loadItems.ts` | 245 | `no-unnecessary-type-assertion` at 245:40 |
| `src/frontend/components/context/menuClick.ts` | 2469 | `no-unnecessary-type-assertion` at 2469:62 |
| `src/frontend/components/drawer/bible/scripture.ts` | 192, 1416 | `no-unnecessary-type-assertion` at 192:71, 1416:102; current-only `await-thenable` at 160:50 is retained with no hunk |
| `src/frontend/components/edit/scripts/chords.ts` | 19, 24 | `no-unnecessary-type-assertion` at 18:5 (assertion at line 19), 24:5 |
| `src/frontend/components/edit/scripts/itemHelpers.ts` | 198 | `no-unnecessary-type-assertion` at 198:21 |
| `src/frontend/components/export/projectLink.ts` | 7, 107, 136, 143 | `no-unnecessary-type-assertion` at 107:12 and 132:20; line 107 supplies the explicit map element type, line 143 removes the outer assertion, line 136 removes the nested cast, and line 7 removes its now-unused type import |
| `src/frontend/components/helpers/array.ts` | 90 | `no-unnecessary-type-assertion` at 90:45; only the current-only inner assertion was removed, while the matched outer assertion remains |
| `src/frontend/components/helpers/clipboard.ts` | 1032, 1034, 1453 | `no-unnecessary-type-assertion` at 1032:17, 1034:22, 1453:90 |
| `src/frontend/components/helpers/dropActions.ts` | 681 | `no-unnecessary-type-assertion` at 681:70 |
| `src/frontend/components/helpers/history.ts` | 41, 322, 360 | `no-unnecessary-type-assertion` at 41:47, 322:13, 360:13 |
| `src/frontend/components/helpers/output.ts` | 2091 | `no-unnecessary-type-assertion` at 2091:18; only the current-only `lines!` was removed, the matched `text!` remains |
| `src/frontend/components/helpers/shows.ts` | 133 | `no-unnecessary-type-assertion` at 133:49 and 133:63 |
| `src/frontend/components/main/popups/localization/translation.ts` | 49, 80 | `no-unnecessary-type-assertion` at 80:28; line 49 adds the equivalent `Promise<Item | null>` callback return type |
| `src/frontend/components/quicksearch/quicksearch.ts` | 330 | `no-unnecessary-type-assertion` at 330:25 |
| `src/frontend/components/show/formatTextEditor.ts` | 84 | `no-unnecessary-type-assertion` at 84:31 |
| `src/frontend/components/slide/views/websiteDomPool.ts` | 196, 199, 202, 226, 231 | `no-unnecessary-type-assertion` at 196:20/34/57, 199:20, 202:20/41, 226:13, 231:35/100/118 |
| `src/frontend/components/stage/stage.ts` | 47 | `no-unnecessary-type-assertion` at 47:39 |
| `src/frontend/components/timeline/TimelineActions.ts` | 133, 156–157 | `no-unnecessary-type-assertion` at 133:17, 156:17, 157:17 |
| `src/frontend/converters/powerpoint/PowerPointHelper.ts` | 290, 295, 1405, 1421 | `no-unnecessary-type-assertion` at 295:28 and 1416:12; lines 290 and 1405 add equivalent callback/function return annotations, and lines 295 and 1421 remove the casts |
| `src/frontend/converters/songbeamer.ts` | 128 | `no-unnecessary-type-assertion` at 128:12 |
| `src/frontend/show/slides.ts` | 51, 91, 318, 343, 347, 432, 437 | `no-unnecessary-type-assertion` at the corresponding seven lines (51:13, 91:13, 318:9, 343:40, 347:21, 432:13, 437:40) |
| `src/frontend/utils/drive.ts` | 4, 52 | `no-unnecessary-type-assertion` at 52:32; line 4 removes the now-unused type-only import |

The current-only awaits in `src/electron/cloud/drive.ts:209:9`, `src/electron/data/import.ts:24:9` and `:36:9`, and `src/frontend/components/drawer/bible/scripture.ts:160:50` have no source hunk; they remain unchanged because scheduling, Promise reaction/rejection timing, or async-from-sync iterator-close behavior is not established as equivalent. All matched and baseline-only target findings are likewise unchanged. `src/frontend/tsconfig.json` has a separate earlier 01-04 configuration hunk at new line 5 (`allowJs`/`noEmit`), not an application-source remediation. `config/testing/output-render.test.ts` has two earlier plan-owned test-harness hunks (old lines 80 and 400) for Darwin scale normalization; it is not application source. No other `src` source hunk failed attribution.

#### Fresh Darwin output-render comparison and cleanup

| Command / assertion | Result | Evidence |
|---|---|---|
| `npx playwright test --config config/testing/playwright.config.ts output-render --retries=0` | Exit 0; **2 passed, 0 skipped**, 1 worker; both 1920×1080 output comparisons actually ran | Full stdout/stderr and independent status: `phase1-01-04-final/output-render.stdout`, `.stderr`, `.exit`; no snapshot-update option used |
| `maxDiffPixels: 0` | Present and unchanged | `config/testing/output-render.test.ts:401`; test reports Darwin baseline verified at 1920×1080 |
| Snapshot SHA-256 before / after | `1f040b92c1ede6a4237e817bfc389fb2a694f0c3c43b70f675a7579f3ea49162` / identical | `output-render.snapshot.before.sha256`, `output-render.snapshot.after.sha256`; `git diff --exit-code 88902f7b6b68de6885aa031a9b12873643d6f956 -- config/testing/output-render.test.ts-snapshots/output-1920x1080-darwin.png` exit 0 |
| `node scripts/cleanBuilds.js` | Exit 0 | `phase1-01-04-final/clean-builds.stdout`, `.stderr`, `.exit` |
| Development HTML restoration / cleanliness | `/src/frontend/main.ts` dev module literal present; `git status --porcelain public/index.html` empty | Independently checked after cleanup; captured in `phase1-01-04-final/task3-final-verification.txt` |

Task 3 source authorization and output-pixel/cleanup gates pass. Plan 01-04 as a whole remains **BLOCKED**: the fresh production build has zero target warnings, but pinned svelte-check still reports three target warnings (`EffectsInfo.svelte:4:1`, `OverlayInfo.svelte:14:5`, `output/preview/PreviewCanvas.svelte:85:5`); Electron/frontend `await-thenable` remain 6/3 and 1/0 versus their individual baselines; and Prettier has 120 unformatted files versus the 40-file baseline (80 new remediation paths). These findings are preserved without suppression, source changes beyond the recorded authorization, or formatter writes. The build assertion, Stylelint, Vitest baseline, and pixel comparisons pass their recorded criteria; the specific unresolved deltas prevent gate acceptance.
