---
status: verifying
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
next_action: Complete the running independent 01-04 Tasks 1–3 gate, inspect every result and update planning status only if all acceptance criteria pass.

## Evidence

- checked: Installed json-bible/index.ts and lib/api/index.ts; scripture.ts complete getActiveScripturesContent function; installed await-thenable implementation.
  found: Local getChapter returns an ordinary chapter object synchronously; API getChapter is async and returns a native promise. The inferred Book union therefore supplies a mixed sync/async array, and await-thenable rejects its non-awaitable constituent. The original aggregate await intentionally remains necessary for API loading and scheduling.
  implication: Normalize values into real promises, not casts or removed awaits; retain eager getChapter calls and immediate synchronous exception handling.
- checked: Prior probe-scripture.cjs.
  found: Its before-Promise.all event is inserted between candidate normalization and aggregation, but no corresponding user-code operation exists there.
  implication: That reported getter/event mismatch alone is not evidence of a production-observable difference. Mixed then-getter microtasks still require independent testing.

## Constraints

Keep lint rules enabled and unchanged; no suppression or misleading type assertions. Preserve result identity/order, synchronous exceptions, thenable getter/call order, rejection identity, and microtask timing. Do not edit unrelated source, tests, snapshots, baselines, or output thresholds. Plan 01-04 remains blocked until its full final gate passes; do not start 01-05 or push. Preserve existing untracked workflow files.

## Eliminated

- hypothesis: Eager Promise.resolve mapping after lookup is equivalent.
  evidence: Exact-expression probe produces 360 observable trace mismatches across 860 comparisons, including catch continuation moving past a later getter's nested microtask. No artificial event was inserted between normalization and aggregation.

## Resolution

root_cause: await-thenable now rejects the sync constituent in the local/API chapter union; removing the aggregate await would change API loading and scheduling. Eager normalization also changes per-item reaction installation order.
fix: Applied typed lazy normalization after eager lookup. Promise.all consumes each yielded native promise immediately; Promise.resolve returns it unchanged, without an additional assimilation job. This preserves each original resolution/reaction pair for ordinary intrinsic promises and thenables. Global Promise/iterator monkeypatching or overridden native-promise constructor getters are outside the installed implementation's contract.
verification: Independent retained probe passed 43 scenarios x 20 repetitions (860) in both Node and Electron. Installed-library/source-extracted probe passed 225 comparisons. Target non-mutating ESLint reports 29 existing errors and zero await findings (formerly 30/1); Prettier target check and git diff --check pass. Exact source audit maps the single new hunk to scripture.ts:160:50; all older hunks remain intact, and the fresh Svelte audit maps all 164 sites with zero discrepancies. Full final gate running. Evidence directory /private/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/scripture-await-parity/.
files_changed: [src/frontend/components/drawer/bible/scripture.ts]
