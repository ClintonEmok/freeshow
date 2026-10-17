# Requirements: FreeShow

**Defined:** 2026-10-17
**Core Value:** The show must not fail — during a live service the operator must get lyrics, scripture, and media onto the output displays reliably and instantly, with no visible interruption.
**Milestone:** 1 — Design-system foundation + Settings revamp (see `.planning/PROJECT.md`)

## v1 Requirements

Requirements for this milestone. Each maps to a roadmap phase. All are Settings-scoped; the output/projector rendering path must remain untouched throughout.

### Toolchain

- [ ] **TOOL-01**: Renderer runs on Svelte 5 in legacy mode with no component rewrites — only mount sites and config change
- [ ] **TOOL-02**: Renderer builds on Vite 7 (not 8) preserving the IIFE library bundle shared by the main window and every output window
- [ ] **TOOL-03**: TypeScript 5.9, svelte-check, the Svelte ESLint plugin, and Vitest are upgraded together with no loss of existing checks
- [ ] **TOOL-04**: Packaged artifacts still build and run on Windows, macOS, and Linux, and the output window renders identically to before

### Design Tokens

- [ ] **TOKN-01**: Legacy token names (`--primary`, `--secondary`, `--accent`, `--text`) keep their existing meanings across all existing components
- [ ] **TOKN-02**: A semantic token namespace (surface, border, ring, muted, foreground, destructive, radius) exists and is derived from the active theme, including roles the current themes do not define
- [ ] **TOKN-03**: The existing Theme feature (`Theme.svelte` + `defaultThemes.ts`) drives the new semantic tokens — one source of truth, no parallel theming system
- [ ] **TOKN-04**: New CSS is isolated — no Tailwind Preflight and no new `:root` tokens reach the output/projector windows

### Primitives

- [ ] **PRIM-01**: A shared primitive layer exists under `components/ui/**` built on shadcn-svelte + Bits UI
- [ ] **PRIM-02**: The `components/input/` wrappers are rebuilt on the primitives so all 21 Settings tabs inherit the change without per-tab rewrites
- [ ] **PRIM-03**: Settings controls are replaced rather than restyled — no utility classes layered onto legacy scoped-CSS elements

### Navigation

- [ ] **NAV-01**: Top-level Settings navigation exposes tablist/tab semantics with `aria-selected`
- [ ] **NAV-02**: Settings navigation supports Arrow keys plus Home/End with roving tabindex and visible focus
- [ ] **NAV-03**: A focused control is never obscured by the sticky header

### Accessibility

- [ ] **A11Y-01**: Every Settings control exposes an accessible name, role, and state (checked/selected/expanded/disabled)
- [ ] **A11Y-02**: A single visible focus treatment is defined and the 15 `outline: none` overrides are removed
- [ ] **A11Y-03**: Every Settings control is keyboard-operable, including reorderable lists via a non-drag alternative
- [ ] **A11Y-04**: Interactive targets are ≥24×24 CSS px or adequately spaced
- [ ] **A11Y-05**: Text contrast ≥4.5:1 and non-text contrast ≥3:1 hold in both the default theme and user themes
- [ ] **A11Y-06**: Settings reflows without 2-D scrolling at narrow window widths (the audio-routing graph is an accepted exception)
- [ ] **A11Y-07**: Text resizes to 200% without clipping or loss of function
- [ ] **A11Y-08**: axe-core runs in the existing test harness and Svelte a11y lint is re-enabled

### Information Architecture

- [ ] **IA-01**: Top-level tabs are consolidated and regrouped into a documented structure with at most one sub-level
- [ ] **IA-02**: The hidden "global output options" toggle is replaced by a documented, discoverable pattern
- [ ] **IA-03**: Any tab-id change is migrated across translation keys, saved profile permissions, and deep-link state
- [ ] **IA-04**: Misleading or nonsensical buttons and layouts in Settings are corrected

### States & Feedback

- [ ] **STAT-01**: Every async Settings panel shows explicit loading, empty, and error states
- [ ] **STAT-02**: Saved and "restart required" statuses are announced via `aria-live`
- [ ] **STAT-03**: Destructive actions are guarded by a confirmation dialog

### Delivery

- [ ] **DOCS-01**: A one-page component/pattern gallery documents the primitives, their states, and accessibility notes
- [ ] **SAFE-01**: A Settings parity checklist confirms no change to the store/IPC contract and a setting can be read/written as before
- [ ] **SAFE-02**: All user-facing strings continue to route through `T`/`translateText` — no hard-coded English

## v2 Requirements

Deferred to a later release. Tracked but not in the current roadmap.

### Settings Usability

- **SEARCH-01**: Operator can find a setting via a Cmd/Ctrl+K jump-to-setting palette, filtered by profile permissions
- **LINK-01**: Operator can deep-link to a specific setting
- **RESET-01**: Operator sees a modified-from-default indicator and can reset a single setting
- **ADV-01**: A consistent "Advanced" progressive-disclosure pattern hides expert-only options
- **VALID-01**: Inline validation with actionable errors on Connection/API/Files inputs
- **PREVIEW-01**: Read-only live preview for display/output settings, kept off the critical output path

