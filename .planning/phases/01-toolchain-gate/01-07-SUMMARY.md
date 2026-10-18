---
phase: 01-toolchain-gate
plan: 07
subsystem: infra/testing
tags: [svelte5, svelte-check, element_invalid_self_closing_tag, typescript-eslint, await-thenable, parity]

# Dependency graph
requires:
  - phase: 01-toolchain-gate
    provides: "Svelte 5 toolchain and authorized warning/type-lint remediation boundary"
  - phase: 01-toolchain-gate
    provides: "01-06 fresh pinned checker inventory and separate pre-remediation production inventory"
provides:
  - "S3/S4 normalization of 53 exact compiler-diagnosed non-void self-closing sites in 24 assigned Svelte files"
  - "Individual normalized baseline/current T1 disposition for all 29 unique target lint findings"
  - "17 safe current-only assertion removals; preserved four matched, five baseline-only, and three current-only async-semantics findings"
affects: [01-08, 01-09, 01-04-final-parity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Keep production-build and pinned-checker diagnostics separate, recording each inventory's own columns and authorizing hunk."
    - "Treat assertions as removable only after checking contextual typing, flow narrowing, overloads, and erased runtime output."
    - "Preserve await and for-await constructs when Promise aggregation, microtask scheduling, rejection, or iterator-close behavior may change."

key-files:
  created:
    - .planning/phases/01-toolchain-gate/01-07-SUMMARY.md
  modified:
    - "24 S3/S4 Svelte files listed in the diagnostic-to-hunk map below"
    - src/electron/contentProviders/ContentProviderRegistry.ts
    - src/electron/contentProviders/canva/CanvaContentLibrary.ts
    - src/electron/contentProviders/onStage/connect.ts
    - src/electron/data/store.ts
    - src/electron/data/zip.ts
    - src/electron/servers.ts
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "The two pre-edit inventories agree on every in-scope S3/S4 path, line, and tag (27 S3 + 26 S4); their distinct diagnostic columns are recorded rather than merged."
  - "Remove only the 17 current-only assertions whose contextual types/flow and emitted behavior are unchanged; retain matched and baseline-only debt."
  - "Leave Promise.all over synchronous values and both for-await loops unchanged because their scheduling and iterator semantics are observable; record these three current-only await findings as blockers."

# Metrics
duration: 9min
completed: 2026-10-18
---

# Phase 1 Plan 7: S3/S4 and T1 Remediation Summary

**53 inventory-authorized Svelte tags normalized and 17 proven type-only lint deltas resolved; three new async-semantics findings remain visible for final parity.**

## Performance

- **Duration:** 9 min (rounded down; start 2026-10-18T08:53:27Z)
- **Started:** 2026-10-18T08:53:27Z
- **Completed:** 2026-10-18T09:03:03Z
- **Tasks:** 3/3
- **Source files modified:** 30 (24 Svelte, 6 TypeScript)

## Accomplishments

- Normalized exactly 27 S3 and 26 S4 `element_invalid_self_closing_tag` sites in the assigned 24 Svelte files. Every production/checker path-line-tag key matched within these batches; production and checker columns remain independently recorded below. Each change replaced only the closing `/>` token with `></tag>`, leaving the original pre-slash whitespace, element name, attributes, values, and surrounding structure intact.
- Reviewed every baseline/current target-rule occurrence in the 12 assigned TypeScript files against the normalized PARITY differential. The pre-edit population was 9 baseline and 24 current occurrences: 4 matched, 5 baseline-only, and 20 current-only. Seventeen current-only assertions were removed after site-specific type/flow review. No matched or baseline-only finding was changed.
- Preserved the three current-only await findings (`drive.ts:209`, `import.ts:24`, `import.ts:36`) as blockers because a safe edit could not be established without changing scheduling or `for await` behavior. The three matched awaits in `backup.ts` were also retained.
- Re-ran the exact assigned-path ESLint commands after edits. Electron target-rule findings fell from 24 to 7 (the 4 matched findings plus the 3 retained current-only awaits); the frontend assigned file has zero current target-rule findings. Both commands still exit 1 on unrelated findings in their assigned files; no rules were disabled or weakened.

## Task Commits

1. **Task 1: Normalize warning batch S3 (12 Svelte files)** — `c7946562` (`fix(01-07): normalize S3 Svelte tag warnings`)
2. **Task 2: Normalize warning batch S4 (12 Svelte files)** — `4d63384a` (`fix(01-07): normalize S4 Svelte tag warnings`)
3. **Task 3: Review and safely resolve target lint findings batch T1 (12 TypeScript files)** — `dc7741ce` (`fix(01-07): remove behavior-neutral target assertions`)

**Plan metadata:** separate completion commit records this summary, STATE, and ROADMAP updates.

## Files Created/Modified

- S3/S4: 24 assigned Svelte files in the exact diagnostic-to-hunk map below.
- T1: `ContentProviderRegistry.ts`, `CanvaContentLibrary.ts`, `onStage/connect.ts`, `data/store.ts`, `data/zip.ts`, and `servers.ts`.
- Planning metadata: this summary, `.planning/STATE.md`, and `.planning/ROADMAP.md`.
- No `PARITY.md`, test, config, CI, or out-of-scope source file was edited.

## S3/S4 Diagnostic-to-Hunk Map

Locations are pre-edit. Each row gives `production-build location / fresh pinned checker location`. In every source hunk, the old `/>` became `></tag>`; the original space before `/` was retained where present. No discrepancy in in-scope path, line, or tag keys was found. The inventories' overall scopes remain separate: production reported 154 frontend sites plus 7 server sites; the checker reported 157 frontend sites. This plan does not claim a post-edit full checker or production total.

| Batch | File | Pre-edit diagnostic location(s): production / checker | Tag(s) and exact hunk |
|---|---|---|---|
| S3 | `src/frontend/components/drawer/media/Media.svelte` | 584:20 / 584:21 | line 584, `<div>` ×1 |
| S3 | `src/frontend/components/drawer/pages/Interactions.svelte` | 422:24 / 422:25 | line 422, `<div>` ×1 |
| S3 | `src/frontend/components/drawer/pages/InteractionsInfo.svelte` | 54:12 / 54:13 | line 54, `<div>` ×1 |
| S3 | `src/frontend/components/drawer/player/Vimeo.svelte` | 178:8 / 178:9 | line 178, `<iframe>` ×1 |
| S3 | `src/frontend/components/edit/ItemAddMenu.svelte` | 125:24 / 125:25 | line 125, `<div>` ×1 |
| S3 | `src/frontend/components/edit/editbox/Editbox.svelte` | 275:8 / 275:9 | line 275, `<div>` ×1 |
| S3 | `src/frontend/components/edit/editbox/EditboxCropping.svelte` | 214:4, 215:4, 216:4, 217:4, 219:4, 220:4, 221:4, 222:4, 224:4, 225:4, 226:4, 227:4 / corresponding lines at column 5 | those 12 lines, `<div>` ×12 |
| S3 | `src/frontend/components/edit/editbox/EditboxLines.svelte` | 757:12 / 757:13 | diagnostic opening at line 757; closing token at line 779, `<div>` ×1 |
| S3 | `src/frontend/components/edit/editors/AudioEditor.svelte` | 47:4, 48:4 / corresponding lines at column 5 | lines 47–48, `<div>` ×2 |
| S3 | `src/frontend/components/edit/editors/MediaEditor.svelte` | 71:12, 75:12 / corresponding lines at column 13 | lines 71, 75, `<div>` ×2 |
| S3 | `src/frontend/components/inputs/MaterialButton.svelte` | 121:8 / 121:9 | line 121, `<span>` ×1 |
| S3 | `src/frontend/components/inputs/MaterialCheckbox.svelte` | 37:4, 38:4, 64:4 / corresponding lines at column 5 | lines 37, 38 (`<div>`), 64 (`<span>`), ×3 |
| S4 | `src/frontend/components/inputs/MaterialColorInput.svelte` | 206:8, 213:8 / corresponding lines at column 9 | line 206 `<div>`, line 213 `<span>`, ×2 |
| S4 | `src/frontend/components/inputs/MaterialDropdown.svelte` | 282:4, 314:4 / corresponding lines at column 5 | line 282 `<div>`, line 314 `<span>`, ×2 |
| S4 | `src/frontend/components/inputs/MaterialFilePicker.svelte` | 59:4, 101:4 / corresponding lines at column 5 | line 59 `<div>`, line 101 `<span>`, ×2 |
| S4 | `src/frontend/components/inputs/MaterialFolderPicker.svelte` | 53:4, 75:4 / corresponding lines at column 5 | line 53 `<div>`, line 75 `<span>`, ×2 |
| S4 | `src/frontend/components/inputs/MaterialNumberInput.svelte` | 155:4, 176:4 / corresponding lines at column 5 | line 155 `<div>`, line 176 `<span>`, ×2 |
| S4 | `src/frontend/components/inputs/MaterialPopupButton.svelte` | 66:4, 111:4 / corresponding lines at column 5 | line 66 `<div>`, line 111 `<span>`, ×2 |
| S4 | `src/frontend/components/inputs/MaterialRadialPicker.svelte` | 154:4, 182:4 / corresponding lines at column 5 | line 154 `<div>`, line 182 `<span>`, ×2 |
| S4 | `src/frontend/components/inputs/MaterialTextInput.svelte` | 80:4, 90:4 / corresponding lines at column 5 | line 80 `<div>`, line 90 `<span>`, ×2 |
| S4 | `src/frontend/components/inputs/MaterialTextarea.svelte` | 36:4, 37:4, 39:4 / corresponding lines at column 5 | line 36 `<div>`, line 37 `<textarea>`, line 39 `<span>`, ×3 |
| S4 | `src/frontend/components/inputs/MaterialTimePicker.svelte` | 62:4, 72:4 / corresponding lines at column 5 | line 62 `<div>`, line 72 `<span>`, ×2 |
| S4 | `src/frontend/components/inputs/MaterialToggleSwitch.svelte` | 38:4, 39:4, 57:8, 60:4 / 38:5, 39:5, 57:9, 60:5 | lines 38, 39, 57 (`<div>`), 60 (`<span>`), ×4 |
| S4 | `src/frontend/components/main/Loader.svelte` | 5:0 / 5:1 | line 5, `<div>` ×1 |

**S3 total:** 27 diagnostic sites / 12 files. **S4 total:** 26 sites / 12 files. **Combined:** 53 sites / 24 unique assigned files. All 24 files passed their task's required `git diff --check 88902f7b6b68de6885aa031a9b12873643d6f956 -- [assigned paths]` command (exit 0 for S3 and S4 separately).

## T1 Finding-by-Finding Classification and Disposition

Classification refers to the normalized pre-edit baseline/current differential in `PARITY.md`. Every listed location is one individual diagnostic occurrence; grouped locations share the stated disposition and evidence.

| File and occurrence(s) | Rule | Pre-edit class | Disposition and evidence |
|---|---|---|---|
| `src/electron/cloud/drive.ts:209:9` | `await-thenable` | Current-only | **Retained blocker.** `Promise.all` receives mapped `void`/`undefined` values, but removing/replacing the aggregate/await can change its promise reactions and the async function's microtask boundary. No scheduling-preserving rewrite was proven. |
| `src/electron/contentProviders/ContentProviderRegistry.ts:83:51` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed `scope as any`; `scope` is already `string`, and the default `ContentProvider` methods accept `string` (`TScope = string`). One non-generic method signature; assertion was erased at runtime. |
| `src/electron/contentProviders/ContentProviderRegistry.ts:104:33` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed `scope as any`; the receiver is `disconnect(scope?: string)`, so the existing `string | undefined` argument is accepted. Runtime call and method selection are unchanged. |
| `src/electron/contentProviders/ContentProviderRegistry.ts:157:40` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed `scope as any`; `startupLoad` on the default provider type accepts `string`, and the original `string` scope is directly assignable. No generic/overload change or emitted runtime change. |
| `src/electron/contentProviders/canva/CanvaContentLibrary.ts:337:28` (assertion ends line 344) | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed the outer `as ContentFile`; the `.map` callback explicitly returns `ContentFile | null`, providing the same contextual result type. The assertion emitted no JavaScript. |
| `src/electron/contentProviders/canva/CanvaContentLibrary.ts:406:24` (assertion ends line 413) | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed the outer `as ContentFile`; the callback is explicitly typed `ContentFile | null` and the following predicate narrows the mapped results. No change to URL, metadata, map inference, or emitted code. |
| `src/electron/contentProviders/onStage/connect.ts:310:35` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed `as NonNullable<OnStageAuthData>`; the preceding `err || !data?.access_token` guard establishes non-null `data`, and `{ ...data, scope }` satisfies `saveTokens`'s parameter. Type-only assertion; object spread is unchanged. |
| `src/electron/data/backup.ts:24:13` | `await-thenable` | Matched | **Retained.** `syncStores` currently returns `void`; removing this await would remove its async callback yield. It is a normalized baseline match and stays unchanged. |
| `src/electron/data/backup.ts:30:9` | `await-thenable` | Matched | **Retained.** The synchronous `syncStores("MEDIA")` call is intentionally awaited in the established flow; preserve its microtask boundary. |
| `src/electron/data/backup.ts:34:9` | `await-thenable` | Matched | **Retained.** The synchronous `syncStores("SETTINGS")` call is intentionally awaited in the established flow; preserve its microtask boundary. |
| `src/electron/data/import.ts:24:9` | `await-thenable` | Current-only | **Retained blocker.** `files` is `string[]`, but `for await` adapts a sync iterator and awaits each yielded value. Replacing it with `for...of` changes async iteration/microtask and abrupt-completion/iterator-close semantics; no safe rewrite was proven. |
| `src/electron/data/import.ts:36:9` | `await-thenable` | Current-only | **Retained blocker.** Same `string[]`/AsyncFromSyncIterator behavior in the Word import path; preserve iteration, extraction ordering, and iterator closing. |
| `src/electron/data/store.ts:215:21` | `no-unnecessary-type-assertion` | Matched | **Retained.** `id as keyof typeof storeFilesData` is an exact normalized baseline match; it is outside the authorized current-only fix set. |
| `src/electron/data/store.ts:222:16` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed the non-null assertion after the `_store[storeId]` falsy guard. ESLint confirms it does not change the expression's type; `!` is erased and the property read/try-catch remain identical. |
| `src/electron/data/zip.ts:134:26` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed `as any`; `{ lazyEntries, decodeStrings }` satisfies `yauzl.Options`. The three-argument call selects the same options-plus-callback overload; values and callback are unchanged. |
| `src/electron/data/zip.ts:274:30` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Same options object and sole matching three-argument `yauzl.open` overload as line 134; no runtime or callback type change. |
| `src/electron/ndi/NdiSender.ts:114:27` | `no-unnecessary-type-assertion` | Baseline-only | **Retained.** Current differential has no finding here; do not change a baseline-only assertion. |
| `src/electron/omt/OmtSender.ts:125:27` | `no-unnecessary-type-assertion` | Baseline-only | **Retained.** Current differential has no finding here; do not change a baseline-only assertion. |
| `src/electron/servers.ts:124:9` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed the non-null `!`; it has no runtime output and lint confirms no type change. The same indexed property write remains. |
| `src/electron/servers.ts:125:38` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed only the non-null `!`; port guard, indexed assignment, order, and property access remain unchanged. |
| `src/electron/servers.ts:127:9` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed only the non-null `!`; data assignment and fallback are byte-for-byte otherwise unchanged. |
| `src/electron/servers.ts:129:9` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed only the non-null `!` before `.server`; same `listen` call and argument order. |
| `src/electron/servers.ts:129:36` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed only the non-null `!` before `.port`; same port read and same `listen` overload. |
| `src/electron/servers.ts:130:9` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** Removed only the non-null `!` before `.server`; same `once("error", …)` registration and callback. |
| `src/electron/servers.ts:163:9` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** After the existing optional-server guard, removed only the erased `!`; same `io.close()` call and ordering. |
| `src/electron/servers.ts:165:9` | `no-unnecessary-type-assertion` | Current-only | **Resolved safely.** After the same guard, removed only the erased `!`; same connection-map reset and ordering. |
| `src/frontend/IPC/responsesMain.ts:619:57` | `no-unnecessary-type-assertion` | Baseline-only | **Retained.** No current target-rule diagnostic; left the `data!` argument untouched. |
| `src/frontend/IPC/responsesMain.ts:620:60` | `no-unnecessary-type-assertion` | Baseline-only | **Retained.** No current target-rule diagnostic; left the `data!` argument untouched. |
| `src/frontend/IPC/responsesMain.ts:621:64` | `no-unnecessary-type-assertion` | Baseline-only | **Retained.** No current target-rule diagnostic; left the `data!` argument untouched. |

**Classification totals:** 4 matched (3 backup awaits + store line 215); 5 baseline-only (NDI, OMT, and three IPC arguments); 20 current-only (17 assertions resolved safely, 3 async findings retained as blockers). There were no unresolved mappings and no other disposition was inferred from aggregate counts.

## Verification Results

| Check | Result |
|---|---|
| S3 assigned-path `git diff --check 88902f7b6b68de6885aa031a9b12873643d6f956 -- …` | Exit 0 |
| S4 assigned-path `git diff --check 88902f7b6b68de6885aa031a9b12873643d6f956 -- …` | Exit 0 |
| T1 assigned-path `git diff --check 88902f7b6b68de6885aa031a9b12873643d6f956 -- …` | Exit 0 |
| Exact Electron assigned-path ESLint, before edits | Exit 1; 11 files, 41 total findings, 24 target-rule findings |
| Exact frontend assigned-path ESLint, before edits | Exit 1; 1 file, 2 unrelated findings, 0 target-rule findings |
| Exact Electron assigned-path ESLint, after edits | Exit 1; 11 files, 24 total findings, 7 target-rule findings (4 matched + 3 current-only blockers) |
| Exact frontend assigned-path ESLint, after edits | Exit 1; 1 file, 2 unrelated findings, 0 target-rule findings |

ESLint JSON and independent exit-code files were saved outside the repository under `/private/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/phase1-01-07/` (`electron-eslint[.post].json/.exit`, `frontend-eslint[.post].json/.exit`). Commands had no `--fix`. No full checker or production build was run; fresh full inventories belong to final parity plan 01-04 after 01-08/01-09.

## Decisions Made

- Kept each inventory's production/checker location separately. In-scope keys matched exactly, but columns differ by one; global production/checker totals and reachability remain distinct.
- Removed only the 17 individually reviewed current-only assertions. TypeScript-only assertions erase from runtime output; contextual return types, receiver signatures, flow guards, and `yauzl.open` overload selection were checked per site.
- Did not remove any await/for-await finding. The three current-only cases cannot be altered without a plausible change to Promise-all reaction/microtask ordering or async-from-sync iteration/iterator-close behavior. They remain visible final-parity blockers.

## Deviations from Plan

None — task scope, inventory authorization, and task order were followed exactly. The three retained current-only await findings are explicit blockers allowed by the plan, not scope deviations.

## Issues Encountered

- The first S3 edit helper safely refused the multiline `EditboxLines.svelte` site because its `/>` token is on the closing line (line 779), not the diagnostic opening line (757). The site was inspected with numbered source and then normalized only at its captured closing token; no incorrect edit was made.
- The first lint-capture shell attempt used zsh's read-only `status` variable and terminated before recording exit files. Both exact commands were rerun using `rc`; pre-edit JSON and exit statuses were independently saved. No source or project file was affected by the failed capture.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- S3/S4 are complete and committed. T1's 17 safely removable assertions are resolved and individually mapped.
- Final parity still has three current-only async-semantics findings: `src/electron/cloud/drive.ts:209:9` and `src/electron/data/import.ts:24:9`, `:36:9`. Preserve these until a behavior-preserving resolution is demonstrated; do not remove awaits or convert the loops by assumption.
- The 01-06 post-S1/S2 checker count was 120 target warnings. This plan normalized 53 additional exact source sites, but did not run a post-edit checker/build; do not report a measured new total.
- Ready for approved plan 01-08, then 01-09; final parity plan 01-04 runs only after all remediation batches. No subsequent plan was started here.

---
*Phase: 01-toolchain-gate*
*Completed: 2026-10-18*
