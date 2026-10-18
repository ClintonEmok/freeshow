---
phase: 01-toolchain-gate
plan: 08
subsystem: infra/testing
tags: [svelte5, svelte-check, eslint, typescript-eslint, element_invalid_self_closing_tag, no-unnecessary-type-assertion, await-thenable, parity]

# Dependency graph
requires:
  - phase: 01-toolchain-gate
    provides: "01-06 fresh pinned checker and pre-remediation production warning inventories, plus the narrow authorization for diagnostic-only normalization"
  - phase: 01-toolchain-gate
    provides: "01-07 S3/S4 normalization and durable baseline/current target-lint differential"
provides:
  - "S5/S6 normalization of 49 exact compiler-diagnosed non-void sites across 24 assigned Svelte files"
  - "Individual classification of all 17 target-rule occurrences in the 12 assigned T2 TypeScript files; 11 safe current-only assertions resolved"
  - "One current-only scripture Promise.all await retained as an explicit parity blocker"
affects: [01-09, 01-04-final-parity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Keep production-build and checker warning locations separate; authorize hunks by matching path-line-tag keys, not merged counts or guessed columns."
    - "Preserve a generic collection result type explicitly when removing an assertion that was feeding contextual generic inference."
    - "Keep await/Promise aggregation where a synchronous-to-async transition would change observable microtask or rejection behavior."

key-files:
  created:
    - .planning/phases/01-toolchain-gate/01-08-SUMMARY.md
  modified:
    - src/frontend/components/main/ProgressPanel.svelte
    - src/frontend/components/main/Top.svelte
    - src/frontend/components/main/popups/ChooseMediaInput.svelte
    - src/frontend/components/main/popups/ManageFonts.svelte
    - src/frontend/components/media/Video.svelte
    - src/frontend/components/output/layers/BackgroundMedia.svelte
    - src/frontend/components/output/layers/PdfOutput.svelte
    - src/frontend/components/output/tools/MediaControls.svelte
    - src/frontend/components/show/AudioPreview.svelte
    - src/frontend/components/show/ProjectContentList.svelte
    - src/frontend/components/show/Projects.svelte
    - src/frontend/components/show/VideoShow.svelte
    - src/frontend/components/show/pdf/PdfPreview.svelte
    - src/frontend/components/show/tools/HighlightedNotes.svelte
    - src/frontend/components/show/tools/Notes.svelte
    - src/frontend/components/show/tools/SlideGroups.svelte
    - src/frontend/components/slide/Layouts.svelte
    - src/frontend/components/slide/Reference.svelte
    - src/frontend/components/slide/SkeletonSlide.svelte
    - src/frontend/components/slide/Slide.svelte
    - src/frontend/components/slide/views/Captions.svelte
    - src/frontend/components/slide/views/MediaItem.svelte
    - src/frontend/components/slide/views/Timer.svelte
    - src/frontend/components/slide/views/Visualizer.svelte
    - src/frontend/components/actions/apiHelper.ts
    - src/frontend/components/context/contextMenuSearch.ts
    - src/frontend/components/context/loadItems.ts
    - src/frontend/components/context/menuClick.ts
    - src/frontend/components/drawer/bible/scripture.ts
    - src/frontend/components/edit/scripts/chords.ts
    - src/frontend/components/edit/scripts/itemHelpers.ts
    - src/frontend/components/export/projectLink.ts

key-decisions:
  - "All 49 S5/S6 pre-edit path-line-tag keys agree between the two compiler inventories. Preserve the separate production/checker columns (checker is one column later at every site)."
  - "Remove only the 11 current-only T2 assertions whose runtime output and behavior are unchanged; preserve five matched findings."
  - "Leave scripture.ts:160:50 unchanged because changing Promise.all/await could alter microtask ordering and rejection timing; it remains a parity blocker."

patterns-established:
  - "Svelte warning fix: change only the diagnostic tag's `/>` token to `></tag>`, preserving the original preceding whitespace, attributes, values and surrounding content."
  - "T2 assertions are not removed merely on a rule message; compare baseline/current identity and review narrowing, public types, generic inference and emitted behavior."

# Metrics
duration: 17min
completed: 2026-10-18
---

# Phase 1 Plan 08: S5/S6 and T2 Remediation Summary

**49 inventory-authorized Svelte tags normalized across 24 files and 11 safe current-only T2 assertions resolved; one scripture Promise.all await remains an explicit parity blocker.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-10-18T09:04:16Z
- **Completed:** 2026-10-18T09:21:20Z
- **Tasks:** 3/3
- **Source files modified:** 32 (24 Svelte and 8 TypeScript)

## Accomplishments

- Reconciled S5/S6 against both inventories before editing. The production inventory authorizes 23 S5 and 26 S6 sites; the current pinned checker run reports the same 49 path-line-tag keys. Production and checker columns are preserved independently, with checker columns one greater throughout; no path or tag discrepancy was found.
- Normalized exactly 23 S5 and 26 S6 sites. Each one-line hunk changes only the tag-closing `/>` token into `></tag>`; original pre-slash whitespace, attributes, values, Svelte control-flow, siblings and component APIs remain unchanged.
- Individually reviewed all 17 current target-rule occurrences against the durable per-file baseline/current differential: five matched, zero baseline-only and 12 current-only. Removed 11 current-only assertions after proving their type/runtime behavior unchanged; retained the current-only await in `scripture.ts` because scheduling/rejection semantics were not safe to alter.
- Non-mutating assigned-path ESLint fell from 103 to 92 errors; its target-rule set fell from 17 to six (five matched findings plus the retained current-only await). The command remains exit 1 due to other assigned-file lint debt; raw JSON and independent status files are retained outside the repository.

## Task Commits

1. **Task 1: Normalize warning batch S5 (12 Svelte files)** — `a492a132` (`fix(01-08): normalize S5 Svelte tag warnings`)
2. **Task 2: Normalize warning batch S6 (12 Svelte files)** — `50500031` (`fix(01-08): normalize S6 Svelte tag warnings`)
3. **Task 3: Review and safely resolve target lint findings batch T2 (12 TypeScript files)** — `e32e8852` (`fix(01-08): resolve safe T2 lint assertions`)

**Plan metadata:** a separate documentation commit records this summary and updates `STATE.md` / `ROADMAP.md`.

## Files Created/Modified

- **S5 (23 exact sites):** `src/frontend/components/main/ProgressPanel.svelte`, `src/frontend/components/main/Top.svelte`, `src/frontend/components/main/popups/ChooseMediaInput.svelte`, `src/frontend/components/main/popups/ManageFonts.svelte`, `src/frontend/components/media/Video.svelte`, `src/frontend/components/output/layers/BackgroundMedia.svelte`, `src/frontend/components/output/layers/PdfOutput.svelte`, `src/frontend/components/output/tools/MediaControls.svelte`, `src/frontend/components/show/AudioPreview.svelte`, `src/frontend/components/show/ProjectContentList.svelte`, `src/frontend/components/show/Projects.svelte`, `src/frontend/components/show/VideoShow.svelte`.
- **S6 (26 exact sites):** `src/frontend/components/show/pdf/PdfPreview.svelte`, `src/frontend/components/show/tools/HighlightedNotes.svelte`, `src/frontend/components/show/tools/Notes.svelte`, `src/frontend/components/show/tools/SlideGroups.svelte`, `src/frontend/components/slide/Layouts.svelte`, `src/frontend/components/slide/Reference.svelte`, `src/frontend/components/slide/SkeletonSlide.svelte`, `src/frontend/components/slide/Slide.svelte`, `src/frontend/components/slide/views/Captions.svelte`, `src/frontend/components/slide/views/MediaItem.svelte`, `src/frontend/components/slide/views/Timer.svelte`, `src/frontend/components/slide/views/Visualizer.svelte`.
- **T2 (11 current-only assertions resolved):** `src/frontend/components/actions/apiHelper.ts`, `src/frontend/components/context/contextMenuSearch.ts`, `src/frontend/components/context/loadItems.ts`, `src/frontend/components/context/menuClick.ts`, `src/frontend/components/drawer/bible/scripture.ts`, `src/frontend/components/edit/scripts/chords.ts`, `src/frontend/components/edit/scripts/itemHelpers.ts`, `src/frontend/components/export/projectLink.ts`.
- **Assigned T2 files with matched findings, left unchanged:** `src/frontend/audio/effects/audioEffectsHelpers.ts`, `src/frontend/components/drawer/calendar/calendars.ts`, `src/frontend/components/drawer/calendar/event.ts`, `src/frontend/components/drawer/pages/interactions.ts`.
- No `PARITY.md`, test, lint/build configuration, warning policy, CI, or unlisted application source file changed.

## S5/S6 Diagnostic-to-Hunk Map

Locations below are **pre-edit**. Production-build and checker locations are independent evidence; the checker column is one greater at each matching site. `×N` is the number of exact source hunks, and each listed tag's only source change is `/>` → `></tag>`.

| Batch | File | Production locations | Checker locations | Exact tag hunk(s) |
|---|---|---|---|---|
| S5 | `components/main/ProgressPanel.svelte` | 87:28, 109:28 | 87:29, 109:29 | `<div>` ×2 |
| S5 | `components/main/Top.svelte` | 100:12, 155:12 | 100:13, 155:13 | `<div>` ×2 |
| S5 | `components/main/popups/ChooseMediaInput.svelte` | 71:12 | 71:13 | `<div>` ×1 |
| S5 | `components/main/popups/ManageFonts.svelte` | 164:22 | 164:23 | `<div>` ×1 |
| S5 | `components/media/Video.svelte` | 233:8, 241:8 | 233:9, 241:9 | `<video>` ×2 |
| S5 | `components/output/layers/BackgroundMedia.svelte` | 55:74 | 55:75 | `<div>` ×1 |
| S5 | `components/output/layers/PdfOutput.svelte` | 80:8 | 80:9 | `<canvas>` ×1 |
| S5 | `components/output/tools/MediaControls.svelte` | 119:16, 123:16, 142:16 | 119:17, 123:17, 142:17 | `<div>` ×3 |
| S5 | `components/show/AudioPreview.svelte` | 166:4 | 166:5 | `<canvas>` ×1 |
| S5 | `components/show/ProjectContentList.svelte` | 477:12, 494:12 | 477:13, 494:13 | `<div>` ×2 |
| S5 | `components/show/Projects.svelte` | 539:20, 545:20, 556:24 | 539:21, 545:21, 556:25 | `<div>` ×3 |
| S5 | `components/show/VideoShow.svelte` | 371:20, 382:20 (`<video>`); 421:16, 459:16 (`<div>`) | 371:21, 382:21 (`<video>`); 421:17, 459:17 (`<div>`) | `<video>` ×2; `<div>` ×2 |
| S6 | `components/show/pdf/PdfPreview.svelte` | 210:16 | 210:17 | `<canvas>` ×1 |
| S6 | `components/show/tools/HighlightedNotes.svelte` | 65:4 | 65:5 | `<textarea>` ×1 |
| S6 | `components/show/tools/Notes.svelte` | 32:4 | 32:5 | `<textarea>` ×1 |
| S6 | `components/show/tools/SlideGroups.svelte` | 132:12 | 132:13 | `<div>` ×1 |
| S6 | `components/slide/Layouts.svelte` | 144:16, 158:12 | 144:17, 158:13 | `<div>` ×2 |
| S6 | `components/slide/Reference.svelte` | 90:8, 99:8, 115:8, 126:8, 136:8 | 90:9, 99:9, 115:9, 126:9, 136:9 | `<div>` ×5 |
| S6 | `components/slide/SkeletonSlide.svelte` | 22:12, 33:8, 38:12 | 22:13, 33:9, 38:13 | `<div>` ×3 |
| S6 | `components/slide/Slide.svelte` | 280:8, 289:8, 415:28, 419:20, 425:28, 429:32 | 280:9, 289:9, 415:29, 419:21, 425:29, 429:33 | `<div>` ×6 |
| S6 | `components/slide/views/Captions.svelte` | 85:12 | 85:13 | `<webview>` ×1 |
| S6 | `components/slide/views/MediaItem.svelte` | 191:16, 200:16 | 191:17, 200:17 | `<video>` ×2 |
| S6 | `components/slide/views/Timer.svelte` | 151:4, 153:4 | 151:5, 153:5 | `<div>` ×2 |
| S6 | `components/slide/views/Visualizer.svelte` | 243:0 | 243:1 | `<canvas>` ×1 |

**Inventory disposition:** production = 23 S5 + 26 S6; checker = 23 S5 + 26 S6. All 49 path-line-tag keys match. The one-column offset is retained rather than normalized away. The current pre-edit pinned checker inspected the original tag at each current location; no stale or guessed site was edited. There is no inventory mismatch.

## T2 Finding-by-Finding Classification and Disposition

Classification is against the durable normalized per-file differential in `PARITY.md`. Each diagnostic occurrence is listed individually. Five findings are matched; there are no baseline-only findings within T2; 12 findings were current-only. Of the current-only findings, 11 assertions were resolved and one await remains blocking.

| File / pre-edit location | Rule and class | Evidence and disposition |
|---|---|---|
| `audio/effects/audioEffectsHelpers.ts:143:45` | `no-unnecessary-type-assertion` — **matched** | Retained. `EffectKey` aliases `EffectType`; the baseline/current match is outside the authorized current-only fix set. |
| `components/actions/apiHelper.ts:591:12` | `no-unnecessary-type-assertion` — **current-only** | **Resolved safely.** `getPlainEditorText()` returns `string`, so the object is structurally the declared `API_id_value` (`id` and `value` are strings). Added the explicit `Promise<API_id_value>` return annotation and removed the erased assertion; this preserves the exported return type and emitted object. |
| `components/context/contextMenuSearch.ts:25:23` | `no-unnecessary-type-assertion` — **current-only** | **Resolved safely.** `fakeEvent` is constructed with `new MouseEvent`; `onContextMenu` accepts `MouseEvent`. Removed only `as any`, with the same object passed at runtime. |
| `components/context/loadItems.ts:245:40` | `no-unnecessary-type-assertion` — **current-only** | **Resolved safely.** The preceding `bg && showMedia[bg]?.name` guard narrows the same `name` value; removed only the erased non-null assertion. |
| `components/context/menuClick.ts:2469:62` | `no-unnecessary-type-assertion` — **current-only** | **Resolved safely.** `activePage` is `TopViews`, a subset of `HistoryPages`, the `History.location.page` type accepted by `history`. Removed `as any`; no argument, property, call order, or emitted value changed. |
| `components/drawer/bible/scripture.ts:160:50` | `await-thenable` — **current-only** | **Retained blocker.** `Book.getChapter()` is typed as a synchronous chapter value and the array is passed through `Promise.all`. Removing/replacing the await/aggregation could change the async function's microtask boundary and rejection/timing behavior. No equivalent scheduling-preserving change was established. |
| `components/drawer/bible/scripture.ts:192:71` | `no-unnecessary-type-assertion` — **current-only** | **Resolved safely.** The null-default path assigns `selectedVerses` to an array and the following non-empty guard narrows it; `clone<T>` returns its input type. Removed only the erased `!`. |
| `components/drawer/bible/scripture.ts:1060:33` (assertion through 1064:41) | `no-unnecessary-type-assertion` — **matched** | Retained. The generic `.map` tuple assertion is a baseline/current match and can affect contextual result typing; not part of the authorized fix set. |
| `components/drawer/bible/scripture.ts:1416:102` | `no-unnecessary-type-assertion` — **current-only** | **Resolved safely.** The same condition checks `slides[slideIndex][itemIndex].lines` before `.push`; removed only the non-null assertion, with unchanged guard and call. |
| `components/drawer/calendar/calendars.ts:200:72` | `no-unnecessary-type-assertion` — **matched** | Retained. The `.find` generic/result assertion is a baseline/current match; no type-inference change attempted. |
| `components/drawer/calendar/event.ts:76:43` | `no-unnecessary-type-assertion` — **matched** | Retained. The recurrence-key assertion is a baseline/current match and remains unchanged. |
| `components/drawer/pages/interactions.ts:704:31` | `no-unnecessary-type-assertion` — **matched** | Retained. The generic `.map` result assertion is a baseline/current match; no contextual typing change attempted. |
| `components/edit/scripts/chords.ts:18:5` (assertion at line 19) | `no-unnecessary-type-assertion` — **current-only** | **Resolved safely.** The preceding guard initializes `newLines[line].chords` before sorting; removed only `!`, preserving the same sort and iteration. |
| `components/edit/scripts/chords.ts:24:5` | `no-unnecessary-type-assertion` — **current-only** | **Resolved safely.** Same initialized `chords` property; removed only `!` before the unchanged `push`. |
| `components/edit/scripts/itemHelpers.ts:198:21` | `no-unnecessary-type-assertion` — **current-only** | **Resolved safely.** `Array.isArray(editSlide?.items)` returns from the function unless the optional slide/items access is present and an array; removed only the erased `!`. |
| `components/export/projectLink.ts:107:12` (outer assertion ends line 143) | `no-unnecessary-type-assertion` — **current-only** | **Resolved safely.** The outer `as LinkSlideItems` fed generic inference to `Array.map`. Replaced it with explicit `map<LinkSlideItems[number]>`, preserving the exact union element/result type and callback context, then removed the assertion. The generic argument is erased and `Array.map` overload/JS behavior is unchanged. |
| `components/export/projectLink.ts:132:20` (cast ends line 136) | `no-unnecessary-type-assertion` — **current-only** | **Resolved safely.** The branch's object is accepted by the explicit map union context (`slideItems` is `any[]`, so `type`/`src` remain assignable); removed only the erased cast. Removed its now-unused `LinkSlideMediaItem` type import as a direct dependent cleanup. |

**Totals:** 17 pre-edit current target findings = 5 matched + 12 current-only; 0 baseline-only; 11 current-only assertions resolved; 1 current-only await retained as a parity blocker. The post-edit target set is exactly the five matched assertions plus the retained scripture await.

## Verification Results

| Check | Result |
|---|---|
| Pre-S5/S6 pinned `svelte-check --tsconfig config/typescript/tsconfig.svelte.json --output machine` | Exit 1, `2174 FILES / 144 ERRORS / 201 WARNINGS / 108 FILES_WITH_PROBLEMS`; all 49 assigned target diagnostics present and mapped. |
| Post-S5 checker | Exit 1, `2174 / 144 / 178 WARNINGS`; zero assigned S5 target diagnostics. |
| Post-S6 checker | Exit 1, `2174 / 144 / 152 WARNINGS`; zero assigned S6 target diagnostics. The 152 is an intermediate checker count, not the final production/checker parity result. |
| S5 exact source audit | `git diff --check 88902f7b6b68de6885aa031a9b12873643d6f956 -- [12 assigned S5 paths]` exit 0; 23 removed/added lines, each only `/>` → `></tag>`. |
| S6 exact source audit | `git diff --check 88902f7b6b68de6885aa031a9b12873643d6f956 -- [12 assigned S6 paths]` exit 0; 26 removed/added lines, each only `/>` → `></tag>`. |
| Assigned T2 ESLint, before edit | Exact plan command, no `--fix`; exit 1; 12 files / 103 errors / 0 warnings; 17 target findings. JSON and independent exit file saved. |
| Assigned T2 ESLint, after edit | Exact plan command, no `--fix`; exit 1; 12 files / 92 errors / 0 warnings; six target findings (five matched + one retained await). JSON and independent exit file saved. |
| T2 exact source audit | `git diff --check 88902f7b6b68de6885aa031a9b12873643d6f956 -- [12 assigned T2 paths]` exit 0. Only the eight plan-listed T2 source files with current-only target findings were changed. |

The exact pre/post checker outputs and exit files, plus the exact pre/post ESLint JSON, stderr and exit files, are stored outside the repository in `/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/phase1-01-08.DCmU9D/`. The pre/post ESLint invocation was exactly the plan's assigned-path command and did not use `--fix`.

No production build, full test suite, formatter, autofix, lint/config/rule/suppression change, CI edit, or out-of-scope source edit was run or made. Plan 01-04 remains responsible for the final production build, fresh final inventories, parity comparison, tests and pixel gate.

## Decisions Made

- Kept production-build locations and checker locations as separate provenance. All 49 S5/S6 path-line-tag keys match, but the original columns differ by one; neither was rewritten to imitate the other.
- Made the generic map element type explicit as `LinkSlideItems[number]` before removing the outer result assertion, preserving the result union rather than relying on a changed inference.
- Preserved the current-only `scripture.ts:160:50` await instead of removing or restructuring the `Promise.all`; no scheduling/rejection-equivalent change was proven.

## Deviations from Plan

None — scope, inventories, task order and per-task commits followed the plan. The single retained current-only await is an explicit outcome permitted by Task 3 and is carried as a final parity blocker, not a deviation.

## Issues Encountered

- An initial local source-hunk audit assumed the self-closing element ended the physical line; the inline Svelte block in `ManageFonts.svelte` has `{/if}` after the tag. The audit was corrected to compare the exact tag substring, after which all 23 S5 hunks passed. A first inventory parser also counted only the first location on grouped `Reference.svelte` rows; it was corrected to enumerate each location. Neither probe changed repository files, and the complete inventories then matched at 49 sites.
- The assigned lint command exits 1 both before and after due existing findings outside the two target rules; the exit and full JSON were captured separately as required. No attempt was made to make unrelated lint green.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- S5/S6 are complete: all 49 assigned pre-edit diagnostics are normalized, and the pinned checker reports zero self-closing-tag warnings in all 24 assigned files.
- T2 has no baseline-only findings. Five matched findings remain unchanged. Eleven current-only assertions are resolved; one current-only `await-thenable` at `src/frontend/components/drawer/bible/scripture.ts:160:50` remains a parity blocker because the Promise aggregation/await scheduling behavior cannot be safely removed by inference.
- The earlier T1 blockers remain: `src/electron/cloud/drive.ts:209:9` and `src/electron/data/import.ts:24:9`, `:36:9`. Do not alter these without proof preserving Promise/microtask and async-iterator-close semantics.
- This plan measured only scoped intermediate checker/lint results. It did not run the production build or final parity/pixel gate. **Next approved plan: 01-09.** Plan 01-04 remains blocked until all remediation batches finish and the complete final gate is run; no 01-09 or 01-04 work was started here.

---
*Phase: 01-toolchain-gate*
*Completed: 2026-10-18*