### Resilience

- **MOTION-01**: `prefers-reduced-motion` and `forced-colors` are honored across primitives

## Out of Scope

| Feature | Reason |
|---------|--------|
| Big-bang rewrite of all 464 components | Huge blast radius, touches the live output path; Settings-only strangler-fig instead |
| Visual reskin with no IA change | Fails the stated "clearer IA/flows" goal — the user explicitly reported confusing buttons and layout |
| A second, parallel theming system beside `defaultThemes.ts` | Two sources of truth; the user-facing Theme feature would silently stop affecting new UI |
| Global Apply/Save button for Settings | Fights the app's established immediate-apply + live-state model; creates stale-state bugs |
| Tabs nested deeper than the current one sub-level | Deep tab trees bury settings and collapse discoverability |
| Modals/wizards for simple settings | Slower for repeat operators; reserve Dialog for confirmations and genuine multi-step setup |
| Drag-only reordering | Violates WCAG 2.5.7 (Dragging Movements) — needs a non-drag alternative |
| Icon-only buttons without accessible names | Fails 4.1.2 / 2.5.3 |
| TypeScript `strict` burn-down (~2,733 `any`) | Enormous surface; dilutes a UI milestone — its own future effort |
| Settings telemetry/analytics | Privacy-sensitive; adds risk with no UI-revamp value |
| AI work — transcription, auto-scripture UX, model-selection UI, AI layout designer | Milestone 2, deliberately sequenced after the design system lands |
| Output/projector rendering (`Output.svelte`) redesign | Live-presentation-critical; must be protected, not redesigned |
| Remote/stage/controller server app revamp | Separate later milestone |
| Cross-surface (main shell, editor) design-system rollout | Separate later milestone by design |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOOL-01 | Phase 1 — Toolchain Gate | Pending |
| TOOL-02 | Phase 1 — Toolchain Gate | Pending |
| TOOL-03 | Phase 1 — Toolchain Gate | Pending |
| TOOL-04 | Phase 1 — Toolchain Gate | Pending |
| TOKN-01 | Phase 2 — Design-Token Foundation | Pending |
| TOKN-02 | Phase 2 — Design-Token Foundation | Pending |
| TOKN-03 | Phase 2 — Design-Token Foundation | Pending |
| TOKN-04 | Phase 2 — Design-Token Foundation | Pending |
| IA-01 | Phase 3 — Settings IA & Flows | Pending |
| IA-02 | Phase 3 — Settings IA & Flows | Pending |
| IA-03 | Phase 3 — Settings IA & Flows | Pending |
| IA-04 | Phase 3 — Settings IA & Flows | Pending |
| PRIM-01 | Phase 4 — Primitive Layer | Pending |
| PRIM-02 | Phase 4 — Primitive Layer | Pending |
| PRIM-03 | Phase 4 — Primitive Layer | Pending |
| NAV-01 | Phase 5 — Settings Surface Revamp | Pending |
| NAV-02 | Phase 5 — Settings Surface Revamp | Pending |
| NAV-03 | Phase 5 — Settings Surface Revamp | Pending |
| STAT-01 | Phase 5 — Settings Surface Revamp | Pending |
| STAT-02 | Phase 5 — Settings Surface Revamp | Pending |
| STAT-03 | Phase 5 — Settings Surface Revamp | Pending |
| A11Y-01 | Phase 6 — Accessibility Hardening | Pending |
| A11Y-02 | Phase 6 — Accessibility Hardening | Pending |
| A11Y-03 | Phase 6 — Accessibility Hardening | Pending |
| A11Y-04 | Phase 6 — Accessibility Hardening | Pending |
| A11Y-05 | Phase 6 — Accessibility Hardening | Pending |
| A11Y-06 | Phase 6 — Accessibility Hardening | Pending |
| A11Y-07 | Phase 6 — Accessibility Hardening | Pending |
| A11Y-08 | Phase 6 — Accessibility Hardening | Pending |
| DOCS-01 | Phase 7 — Extensibility Proof & Delivery | Pending |
| SAFE-01 | Phase 7 — Extensibility Proof & Delivery | Pending |
| SAFE-02 | Phase 7 — Extensibility Proof & Delivery | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

**Note on the count:** this file previously stated 33 v1 requirements. The enumerated v1 list contains **32** distinct REQ-IDs — the eight `A11Y-01`…`A11Y-08` ids contain digits and were excluded by the original tally. The v2 list (SEARCH, LINK, RESET, ADV, VALID, PREVIEW, MOTION — 7 ids) is out of scope for this milestone. Coverage above is 32/32.

---
*Requirements defined: 2026-10-17*
*Last updated: 2026-10-17 — traceability mapped to Milestone 1 roadmap phases (32/32 covered)*
