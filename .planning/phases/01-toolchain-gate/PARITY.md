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

Measurements and inventory checks are appended in Task 2 after all non-mutating jobs have been run against the recorded baselines.

## Task 3 — Findings and resolutions

Classifications, config adjustments, and any unresolved blockers are appended in Task 3. The new self-closing-tag compiler warnings will not be hidden; source-wide edits are outside this plan's authorized scope.
