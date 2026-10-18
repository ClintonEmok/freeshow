---
phase: 01-toolchain-gate
plan: 06
subsystem: infra/testing
tags: [svelte5, svelte-check, element_invalid_self_closing_tag, legacy-mode, parity]

# Dependency graph
requires:
  - phase: 01-toolchain-gate
    provides: "Svelte 5.57.2 toolchain, pinned svelte-check command, and pre-upgrade baselines"
  - phase: 01-toolchain-gate
    provides: "01-04 pre-remediation production-build warning inventory and narrow user authorization for explicit-close-tag normalization"
provides:
  - "Fresh pinned pre-remediation svelte-check inventory captured at source revision 2ee3eae0, including all 157 frontend target diagnostics"
  - "S1/S2 normalization of 37 compiler-diagnosed non-void self-closing elements across 24 assigned Svelte files"
affects: [01-07, 01-08, 01-09, 01-04-final-parity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Capture the complete pinned checker inventory and source worktree state before any source remediation."
    - "Keep checker and production-build warning scopes, totals, and locations separate; authorize each source hunk from exact pre-edit diagnostics."

key-files:
  created:
    - .planning/phases/01-toolchain-gate/01-06-SUMMARY.md
  modified:
    - .planning/phases/01-toolchain-gate/PARITY.md
    - src/frontend/ai/components/floating/AiTranscription.svelte
    - src/frontend/components/draw/Draw.svelte
    - src/frontend/components/draw/DrawSettings.svelte
    - src/frontend/components/draw/Fill.svelte
    - src/frontend/components/draw/Paint.svelte
    - src/frontend/components/draw/Particles.svelte
    - src/frontend/components/drawer/Card.svelte
    - src/frontend/components/drawer/audio/Audio.svelte
    - src/frontend/components/drawer/audio/AudioMeter.svelte
    - src/frontend/components/drawer/audio/effects/AudioCompressor.svelte
    - src/frontend/components/drawer/audio/effects/AudioDelay.svelte
    - src/frontend/components/drawer/audio/effects/AudioFilter.svelte
    - src/frontend/components/drawer/audio/effects/AudioLimiter.svelte
    - src/frontend/components/drawer/audio/effects/AudioNoiseGate.svelte
    - src/frontend/components/drawer/audio/effects/AudioReverb.svelte
    - src/frontend/components/drawer/audio/effects/AudioStereoShaper.svelte
    - src/frontend/components/drawer/bible/Scripture.svelte
    - src/frontend/components/drawer/calendar/Calendar.svelte
    - src/frontend/components/drawer/calendar/CalendarsManagement.svelte
    - src/frontend/components/drawer/live/BMDStream.svelte
    - src/frontend/components/drawer/live/Capture.svelte
    - src/frontend/components/drawer/live/Mic.svelte
    - src/frontend/components/drawer/live/NDIStream.svelte
    - src/frontend/components/drawer/live/OMTStream.svelte

key-decisions:
  - "Store the fresh checker inventory independently from the production-build inventory; do not combine their different frontend reachability/server scopes or location columns."
  - "Preserve the existing whitespace and all opening-tag attributes by changing only the self-closing `/>` token into `></tag>`."

patterns-established:
  - "Each remediation hunk is keyed by the pre-edit compiler path, line, column, and non-void tag, and is checked against the actual source before replacement."

# Metrics
duration: 14min
completed: 2026-10-18
---

# Phase 1 Plan 06: Svelte warning batches S1/S2 Summary

**Fresh pinned Svelte-check evidence now gates S1/S2: 37 exact compiler-diagnosed non-void tags were normalized across 24 files, with all other source and warning policy untouched.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-10-18T08:37:19Z
- **Completed:** 2026-10-18T08:51:32Z
- **Tasks:** 3/3
- **Files modified:** 28 (24 Svelte source files, PARITY, summary, STATE, ROADMAP)

## Accomplishments

- Captured the pinned `svelte-check` 4.7.7 inventory at source revision `2ee3eae0e169f138c977221a8f2e25f52d698901` before any application-source edit. Source status was empty. The exact invocation exited 1 and reported `2174 FILES / 144 ERRORS / 291 WARNINGS`; HINTS was not reported. `PARITY.md` now contains all 157 frontend `element_invalid_self_closing_tag` locations and non-void tags across 81 files.
- Kept the production and checker inventories separate. The pre-edit production build inventory reports 161 target warnings overall (154 frontend in 78 files plus 7 server in 6 files); the checker reports 157 frontend warnings in 81 files. In the assigned S1/S2 scope both inventories independently report the same 37 path/line/tag sites, while production columns are one less than checker columns. These are recorded as separate locations, not merged totals.
- Normalized S1's 19 sites and S2's 18 sites. Every source hunk changes only the `/>` token into `></tag>`, preserving the previous space, tag name, attributes, values, content, and sibling markup. No lint/config/test policy, warning filter, formatting, or other source path changed.
- A post-edit pinned checker run reported `2174 FILES / 144 ERRORS / 254 WARNINGS`; target warnings fell from 157 to 120, and none remained in the 24 S1/S2 files. The checker still exits 1 because the pre-existing checker errors remain; this is a scoped remediation check, not the final parity gate.

## Task Commits

1. **Task 1: Capture the fresh pinned pre-remediation checker inventory** — `a1f02b21` (`docs(01-06): capture fresh pinned svelte-check inventory`)
2. **Task 2: Normalize warning batch S1 (12 Svelte files)** — `e22971eb` (`fix(01-06): normalize S1 Svelte tag warnings`)
3. **Task 3: Normalize warning batch S2 (12 Svelte files)** — `bac88d87` (`fix(01-06): normalize S2 Svelte tag warnings`)

**Plan metadata:** the separate completion commit contains this summary and the prescribed STATE/ROADMAP tracking updates.

## Files Created/Modified

- `.planning/phases/01-toolchain-gate/PARITY.md` — source revision/status, pinned command/version/exit, fresh checker totals, warning composition, and full 157-location frontend inventory.
- S1 (19 hunks): `src/frontend/ai/components/floating/AiTranscription.svelte`; `src/frontend/components/draw/{Draw,DrawSettings,Fill,Paint,Particles}.svelte`; `src/frontend/components/drawer/Card.svelte`; `src/frontend/components/drawer/audio/{Audio,AudioMeter}.svelte`; `src/frontend/components/drawer/audio/effects/{AudioCompressor,AudioDelay,AudioFilter}.svelte`.
- S2 (18 hunks): `src/frontend/components/drawer/audio/effects/{AudioLimiter,AudioNoiseGate,AudioReverb,AudioStereoShaper}.svelte`; `src/frontend/components/drawer/bible/Scripture.svelte`; `src/frontend/components/drawer/calendar/{Calendar,CalendarsManagement}.svelte`; `src/frontend/components/drawer/live/{BMDStream,Capture,Mic,NDIStream,OMTStream}.svelte`.
- `.planning/phases/01-toolchain-gate/01-06-SUMMARY.md` — checker provenance and exact per-site source-hunk map.
- `.planning/STATE.md` and `.planning/ROADMAP.md` — current position, progress, completed-plan tracking, and the next approved plan.

## Fresh Checker Provenance and Validation

**Pre-remediation checker (Task 1):**

```text
Version command: npx svelte-check --version
Output: svelte-check, 4.7.7
Resolved package.json / package-lock.json / installed version: 4.7.7 / 4.7.7 / 4.7.7
Command: npx svelte-check --tsconfig config/typescript/tsconfig.svelte.json --output machine
Exit status: 1
Summary: COMPLETED 2174 FILES 144 ERRORS 291 WARNINGS 138 FILES_WITH_PROBLEMS
Target code: 157 element_invalid_self_closing_tag locations / 81 files
HINTS: not emitted in this checker version's machine summary
```

Complete raw output and exit status were separately saved outside the repository at:

- `/private/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/phase1-remediation.5oVIXc/svelte-check-pre-remediation.raw`
- `/private/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/phase1-remediation.5oVIXc/svelte-check-pre-remediation.exit`

The permanent, complete target location/tag inventory is in `PARITY.md`. The earlier 157-warning count is identified there as historical; the fresh run happens to produce the same target total.

**Post-S1/S2 scoped checker:** the same pinned command exited 1 and reported `2174 FILES / 144 ERRORS / 254 WARNINGS / 117 FILES_WITH_PROBLEMS`, with 120 target diagnostics overall and zero in any S1/S2 file. Raw output/status: `/private/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/phase1-remediation.5oVIXc/svelte-check-post-01-06.raw` and `.exit`. The warning decrease is exactly 37; the 144 checker errors are unchanged.

**Other required validation:** `git diff --check 88902f7b6b68de6885aa031a9b12873643d6f956 -- [assigned S1/S2 paths]` exited 0 for both batches and the combined 24 paths. The final source audit against the captured plan-start source revision found exactly 24 assigned Svelte paths and 37 one-line tag-close hunks; no other application-source path changed.

No production build, Vitest, lint, formatter, or output-pixel test was run here; those checks remain with the later final parity gate. No snapshot, test expectation, warning configuration, or lint configuration changed.

## Exact S1/S2 Diagnostic-to-Hunk Map

Locations are pre-edit. Each `Production / checker` pair preserves the column difference from the corresponding original inventories. Both inventories reported every site below with the listed tag. In every exact source hunk, the only token change is `/>` → `></tag>`; the space before the old slash and the entire opening tag/attributes remain unchanged.

| Batch | File and diagnostic location(s): production / checker | Tag(s) and exact hunk count |
|---|---|---|
| S1 | `src/frontend/ai/components/floating/AiTranscription.svelte` — 94:20 / 94:21 | `<div>` ×1 |
| S1 | `src/frontend/components/draw/Draw.svelte` — 27:8 / 27:9; 29:8 / 29:9 | `<div>` ×2 |
| S1 | `src/frontend/components/draw/DrawSettings.svelte` — 129:8 / 129:9 | `<div>` ×1 |
| S1 | `src/frontend/components/draw/Fill.svelte` — 28:0 / 28:1 | `<div>` ×1 |
| S1 | `src/frontend/components/draw/Paint.svelte` — 146:0 / 146:1 | `<canvas>` ×1 |
| S1 | `src/frontend/components/draw/Particles.svelte` — 31:4 / 31:5 | `<div>` ×1 |
| S1 | `src/frontend/components/drawer/Card.svelte` — 37:12 / 37:13; 39:12 / 39:13 | `<div>` ×2 |
| S1 | `src/frontend/components/drawer/audio/Audio.svelte` — 416:8 / 416:9; 449:8 / 449:9 | `<div>` ×2 |
| S1 | `src/frontend/components/drawer/audio/AudioMeter.svelte` — 174:20 / 174:21; 175:20 / 175:21; 176:20 / 176:21; 180:20 / 180:21 | `<div>`, `<span>`, `<div>`, `<span>` ×4 |
| S1 | `src/frontend/components/drawer/audio/effects/AudioCompressor.svelte` — 162:12 / 162:13; 168:4 / 168:5 | `<div>` ×2 |
| S1 | `src/frontend/components/drawer/audio/effects/AudioDelay.svelte` — 99:4 / 99:5 | `<div>` ×1 |
| S1 | `src/frontend/components/drawer/audio/effects/AudioFilter.svelte` — 152:4 / 152:5 | `<div>` ×1 |
| S2 | `src/frontend/components/drawer/audio/effects/AudioLimiter.svelte` — 134:12 / 134:13; 140:4 / 140:5 | `<div>` ×2 |
| S2 | `src/frontend/components/drawer/audio/effects/AudioNoiseGate.svelte` — 108:4 / 108:5 | `<div>` ×1 |
| S2 | `src/frontend/components/drawer/audio/effects/AudioReverb.svelte` — 101:4 / 101:5 | `<div>` ×1 |
| S2 | `src/frontend/components/drawer/audio/effects/AudioStereoShaper.svelte` — 105:4 / 105:5 | `<div>` ×1 |
| S2 | `src/frontend/components/drawer/bible/Scripture.svelte` — 1284:8 / 1284:9; 1291:12 / 1291:13 | `<div>` ×2 |
| S2 | `src/frontend/components/drawer/calendar/Calendar.svelte` — 239:36 / 239:37 | `<span>` ×1 |
| S2 | `src/frontend/components/drawer/calendar/CalendarsManagement.svelte` — 42:24 / 42:25 | `<span>` ×1 |
| S2 | `src/frontend/components/drawer/live/BMDStream.svelte` — 73:4 / 73:5; 77:12 / 77:13 | `<canvas>` ×2 |
| S2 | `src/frontend/components/drawer/live/Capture.svelte` — 89:12 / 89:13 | `<canvas>` ×1 |
| S2 | `src/frontend/components/drawer/live/Mic.svelte` — 105:20 / 105:21; 106:20 / 106:21 | `<div>`, `<span>` ×2 |
| S2 | `src/frontend/components/drawer/live/NDIStream.svelte` — 53:4 / 53:5; 58:12 / 58:13 | `<canvas>` ×2 |
| S2 | `src/frontend/components/drawer/live/OMTStream.svelte` — 53:4 / 53:5; 57:12 / 57:13 | `<canvas>` ×2 |

The assigned production/checker path-line-tag key sets match exactly: S1 has 19 sites and S2 has 18. No discrepancy was hidden or treated as an absent diagnostic. Each affected source line was re-read at execution time and contained the reported non-void self-closing tag before editing.

## Decisions Made

- Kept the fresh frontend checker inventory and production-build inventory distinct because they cover different file populations; their count difference is not a discrepancy to merge.
- Preserved the existing whitespace immediately before each former slash, making the minimal syntax-only transformation without running a formatter.

## Deviations from Plan

None — plan scope and task ordering were followed exactly. The plan file and `01-CONTEXT.md` were not modified.

## Issues Encountered

- A first production-log parsing probe had a malformed regular expression and a first post-check grep probe had an unbalanced expression. Both were replaced with parsed line-based checks; no source or project file was changed by either failed probe. The final inventory cross-check passed for all 37 assigned diagnostics.
- A source-wide audit against the older `88902f7` comparison point includes the already-committed `src/frontend/tsconfig.json` change from the earlier 01-04 execution. Plan-local source auditing therefore used the source revision captured before this plan's edits (`2ee3eae0`); the prescribed `git diff --check 88902f7...` was still run with only the assigned S1/S2 paths. No prior change was staged or modified here.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The fresh pre-remediation inventory is durable and S1/S2 are complete. The post-edit checker confirms all 37 assigned warnings are gone, while 120 frontend target warnings remain elsewhere and the full production build inventory has not yet been refreshed. Ready for the next approved remediation plan, `01-07` (S3/S4 + T1). Do not treat this scoped checker result as the final Phase 1 parity gate; the remaining remediation plans and final plan 01-04 still own their assigned work and checks.

---
*Phase: 01-toolchain-gate*
*Completed: 2026-10-18*
