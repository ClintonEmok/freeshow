---
status: awaiting_human_verify
updated: "2026-10-19"
trigger: "Continue investigating a behavior-preserving fix for the remaining await-thenable finding without weakening or suppressing the lint rule."
---

## Symptoms

expected: Preserve scripture chapter loading behavior and satisfy the existing enabled await-thenable rule.
actual: scripture.ts:160:50 exceeds the frontend baseline by one finding.
reproduction: Run non-mutating frontend ESLint on scripture.ts.
timeline: Toolchain migration; previous eager Promise.resolve mapping probe reported thenable-order differences.

## Current Focus

hypothesis: Eager lookup followed by a synchronous generator yielding Promise.resolve(chapter) preserves per-item assimilation/reaction interleaving; eager normalization may reorder microtasks.
test: Compare exact expressions without instrumentation between normalization and aggregation, with mixed native promises and then-getter microtasks.
next_action: Commit final evidence/status, report all self-verified checks, and await real-workflow scripture confirmation without starting 01-05.

reasoning_checkpoint:
  recorded_at: Wrap-up expansion; hypothesis and confirming evidence were recorded pre-fix, but this full structured block was not.
  hypothesis: The new aggregator rule rejects the sync/API return union; eager normalization changes reaction timing because it resolves later items before earlier reactions are installed.
  confirming_evidence: Installed local/API implementations and compiler union inspection; 360 eager trace mismatches versus 860 lazy matches per runtime; target lint finding disappears without rule edits.
  falsification_test: Any lazy/original observable trace, identity, rejection or completion mismatch in the independent probes, or a new-hunk type error, disproves the candidate.
  fix_rationale: Materialize lookups before aggregation and interleave each normalization with its aggregate reaction; actual native promises satisfy the enabled rule.
  blind_spots: Global Promise/iterator monkeypatches and overridden constructor getters are outside the installed implementation's contract; packaged cross-OS workflows are not tested here.
  candidate_causes: ["code: mixed chapter object/API promise union and eager normalization", "config: migrated await-thenable aggregator validation", "environment: non-intrinsic Promise instrumentation, not present in installed path"]
  and_gate: Yes; lint delta requires the pre-existing mixed union plus the newer aggregator validation. Eager-ordering failure additionally requires observable getter/microtask interactions.

## Evidence

- checked: Installed json-bible/index.ts and lib/api/index.ts; scripture.ts complete getActiveScripturesContent function; installed await-thenable implementation.
  found: Local getChapter returns an ordinary chapter object synchronously; API getChapter is async and returns a native promise. The inferred Book union therefore supplies a mixed sync/async array, and await-thenable rejects its non-awaitable constituent. The original aggregate await intentionally remains necessary for API loading and scheduling.
  implication: Normalize values into real promises, not casts or removed awaits; retain eager getChapter calls and immediate synchronous exception handling.
- checked: Prior probe-scripture.cjs.
  found: Its before-Promise.all event is inserted between candidate normalization and aggregation, but no corresponding user-code operation exists there.
  implication: That reported getter/event mismatch alone is not evidence of a production-observable difference. Mixed then-getter microtasks still require independent testing.

- checked: Completed independent 01-04 Tasks 1–3 rerun, retained JSON/statuses, direct original-source range comparison and output logs.
  found: Every final acceptance criterion passes; expected baseline checker/lint/Vitest debt remains visible. Both output tests actually ran and snapshot/HTML/protected paths are unchanged after cleanup.
  implication: Mark only the automated 01-04 parity plan complete; await real-workflow confirmation before archiving the debug session. Phase 1, cross-OS packaging and 01-05 are not complete.

## Constraints

Keep lint rules enabled and unchanged; no suppression or misleading type assertions. Preserve result identity/order, synchronous exceptions, thenable getter/call order, rejection identity, and microtask timing. Do not edit unrelated source, tests, snapshots, baselines, or output thresholds. Plan 01-04 remains blocked until its full final gate passes; do not start 01-05 or push. Preserve existing untracked workflow files.

## Eliminated

- hypothesis: Eager Promise.resolve mapping after lookup is equivalent.
  evidence: Exact-expression probe produces 360 observable trace mismatches across 860 comparisons, including catch continuation moving past a later getter's nested microtask. No artificial event was inserted between normalization and aggregation.

## Resolution

