# Phase 2: Design-Token Foundation - Context

**Gathered:** 2026-10-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish a semantic token bridge driven by FreeShow's existing Theme data and wire Tailwind v4 in isolation. The acceptance test is that operators see no change: do not restyle Settings, add primitives, or alter the main/output presentation. Phase 1's cross-platform packaged-build gate remains open. The roadmap explicitly permits the pure token resolver in plan 02-01 to start during Phase 1; do not treat that exception as approval to close Phase 1 or advance the rest of Phase 2 before its dependency is met.

</domain>

<decisions>
## Implementation Decisions

### Token role mapping
- **D-01:** Derive semantic roles from the existing theme palette; do not add a second theme writer or new role-editing controls in this output-neutral phase. Map `surface` from `colors.primary`, `foreground` from `colors.text`, `border` from `colors["primary-lighter"]`, `ring` from `colors.secondary`, and `muted` from `colors["primary-darker"]`.
- **D-02:** Resolve missing palette inputs deterministically from the default theme/fallback chain; never depend on a previously written DOM value. Use a conventional red destructive token whose light/dark variant is selected from the active surface's existing `getContrast` result. Recalculate the semantic roles whenever the existing theme-update choke point runs.
- **D-03:** Use `Themes.border.radius` when a theme already supplies it; otherwise resolve radius to `4px`, a conservative value consistent with existing Settings controls. Do not expose a new radius editor in Phase 2.

### Theme mode and isolation
- **D-04:** Derive `data-theme-mode` from the active theme's `primary` surface using the existing `getContrast` helper (`#FFFFFF` foreground means dark mode; otherwise light). This follows edited colors rather than relying on theme names or a parallel mode setting.
- **D-05:** Keep legacy theme variables and their existing meanings on `document.documentElement`. Write semantic variables and `data-theme-mode` only within the `[data-ds="v2"]` Settings subtree. Do not add Tailwind Preflight, global semantic variables, a global `.dark` class, or selectors that change the output/projector window.
- **D-06:** Keep the existing Theme feature and `updateThemeValues` as the sole source and update path. The Theme tab remains responsible for user-editable legacy colors; semantic roles are derived values.

### Theme inventory discrepancy
- **D-07:** At this checkout, `src/frontend/components/settings/tabs/defaultThemes.ts` contains 11 theme records, while the Phase 2 roadmap text says 13. Cover every record dynamically from `defaultThemes`; do not invent two themes to satisfy the stale count. Keep the mismatch visible for planning/verification and reconcile the numeric wording before claiming the criterion is complete.

### the agent's Discretion
- Select implementation details and fallback order for malformed or incomplete user-created themes, provided every semantic role resolves deterministically and no theme's legacy variables change.
- Keep the theme-mode selector and semantic values framework-free and testable without Svelte or DOM dependencies.
- Establish a fresh clean-build bundle baseline before Tailwind integration. The latest recorded Phase 1 build was `bundle.js` 3,930,245 bytes and `bundle.css` 257,310 bytes; remeasure before using either as the Phase 2 baseline.
- No push, merge, or workflow dispatch is authorized. Phase 1 remains blocked on cross-platform evidence and its human checkpoint.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract and safety gates
- `.planning/ROADMAP.md` §Phase 2 — scope, success criteria, plan boundaries, bundle budget, and the 02-01 Phase 1 dependency exception.
- `.planning/REQUIREMENTS.md` §Design Tokens (`TOKN-01`–`TOKN-04`) — frozen legacy meanings, semantic roles, one Theme source, and output isolation.
- `.planning/STATE.md` — Phase 1 remains executing at the cross-platform packaged-smoke checkpoint.
- `.planning/phases/01-toolchain-gate/RELEASE-SMOKE.md` — packaged macOS evidence, local bundle sizes, Darwin-only pixel baseline, and outstanding Windows/Linux evidence.

### Existing theme and rendering implementation
- `src/frontend/components/settings/tabs/defaultThemes.ts` — built-in theme data; currently 11 records.
- `src/frontend/components/settings/tabs/Theme.svelte` — user-editable legacy palette fields and existing Theme-tab behavior.
- `src/types/Settings.ts` — `Themes` shape, including the optional `border.radius` field.
- `src/frontend/utils/updateSettings.ts` — `updateThemeValues`, the single existing theme-update choke point.
- `src/frontend/components/helpers/color.ts` — existing `getContrast` helper to reuse for theme polarity.
- `public/global.css` — legacy `:root` variables and global reset; preserve their existing meanings and output behavior.
- `src/frontend/App.svelte` — main/output window branch in the shared renderer bundle; semantic scope must remain Settings-only.
- `src/frontend/main.ts` — renderer entry point where the isolated Tailwind stylesheet is wired per the roadmap.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `defaultThemes` is the existing source of built-in themes; enumerate it rather than duplicating a list.
- `updateThemeValues` in `src/frontend/utils/updateSettings.ts` is already called for startup, theme switches, and Theme-tab edits. It is the correct delegation point for refreshing semantic values.
- `getContrast` in `src/frontend/components/helpers/color.ts` is a framework-free helper already used by FreeShow to choose contrasting text.

### Established Patterns
- Theme values are legacy CSS custom properties written on `document.documentElement`; semantic variables must be a separate, scoped layer so projector/output styles continue reading the unchanged legacy properties.
- `Themes.colors` accepts an open string-keyed color map, and `Themes.border.radius` already exists as an optional field, though the current Theme UI does not expose radius editing.
- Renderer code is shared by the editor and output windows, so a globally effective reset or new root-level style can affect live projection even if intended only for Settings.
- Pure utility modules have colocated Vitest tests; token resolution should remain independent of Svelte and DOM state.

### Integration Points
- `design/tokens.ts` and `design/roles.ts` with exhaustive theme-contract tests (plan 02-01).
- `updateThemeValues` for semantic token updates (plan 02-02), leaving its callers untouched.
- `src/frontend/main.ts` and a Settings-only `[data-ds="v2"]` root for the isolated Tailwind stylesheet (plan 02-03).
- Production IIFE CSS assertion, bundle budget, class-collision audit, and unchanged projector pixel gate (plan 02-04).

</code_context>

<specifics>
## Specific Ideas

- Preserve the existing projector comparison at `maxDiffPixels: 0`; never refresh the existing baseline to make Phase 2 pass.
- Keep all theme logic live: editing the existing primary/secondary/text colors must continue to affect their legacy reads and the corresponding semantic roles through the existing Theme path.
- Use every theme record present in `defaultThemes.ts`, including the light palettes (`light`, `sea`, `papyrus`), and report the 11-versus-13 discrepancy honestly.

</specifics>

<deferred>
## Deferred Ideas

- Restyling Settings or introducing the primitive layer — later roadmap phases.
- Adding new built-in themes solely to satisfy the stale count of 13 — not part of this phase.
- New independent semantic-role controls or a parallel theming system — conflicts with the Phase 2 boundary and TOKN-03.

</deferred>

---

*Phase: 02-Design-Token Foundation*
*Context gathered: 2026-10-23*
