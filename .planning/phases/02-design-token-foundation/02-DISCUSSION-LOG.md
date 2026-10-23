# Phase 2: Design-Token Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `02-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-10-23
**Phase:** 02-Design-Token Foundation
**Areas discussed:** Token role mapping

---

## Token role mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from legacy palette | Keep the existing Theme editor/source, derive semantic values from its current colors, and use deterministic fallbacks for roles absent from the palette. | ✓ |
| Add semantic controls | Add separately editable semantic roles to the Theme UI in this phase. | |

**User's choice:** “Token role mapping, fully autonomous.”
**Notes:** The user requested autonomous decisions. The selected mapping follows the existing palette and the phase's output-neutral / single-source constraints. Surface maps to `primary`, foreground to `text`, border to `primary-lighter`, ring to `secondary`, muted to `primary-darker`; destructive uses a contrast-aware red; radius honors existing `Themes.border.radius` or falls back to `4px`.

## the agent's Discretion

- Derive light/dark mode from the active theme's `primary` using the existing `getContrast` helper.
- Use deterministic defaults for incomplete custom themes without reading prior DOM values.
- Treat `defaultThemes.ts` as the live built-in inventory (11 records currently); do not create themes to satisfy the roadmap's stale count of 13.
- Keep all new variables and Tailwind behavior within `[data-ds="v2"]`; preserve legacy root variables and the projector pixel gate.

## Deferred Ideas

- New built-in themes, new Theme-tab controls for semantic roles, and all Settings visual changes remain out of scope for Phase 2.
