# Phase 1 — Pre-Upgrade Baselines

Recorded against the **frozen, unmodified** toolchain before any dependency version moved.
Toolchain at capture time: `svelte 3.59.2`, `vite 4.5.14`, `typescript 4.9.5`, `svelte-check 2.10.3`, `vitest 2.1.9`, `eslint 8.57.1`, `prettier 3.6.2`, `stylelint 16.26.1`.

| Field | Value |
|---|---|
| Git revision | `136d77575ec1f853c66eba3a1f44be7401e9234c` (`136d7757 chore(01): pin svelte-check to the explicit svelte tsconfig`) |
| Working tree | clean apart from the pinned `test:svelte` script; `git diff --stat package.json` = 1 insertion / 1 deletion |
| Date (UTC) | 2026-10-17 |
| Platform | `darwin-arm64` (macOS 27.0.1, build 26A434) |
| Node | `v22.23.2` |

## The five baselines

| # | Check | Exact command | Recorded number | File |
|---|---|---|---|---|
| 1 | svelte-check | `npx svelte-check --tsconfig config/typescript/tsconfig.svelte.json --output machine` | **2244 FILES / 338 ERRORS / 47 WARNINGS / 598 HINTS** | `svelte-check.txt` |
| 2 | ESLint + Stylelint, four jobs | see `lint.json` → `<job>.command` | **electron 149 files · 212 err / 25 warn** · **frontend 255 files · 630 err / 0 warn** · **svelte 464 files · 167 err / 39 warn** · **styles 464 files · 216 err / 0 warn** | `lint.json` |
| 3 | Vitest | `npx vitest run --config config/testing/vitest.config.ts --reporter=json` | **12 files / 60 suites / 181 tests · 179 passed / 2 failed / 0 skipped / 0 todo** | `vitest.json` |
| 4 | Prettier | `npx prettier --config config/formatting/.prettierrc.yaml --check src scripts` | **exit 1 · 1039 candidates · 40 unformatted (20 of them `.svelte`)** | `format.txt` |
| 5 | Pixel baseline | `npm run build && npx playwright test --config config/testing/playwright.config.ts output-render --update-snapshots=all` | committed PNG at `config/testing/output-render.test.ts-snapshots/output-1920x1080-darwin.png` | Task 3 of `01-01-PLAN.md` |

### Notes carried with the numbers

- **The svelte-check `FILES` count is the anti-false-pass guard.** `svelte-check` with no `--tsconfig` performs an upwards traversal for the next `jsconfig`/`tsconfig.json`; from the repo root there is none, so an unpinned run silently checks less than intended while reporting a near-clean result. 2244 is the resolved count — a handful would mean the pinned config failed to resolve and the whole number is void.
- **The `svelte` lint job is *not* inert today.** It reports 206 problems (167 errors + 39 warnings) across 464 files. Its 39 warnings are **Svelte compiler a11y diagnostics surfaced by the `eslint-plugin-svelte3` processor** (rule ids are the compiler's own kebab-case codes: `a11y-click-events-have-key-events` 16, `a11y-autofocus` 9, `a11y-label-has-associated-control` 6, `a11y-no-noninteractive-tabindex` 4, `a11y-missing-attribute` 2, `a11y-role-has-required-aria-props` 2). There are **zero** rule ids under the literal `svelte3/` namespace, because `eslint-plugin-svelte3` surfaces compiler diagnostics under the diagnostic's own code. Plan 01-02's parity claim is measured against this: the replacement must keep surfacing the same compiler diagnostics (`svelte/valid-compile`), because that is the job's only Svelte-specific contribution and `eslint-plugin-svelte@3` removed it from `recommended`.
- **The Vitest failures are pre-existing, not caused by this phase.** 2 tests fail in `src/electron/cloud/syncManager.test.ts` ("Scenario 1: if not found locally, and marked as 'deleted' in cloud: skip" — `expected true to be false`; "should fall back to file mtime when neither device has ever tracked a real edit time (backward compatibility)" — `expected 1 to be 2`). `numFailedTestSuites: 4` counts failing `describe` blocks; 1 of the 12 test *files* failed.
- **The Prettier `.svelte` count is the anti-false-pass guard.** `prettier-plugin-svelte` silently ignoring `.svelte` files would make the check look clean; 20 unformatted `.svelte` files prove the plugin is parsing them.
- **The `baseline/lint.json` and `baseline/vitest.json` files carry more than the totals** (per-job `command`, `fileCount`, `ruleBreakdown`, compiler-diagnostic codes) so a later plan never has to re-derive them.

## Governing rule

**Every later plan compares against these files, never against memory, and the post-upgrade run must use character-identical arguments.** The commands above are recorded verbatim in each baseline file's `command` field (or header). A count that moves because the command changed is not evidence; a count that moves while the command is byte-identical is the finding. Where a command must change (typically plan 01-02's `lint:svelte` flat-config migration), the change must be accompanied by an explicit "this number is expected to move, for this reason" note — never by silently re-baselining.
