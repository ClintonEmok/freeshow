---
phase: 01-toolchain-gate
plan: 09
subsystem: infra/testing
tags: [svelte5, svelte-check, eslint, typescript-eslint, element_invalid_self_closing_tag, no-unnecessary-type-assertion, await-thenable, parity]

# Dependency graph
requires:
  - phase: 01-toolchain-gate
    provides: "01-06's pinned pre-remediation checker inventory and separate production-build warning inventory"
  - phase: 01-toolchain-gate
    provides: "01-07 and 01-08's source-remediation batches and normalized baseline/current target-lint differential"
provides:
  - "S7 normalization of 22 exact production-inventoried non-void self-closing elements in 12 renderer/server Svelte files"
  - "Individual T3/T4 disposition of 57 target-rule occurrences: 39 current-only assertions safely resolved and 18 baseline-matched findings retained"
  - "Exact S7 compiler-location-to-source-hunk map and T3/T4 finding evidence for the final parity gate"
affects: [01-04-final-parity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Keep checker and production diagnostic coordinates distinct; map multi-line opening-tag diagnostics to the exact changed closing-token hunk."
    - "Remove only individually reviewed current-only assertions; preserve matched assertions and make inference-preserving callback/return types explicit where needed."
    - "Do not infer final parity from scoped ESLint runs or intermediate checker counts; the final build/checker gate remains a separate plan."

key-files:
  created:
    - .planning/phases/01-toolchain-gate/01-09-SUMMARY.md
  modified:
    - src/frontend/components/slide/views/Website.svelte
    - src/frontend/components/stage/SkeletonStageSlide.svelte
    - src/frontend/components/system/Movebox.svelte
    - src/frontend/components/system/SelectElem.svelte
    - src/frontend/components/system/Snaplines.svelte
    - src/frontend/components/timeline/TimelineEasing.svelte
    - src/server/common/components/Checkbox.svelte
    - src/server/common/components/Loader.svelte
    - src/server/output_stream/App.svelte
    - src/server/remote/components/MaterialButton.svelte
    - src/server/stage/components/PreviewCanvas.svelte
    - src/server/stage/components/Timer.svelte
    - src/frontend/components/helpers/array.ts
    - src/frontend/components/helpers/clipboard.ts
    - src/frontend/components/helpers/dropActions.ts
    - src/frontend/components/helpers/history.ts
    - src/frontend/components/helpers/output.ts
    - src/frontend/components/helpers/shows.ts
    - src/frontend/components/main/popups/localization/translation.ts
    - src/frontend/components/quicksearch/quicksearch.ts
    - src/frontend/components/show/formatTextEditor.ts
    - src/frontend/components/slide/views/websiteDomPool.ts
    - src/frontend/components/stage/stage.ts
    - src/frontend/components/timeline/TimelineActions.ts
    - src/frontend/converters/powerpoint/PowerPointHelper.ts
    - src/frontend/converters/songbeamer.ts
    - src/frontend/show/slides.ts
    - src/frontend/utils/drive.ts

key-decisions:
  - "All 22 S7 edits are authorized by the pre-remediation production inventory; the 15 frontend path-line-tag keys also occur in the fresh pinned checker inventory, while seven server sites are production-inventory-only."
  - "Resolve all 13 T3 and 26 T4 current-only assertion findings only where control-flow/type review proves behavior preservation; retain all 18 matched findings unchanged."
  - "Keep the four earlier current-only await findings as final parity blockers; no await-thenable finding occurred in T3 or T4."

patterns-established:
  - "Svelte warning hunk: preserve the complete opening tag and its whitespace/attributes, changing only `/>` into `></tag>`; record compiler coordinates separately from the physical changed line."
  - "For assertion cleanup, preserve callback/map result typing with explicit equivalent type annotations rather than relying on changed inference."

# Metrics
duration: "not recoverable from continuation; source execution start was not included in the handoff"
completed: 2026-10-18
---

# Phase 1 Plan 09: S7 and T3/T4 Remediation Summary

**The final 22 compiler-authorized Svelte warning sites and 39 safe current-only T3/T4 assertions are resolved; 18 matched lint findings and four earlier async-semantics blockers remain visible for the final parity gate.**

## Performance

- **Duration:** The source-task start timestamp was not present in the continuation handoff. The three source commits are timestamped 09:28–09:37 UTC on 2026-10-18; the documentation continuation began at 09:41:20 UTC.
- **Completed:** 2026-10-18
- **Tasks:** 3/3
- **Source files modified:** 28 (12 Svelte, 8 T3 TypeScript, 8 T4 TypeScript)

## Accomplishments

- Normalized exactly 22 S7 non-void tags in 12 assigned files. The production inventory authorizes all 22; the 15 frontend path-line-tag keys are independently present in the fresh pinned checker inventory. The seven server sites are production-only because the pinned checker does not cover `src/server`.
- Individually classified all 23 T3 target findings: 10 baseline-matched and retained, 13 current-only assertions safely resolved, and no baseline-only findings. The duplicate current diagnostic ranges in `array.ts:90:45` and `output.ts:2091:18` were separated into their matched and current-only assertion occurrences.
- Individually classified all 34 T4 target findings: eight baseline-matched and retained, 26 current-only assertions safely resolved, and no baseline-only findings.
- Preserved runtime behavior, control flow, and typing: existing matched assertions were not touched; explicit callback/return annotations preserve map and object result types; no await, aggregation, iterator, rule, configuration, warning policy, test, or CI change was made.
- Assigned-path ESLint target findings fell from 23 to 10 in T3 and 34 to 8 in T4. Both commands remain exit 1 due to other assigned-file lint errors; exact JSON, stderr, and independent exit files are saved outside the repository.

## Task Commits

1. **Task 1: Normalize warning batch S7 (12 Svelte files)** — `c913b567` (`fix(01-09): normalize S7 Svelte tag warnings`)
2. **Task 2: Review and safely resolve target lint findings batch T3 (12 TypeScript files)** — `7a676f0e` (`fix(01-09): resolve safe T3 lint assertions`)
3. **Task 3: Review and safely resolve target lint findings batch T4 (11 TypeScript files)** — `8883ba5a` (`fix(01-09): resolve safe T4 lint assertions`)

**Plan metadata:** a separate documentation commit records this summary and updates `STATE.md` and `ROADMAP.md`.

## Files Created/Modified

- **S7 (12 files, 22 tag hunks):** `src/frontend/components/slide/views/Website.svelte`, `src/frontend/components/stage/SkeletonStageSlide.svelte`, `src/frontend/components/system/Movebox.svelte`, `src/frontend/components/system/SelectElem.svelte`, `src/frontend/components/system/Snaplines.svelte`, `src/frontend/components/timeline/TimelineEasing.svelte`, `src/server/common/components/Checkbox.svelte`, `src/server/common/components/Loader.svelte`, `src/server/output_stream/App.svelte`, `src/server/remote/components/MaterialButton.svelte`, `src/server/stage/components/PreviewCanvas.svelte`, `src/server/stage/components/Timer.svelte`.
- **T3 files changed (8):** `src/frontend/components/helpers/array.ts`, `src/frontend/components/helpers/clipboard.ts`, `src/frontend/components/helpers/dropActions.ts`, `src/frontend/components/helpers/history.ts`, `src/frontend/components/helpers/output.ts`, `src/frontend/components/helpers/shows.ts`, `src/frontend/components/main/popups/localization/translation.ts`, `src/frontend/components/quicksearch/quicksearch.ts`.
- **T3 assigned files unchanged (4):** `src/frontend/components/helpers/historyHelpers.ts`, `src/frontend/components/helpers/showActions.ts`, `src/frontend/components/output/preview/SpotifyManager.ts`, `src/frontend/components/quicksearch/searchHighlight.ts` (all findings were baseline matches).
- **T4 files changed (8):** `src/frontend/components/show/formatTextEditor.ts`, `src/frontend/components/slide/views/websiteDomPool.ts`, `src/frontend/components/stage/stage.ts`, `src/frontend/components/timeline/TimelineActions.ts`, `src/frontend/converters/powerpoint/PowerPointHelper.ts`, `src/frontend/converters/songbeamer.ts`, `src/frontend/show/slides.ts`, `src/frontend/utils/drive.ts`.
- **T4 assigned files unchanged (3):** `src/frontend/components/system/textbox.ts`, `src/frontend/utils/cloudSync.ts`, `src/frontend/utils/obsTalk.ts` (all findings were baseline matches).
- No `PARITY.md`, checker/lint configuration, tests, CI, warning filter, or out-of-scope application source changed.

## S7 Compiler Diagnostic-to-Hunk Map

All coordinates below are **pre-edit**. Production and checker coordinates remain separate. The diagnostic points to the element's opening tag; the “changed hunk line” is the physical line where the self-closing token was replaced. Each hunk preserves the original tag, attributes, values, whitespace and surrounding markup; only `/>` becomes `></tag>`.

| File | Production diagnostic(s) | Fresh checker diagnostic(s) | Changed hunk line(s) and tag |
|---|---|---|---|
| `src/frontend/components/slide/views/Website.svelte` | 87:8 `<div>` | 87:9 `<div>` | 104 — `<div … />` → `<div … ></div>` (opening tag spans lines 87–104) |
| `src/frontend/components/stage/SkeletonStageSlide.svelte` | 20:12 `<div>` | 20:13 `<div>` | 20 — `<div>` ×1 |
| `src/frontend/components/system/Movebox.svelte` | 97:8, 101:12 `<div>` | 97:9, 101:13 `<div>` | 97, 101 — `<div>` ×2 |
| `src/frontend/components/system/SelectElem.svelte` | 338:16, 342:16, 345:16, 346:16, 349:16 `<span>`; 353:12 `<span>` | 338:17, 342:17, 345:17, 346:17, 349:17 `<span>`; 353:13 `<span>` | 338, 342, 345, 346, 349, 353 — `<span>` ×6 |
| `src/frontend/components/system/Snaplines.svelte` | 126:4 `<div>` | 126:5 `<div>` | 129 — `<div>` ×1 (multi-line opening tag) |
| `src/frontend/components/timeline/TimelineEasing.svelte` | 219:24, 222:24, 230:24, 253:24 `<div>` | 219:25, 222:25, 230:25, 253:25 `<div>` | 219, 222, 250, 273 — `<div>` ×4; the latter two close multi-line opening tags |
| `src/server/common/components/Checkbox.svelte` | 5:4 `<div>` | Not covered | 5 — `<div>` ×1 |
| `src/server/common/components/Loader.svelte` | 5:0 `<div>` | Not covered | 5 — `<div>` ×1 |
| `src/server/output_stream/App.svelte` | 172:4 `<canvas>` | Not covered | 172 — `<canvas>` ×1 |
| `src/server/remote/components/MaterialButton.svelte` | 112:8 `<span>` | Not covered | 112 — `<span>` ×1 |
| `src/server/stage/components/PreviewCanvas.svelte` | 66:4 `<canvas>` | Not covered | 66 — `<canvas>` ×1 |
| `src/server/stage/components/Timer.svelte` | 74:4, 76:4 `<div>` | Not covered | 74, 76 — `<div>` ×2 |

**S7 inventory disposition:** production = 22 locations (15 frontend + 7 server); fresh pinned checker = 15 frontend locations. All 15 frontend path-line-tag keys match between the separate inventories; the checker columns are one greater than production at these sites. The server sites are authorized by the production inventory only. No warning suppression or inventory-derived count projection was used.

## T3 Finding-by-Finding Classification and Disposition

Classification is against the normalized baseline/current differential in `PARITY.md`. Locations are pre-edit. Repeated diagnostics at the same start coordinate are called out as separate assertion occurrences.

| File and finding(s) | Classification and disposition | Evidence / exact source hunk |
|---|---|---|
| `helpers/array.ts:90:45` (two overlapping findings) | One **matched**, retained; one **current-only**, resolved | Removed only the inner `[2]!` from `match![2]!`; retained the matched outer `match!`. The captured regex result and existing conditional/fallback stay unchanged; the assertion is erased at runtime. |
| `helpers/clipboard.ts:1032:17` | **Current-only**, resolved | Removed `tracks!`; the same `a[id]?.tracks?.[index]` guard narrows the track array before the unchanged `splice`. |
| `helpers/clipboard.ts:1034:22` | **Current-only**, resolved | Removed `tracks!`; same guard, unchanged empty-length test and delete. |
| `helpers/clipboard.ts:1453:90` | **Current-only**, resolved | Removed `get(activePage) as any`; the history location accepts the store's original page type. The runtime value and call are unchanged. |
| `helpers/dropActions.ts:681:70` | **Current-only**, resolved | Removed `videoType!`; the preceding `if (!videoType) return null` narrows the unchanged value to the `"youtube" | "vimeo"` union for the same object assignment. The separate `rid!` was not part of the diagnostic and remains. |
| `helpers/history.ts:41:47` | **Current-only**, resolved | Removed `get(activePage) as any`; `History.location.page` accepts the original value. Only an erased assertion changed. |
| `helpers/history.ts:322:13` | **Current-only**, resolved | Removed `lastUndo!`; the value is passed to the same `history` call after the existing undo selection/branch logic. No call or control-flow change. |
| `helpers/history.ts:360:13` | **Current-only**, resolved | Removed `lastRedo!`; same reasoning and unchanged `history(lastRedo, false)` call. |
| `helpers/historyHelpers.ts:475:74, 477:23, 478:23` | Three **matched**, retained | Baseline matches in the generic history helper; no inference or map-result changes attempted. |
| `helpers/output.ts:1519:34, 1676:55` | Two **matched**, retained | Baseline matches; unchanged. |
| `helpers/output.ts:2091:18` (two overlapping findings) | One **matched**, retained; one **current-only**, resolved | Removed only `lines!` in `items[textboxItem].lines![0].text![0].value`; the `else` follows the existing optional-chain test/initialization. Retained the matched `text!`; no property access, assignment, or runtime branch changed. |
| `helpers/showActions.ts:999:32` | **Matched**, retained | Baseline match; unchanged. |
| `helpers/shows.ts:133:49, 133:63` | Two **current-only**, resolved | Removed `slides!` at both reads; the function's earlier default assignment ensures `slides` is an array before the update callback. The indexed selection/fallback is identical. |
| `main/popups/localization/translation.ts:80:28` | **Current-only**, resolved | Removed `as Item`; added `: Promise<Item | null>` to the async map callback. This preserves the `Promise.all` result element type for both `null` and translated-item branches, with no emitted runtime change. |
| `output/preview/SpotifyManager.ts:66:28` | **Matched**, retained | Baseline match; unchanged. |
| `quicksearch/quicksearch.ts:330:25` | **Current-only**, resolved | Removed `id as any` only under `if (id === "text")`; literal narrowing supplies the same accepted `addItem` argument. Other branch unchanged. |
| `quicksearch/searchHighlight.ts:13:60` | **Matched**, retained | Baseline match; unchanged. |

**T3 totals:** 23 pre-edit findings = 10 matched + 13 current-only + 0 baseline-only. All 13 current-only assertion findings were resolved; post-edit target set is exactly the 10 matched findings. No `await-thenable` occurrence was reported in T3.

## T4 Finding-by-Finding Classification and Disposition

| File and finding(s) | Classification and disposition | Evidence / exact source hunk |
|---|---|---|
| `show/formatTextEditor.ts:84:31` | **Current-only**, resolved | Removed `slidesNew[i].id!`; the same callback assigns `uid()` to `id` immediately before pushing that value into the existing `string[]`. No runtime change. |
| `slide/views/websiteDomPool.ts:196:20, 196:34, 196:57` | Three **current-only**, resolved | Removed the three `slot!` assertions in `getCurrentUrl`. `slot` is found or created before controller construction, and is not reset to `undefined`; same history/webview fallback order. |
| `slide/views/websiteDomPool.ts:199:20` | **Current-only**, resolved | Removed `slot!` in `canGoBack`; same initialized captured slot and comparison. |
| `slide/views/websiteDomPool.ts:202:20, 202:41` | Two **current-only**, resolved | Removed both `slot!` assertions in `canGoForward`; same history index/length comparison. |
| `slide/views/websiteDomPool.ts:226:13` | **Current-only**, resolved | Removed `slot!` when updating options; same captured slot is assigned before the returned controller. |
| `slide/views/websiteDomPool.ts:231:35, 231:100, 231:118` | Three **current-only**, resolved | Removed the three `slot!` assertions passed/read in `applyWebviewStyle`; same arguments and evaluation order. |
| `stage/stage.ts:47:39` | **Current-only**, resolved | Removed `itemType as any`; the original string is accepted directly for `StageItem.type`. Object shape/spread/order are unchanged. |
| `system/textbox.ts:18:23, 39:31, 88:27, 216:23, 311:23` | Five **matched**, retained | These generic-call assertions can feed type-argument inference; kept all five byte-for-byte rather than changing generic inference. |
| `timeline/TimelineActions.ts:133:17` | **Current-only**, resolved | Removed `timeline!` after the same branch initializes `timeline` to `{ actions: [] }`; unchanged assignment. |
| `timeline/TimelineActions.ts:156:17, 157:17` | Two **current-only**, resolved | Removed `timeline!` on actions/loop writes after the same branch initializes the timeline. Same clone, loop value, and store update. |
| `converters/powerpoint/PowerPointHelper.ts:295:28` | **Current-only**, resolved | Replaced the returned-object `as Relationship` with an explicit `: Relationship` map-callback return type. This preserves the mapped relationship type/context without emitted JavaScript. |
| `converters/powerpoint/PowerPointHelper.ts:1416:12` | **Current-only**, resolved | Added `: Position` to `getPosition` and removed the returned object cast. The same four properties/expressions are returned; annotation preserves the contract and emits no code. |
| `converters/songbeamer.ts:128:12` | **Current-only**, resolved | Removed `show as Show`; `show` is a `ShowObj` created in this function and is directly assignable to its declared `Show` return type. |
| `show/slides.ts:51:13` | **Current-only**, resolved | Removed `children!` after the same code initializes the parent slide's array before `push`. |
| `show/slides.ts:91:13` | **Current-only**, resolved | Removed `children!` after the same callback initializes the layout child map before assigning the key. |
| `show/slides.ts:318:9` | **Current-only**, resolved | Removed `children!` immediately after the same `if (!children) children = {}` initialization. |
| `show/slides.ts:343:40, 347:21` | Two **current-only**, resolved | Removed `children!` from `indexOf`/`splice` inside the existing `children?.length` guard; same array and mutations. |
| `show/slides.ts:432:13` | **Current-only**, resolved | Removed `children!` after the same branch initializes it to `[]` before `push`. |
| `show/slides.ts:437:40` | **Current-only**, resolved | Removed `children!` from the guarded length check; optional-presence and empty-array checks are unchanged. |
| `utils/cloudSync.ts:353:62` | **Matched**, retained | Baseline match; unchanged. |
| `utils/drive.ts:52:32` | **Current-only**, resolved | Removed `as DriveData`; the same object is accepted by the typed `send` call. Removed the now-unused type-only `DriveData` import as a direct consequence; payload values and call are unchanged. |
| `utils/obsTalk.ts:51:13, 74:13` | Two **matched**, retained | Baseline matches; unchanged. |

**T4 totals:** 34 pre-edit findings = 8 matched + 26 current-only + 0 baseline-only. All 26 current-only assertions were resolved; post-edit target set is exactly the eight matched findings. No `await-thenable` occurrence was reported in T4.

## Verification Results

| Check | Result |
|---|---|
| S7 assigned-path source audit | `git diff --check 88902f7b6b68de6885aa031a9b12873643d6f956 -- [the 12 assigned S7 paths]` — exit 0. The committed diff is exactly 22 one-line tag-close hunks in those paths. |
| T3 assigned-path source audit | The plan's exact 12-path `git diff --check 88902f7b6b68de6885aa031a9b12873643d6f956 -- …` — exit 0. Only eight assigned source files changed, and every hunk maps to a current-only finding. |
| T4 assigned-path source audit | The plan's exact 11-path `git diff --check 88902f7b6b68de6885aa031a9b12873643d6f956 -- …` — exit 0. Only eight assigned source files changed, and every hunk maps to a current-only finding. |
| T3 assigned ESLint before edits | Exact plan command, `-c config/linting/eslint.frontend.json`, assigned 12 files, `--format json`, no `--fix`; 12 files / 83 errors / 0 warnings / 23 target findings; exit 1. |
| T3 assigned ESLint after edits | Same non-mutating command; 12 files / 70 errors / 0 warnings / 10 target findings; exit 1. |
| T4 assigned ESLint before edits | Exact plan command, same frontend config, assigned 11 files, `--format json`, no `--fix`; 11 files / 116 errors / 0 warnings / 34 target findings; exit 1. |
| T4 assigned ESLint after edits | Same non-mutating command; 11 files / 90 errors / 0 warnings / 8 target findings; exit 1. |

Exact plan commands (both non-mutating; neither includes `--fix`):

```bash
npx eslint -c config/linting/eslint.frontend.json --ext .js,.ts src/frontend/components/helpers/array.ts src/frontend/components/helpers/clipboard.ts src/frontend/components/helpers/dropActions.ts src/frontend/components/helpers/history.ts src/frontend/components/helpers/historyHelpers.ts src/frontend/components/helpers/output.ts src/frontend/components/helpers/showActions.ts src/frontend/components/helpers/shows.ts src/frontend/components/main/popups/localization/translation.ts src/frontend/components/output/preview/SpotifyManager.ts src/frontend/components/quicksearch/quicksearch.ts src/frontend/components/quicksearch/searchHighlight.ts --format json
npx eslint -c config/linting/eslint.frontend.json --ext .js,.ts src/frontend/components/show/formatTextEditor.ts src/frontend/components/slide/views/websiteDomPool.ts src/frontend/components/stage/stage.ts src/frontend/components/system/textbox.ts src/frontend/components/timeline/TimelineActions.ts src/frontend/converters/powerpoint/PowerPointHelper.ts src/frontend/converters/songbeamer.ts src/frontend/show/slides.ts src/frontend/utils/cloudSync.ts src/frontend/utils/drive.ts src/frontend/utils/obsTalk.ts --format json
```

The four T3/T4 ESLint JSON files, stderr files, and independent exit files are preserved outside the repository under `/private/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/phase1-01-09/` (`t3-pre/post.*`, `t4-pre/post.*`). Both pre/post target-rule listings were re-read from those JSON artifacts; no `await-thenable` findings occur in either batch. ESLint exits remain nonzero for unrelated existing errors, not for the target findings resolved here.

No final production build, fresh full `svelte-check`, full lint/test suite, formatter, autofix, snapshot update, or output pixel gate was run. Those belong to plan 01-04. No task used `--fix`; no auth gate occurred.

## Decisions Made

- Kept production-build and checker warning inventories separate. S7's 15 frontend locations match by path-line-tag key; seven server diagnostics have no pinned-checker coverage.
- Preserved all baseline-matched T3/T4 diagnostics, including generic assertion sites; only current-only target findings were eligible for change.
- Used explicit equivalent callback/return annotations for translation and PowerPoint results rather than depending on altered generic inference.
- Left all async behavior unchanged; prior T1/T2 await findings remain for plan 01-04's final parity decision.

## Deviations from Plan

None — task order, assigned paths, exact compiler inventories, non-mutating lint commands, and per-task commits followed the plan. No autofix, warning suppression, unrelated source edit, or test/config/CI change occurred.

## Issues Encountered

- The Svelte diagnostic identifies the opening tag while some changed `/>` tokens are on later lines (`Website.svelte`, `Snaplines.svelte`, and two `TimelineEasing.svelte` tags). The hunk map records both coordinates rather than treating the diagnostic line as the physical hunk line.
- The assigned ESLint commands exit 1 before and after due other findings in the assigned files. Their JSON and exit status were captured independently; no unrelated lint cleanup was attempted.
- The continuation handoff omitted the source execution start timestamp. This summary does not invent a full-plan duration; the source commit timestamps and continuation start are recorded above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Next approved plan: 01-04, final parity gate.** This plan is complete; do not start plan 01-04 or 01-05 from this execution.
- Four current-only async-semantics findings remain: `src/electron/cloud/drive.ts:209:9`, `src/electron/data/import.ts:24:9` and `:36:9`, and `src/frontend/components/drawer/bible/scripture.ts:160:50`. Preserve `Promise.all` scheduling/rejection behavior and `for await` iterator-close behavior unless equivalence is demonstrated.
- Three fresh checker-only diagnostics were not present in the production inventory and therefore were outside S1–S7's production-assigned paths: `src/frontend/components/drawer/info/EffectsInfo.svelte:4:1 <div>` and `src/frontend/components/drawer/info/OverlayInfo.svelte:14:5, 54:13 <div>`. Keep these visible and reconcile them in the final checker/build inventory; do not project a final warning count.
- No post-S7 production build or full checker was run. The post-S6 `2174 FILES / 144 ERRORS / 152 WARNINGS` result is intermediate only; plan 01-04 must capture fresh final inventories and run the output pixel gate without updating the baseline.
- The seven production-only server diagnostics are normalized, but the pinned checker remains frontend-scoped; this is a pre-existing coverage boundary, not proof of server type-checking.

---
*Phase: 01-toolchain-gate*
*Completed: 2026-10-18*