root_cause: await-thenable now rejects the sync constituent in the local/API chapter union; removing the aggregate await would change API loading and scheduling. Eager normalization also changes per-item reaction installation order.
fix: Applied typed lazy normalization after eager lookup. Promise.all consumes each yielded native promise immediately; Promise.resolve returns it unchanged, without an additional assimilation job. This preserves each original resolution/reaction pair for ordinary intrinsic promises and thenables. Global Promise/iterator monkeypatching or overridden native-promise constructor getters are outside the installed implementation's contract.
verification: Independent retained probe passed 43 scenarios x 20 repetitions (860) in both Node and Electron. Installed-library/source-extracted probe passed 225 comparisons. Target non-mutating ESLint reports 29 existing errors and zero await findings (formerly 30/1); Prettier target check and git diff --check pass. Exact source audit maps the single new hunk to scripture.ts:160:50; all older hunks remain intact, and the fresh Svelte audit maps all 164 sites with zero discrepancies. Full final gate PASSES all three 01-04 tasks: fresh build/assertion exit 0; checker 2174/144/134 with zero self-closing targets; Electron/frontend/Svelte/Stylelint 234/620/185/216; target awaits 3/3 and 0/0 baseline; assertions 1/3 and 23/26 with zero current-only; Vitest exactly 60 suites/181 tests/179 passed/same 2 known failures/zero skipped; exact 40-file Prettier baseline; focused tests match baseline; output 2 passed/0 skipped with retries 0 and unchanged zero-pixel threshold/snapshot. Cleanup restores clean development HTML. Original-source range differential and prior-gate comparison both pass; the previously reviewed nested output.ts lines! removal is explicitly accounted for in the retained outer text! range. Compiler inspection confirms truthful types and zero new-hunk errors. Source commit 6b9edb88. Evidence directory /private/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/scripture-await-parity/. Phase 1 remains in progress; 01-05 not started, cross-OS packaging unverified.
files_changed: [src/frontend/components/drawer/bible/scripture.ts]
oracle_type: derived ECMAScript scheduling/assimilation model plus specified enabled-lint and original-baseline contracts
guardrail_verdict: accepted
guardrail_signals:
  target_test: {result: pass, evidence: "file-backed ESLint await 1 before / 0 after; independent runtime probes match"}
  mutation_check: {result: skipped, reason: "Stryker is not installed or configured; no framework/config/repository tests added"}
  no_op_deletion: {result: pass, evidence: "same eager lookups and aggregate await remain; genuine promise normalization replaces the one finding, no branch removed"}
  adjacent_tests: {result: pass, evidence: "full original 181-test baseline and focused tests preserved; 225 actual-source/installed-library comparisons pass; no existing direct scripture unit test"}
  revert_and_reconfirm: {result: pass, bug_returned_on_revert: true, fixed_on_reapply: true, evidence: "temporarily restored only original hunk on disk: await finding returns at 160:50; reapplied identical fix: zero awaits; git diff against 6b9edb88 source exits 0"}

## Final guardrail evidence and prevention

- File-backed revert/reapply evidence: `revert-file-lint.json/.stderr/.exit`, `reapply-file-lint.json/.stderr/.exit`, `reapply-identity.raw/.exit`, `reapply-source.sha256` in the retained evidence directory. The final source SHA-256 is `5918c0fa754b365ddc81f7f17f18cbbc41c212ccd3638572704e53caa65711c6` and exactly matches the source used for the full successful gate. Earlier stdin-only attempts did not reproduce the old finding because the typed parser used the on-disk project; they were not accepted as revert proof. No production file remains reverted.
- Why not caught: the older lint rule did not validate mixed aggregator inputs, and the existing suite has no direct chapter-scheduling regression test. The full build/pixel gates do not measure thenable getter microtask ordering.
- Recurrence guard: the unchanged enabled await-thenable rule and the checked `Iterable<Promise<ChapterInstance>>` annotation prevent non-promise aggregate inputs; retained external probes and this debug record explain why normalization must stay lazy after eager lookup. No repository regression test was added under the user's fixed-test-baseline constraint. Knowledge-base append and archival remain pending human workflow confirmation.
- Causal branches: code already mixed local synchronous and API asynchronous returns; upgraded configuration exposed this through aggregator validation. A superficially simpler eager normalization resolves later thenables before earlier reactions are installed, so mixed promise/getter data exposes observable timing changes. The type refinement and retained probe protect those separate branches without weakening lint.
- MemPalace integration unavailable in this session; append the local knowledge base after human workflow confirmation, not before.
