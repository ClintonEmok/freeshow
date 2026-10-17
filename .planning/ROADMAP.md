# Roadmap: FreeShow

## Overview

Milestone 1 puts a real design system under FreeShow's Settings surface without touching the one thing that must not break: the live output path. The renderer bundle is shared, byte for byte, between the main window and every projector output, so this milestone is sequenced as two foundation phases with output-neutral acceptance tests, three surface phases that change what an operator sees, and two closing phases that verify and document. Phase 1 moves the build platform (Svelte 5 legacy mode, Vite 8, TypeScript 5.9) with zero component-syntax rewrites. Phase 2 is where the milestone's highest-severity hazard is settled — Tailwind v4 with Preflight omitted and a token bridge that keeps legacy `--primary`/`--secondary` meanings frozen while adding a semantic namespace. Phases 3–5 restructure Settings, build the primitive layer, and swap every control. Phases 6–7 prove accessibility to WCAG 2.2 AA and publish the patterns so later surfaces can reuse them. Two phases (1 and 2) deliver no user-visible capability — that is correct for this shape of work.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Toolchain Gate** - Svelte 5 (legacy mode) + Vite 8 + TypeScript 5.9, with zero component rewrites and the output window unchanged
- [ ] **Phase 2: Design-Token Foundation** - Isolated Tailwind v4 + token bridge; acceptance test is "nothing changed"
- [ ] **Phase 3: Settings IA & Flows** - Consolidate and regroup Settings navigation; migrate tab ids without breaking deep-links or permissions
- [ ] **Phase 4: Primitive Layer** - `components/ui/**` on shadcn-svelte + Bits UI, and the `components/input/` wrappers rebuilt on it
- [ ] **Phase 5: Settings Surface Revamp** - Swap, don't restyle: the shell and all 21 tabs onto the primitives, with accessible navigation and honest states
- [ ] **Phase 6: Accessibility Hardening** - WCAG 2.2 AA verified by tooling and evidence, not assertion
- [ ] **Phase 7: Extensibility Proof & Delivery** - Component gallery, documented patterns, and the parity and localization gates closed

## Phase Details

### Phase 1: Toolchain Gate

**Goal**: The renderer builds and ships on Svelte 5 (legacy mode) + Vite 8 + TypeScript 5.9 with zero component-syntax rewrites, and packaged builds on Windows, macOS and Linux still render the output window exactly as before.
**Depends on**: Nothing (first phase)
**Requirements**: TOOL-01, TOOL-02, TOOL-03, TOOL-04
**Success Criteria** (what must be TRUE):

  1. The app launches in dev and from a packaged build with all 464 components source-unchanged — no `export let`, `$:`, `on:`, `<slot>` or `createEventDispatcher` was rewritten; only the six `new App()` → `mount()` entry sites and config files differ (TOOL-01)
  2. Output-window render gate: a projector output window renders pixel-identically to the pre-upgrade baseline at 1920×1080, captured with `TYPE=output` before and after the upgrade (TOOL-04)
  3. A production build emits exactly one CSS asset renamed to `bundle.css`, `public/index.html` references an existing non-empty `bundle.js` and `bundle.css`, and the `postBuild.js` / `cleanBuilds.js` literal string contracts hold without throwing `"Dev script path changed!"` (TOOL-02)
  4. `svelte-check`, the Svelte ESLint plugin and Vitest all run and report no new errors or failures versus the pre-upgrade baseline — no existing check was dropped or silently converted to non-blocking (TOOL-03)
  5. Release smoke checklist green on packaged Windows, macOS and Linux artifacts: launch app, open Settings, open an output, play a song, import a file — with `better-sqlite3`, `@discordjs/opus` and `osr-capture` loading on each platform (TOOL-04)

**Plans**: 5 plans

Plans:
**Wave 1**

- [ ] 01-01: Freeze the toolchain, pin the `svelte-check` baseline command, record all five pre-upgrade baselines, and stand up the output-window pixel-diff gate with a committed 1920x1080 baseline — all *before* any dependency change

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02: Pre-bump hardening — `cssFileName` + API-agnostic `assetFileNames` on both library-mode configs, `scripts/assertBuildOutput.js` wired into `postbuild`, `terser` declared, and the Svelte lint job migrated to `eslint-plugin-svelte@3` flat config with `svelte/valid-compile` kept alive

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-03: The atomic toolchain swap — `svelte@5`, `@sveltejs/vite-plugin-svelte@7`, `vite@8`, `typescript@5.9`, `@tsconfig/svelte@5`, `svelte-check@4` and `vitest@4` in one install; `mount()` at the six entry sites; `vitePreprocess()`; the `a11y_` code rename; the tsconfig pins; the eight type-only import fixes

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 01-04: Post-upgrade parity — `svelte-check`, all four lint jobs, Vitest, Prettier and the check inventory measured against the recorded baselines; the source-unchanged, entry-site, build-contract and pixel gates re-run; every new finding driven to zero

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-05: Cross-OS packaged validation — packaging exercised on all three platforms in `build.yml`, the Linux virtual screen widened to 1920x1080, a smoke spec that proves the operator flow and exercises `better-sqlite3`/`@discordjs/opus`/`osr-capture` for real, and the executed release smoke checklist

**Decomposition note (deviation from the original four-plan sketch, forced by the dependency graph):**
The original 01-02/01-03 split ("Vite first, still on Svelte 3" then "Svelte 5") is not achievable. Verified against the npm registry while planning: `@sveltejs/vite-plugin-svelte@7.1.2` peers `vite ^8.0.0` **and** `svelte ^5.46.4`; plugin 6 peers `svelte ^5.0.0`; plugins 4 and 5 require Svelte 5; and plugin `2.5.3` is the last Svelte-3-capable release. Separately, `svelte-check@4.7.7` peers `typescript ^5 || ^6` while `svelte-check@2.10.3` peers `svelte ^3.24.0`, so no `svelte-check` release supports Svelte 5 with TypeScript 4.9 — and dropping it would lose a check TOOL-03 forbids losing. `vitest@4.1.12` peers `vite ^6 || ^7 || ^8`. The Svelte/Vite/TypeScript/`svelte-check`/Vitest quintuple is therefore one atomic install landing in 01-03. The inverse is also true and was exploited: the Svelte **lint** migration (`eslint-plugin-svelte@3.23.1` peers `svelte ^3.37 || ^4 || ^5`; `typescript-eslint@8.71.2` peers `typescript >=4.8.4 <6.1.0`) is version-independent, so it moves *earlier*, into 01-02, which also removes `eslint-plugin-svelte3`'s `svelte ^3.2.0` peer before the Svelte 5 install.

### Phase 2: Design-Token Foundation

**Goal**: A semantic token namespace exists, driven by the existing theme system, with Tailwind v4 wired in isolation — and nothing an operator sees changes.
**Depends on**: Phase 1
**Requirements**: TOKN-01, TOKN-02, TOKN-03, TOKN-04
**Bundle budget**: Establish the `bundle.js` / `bundle.css` baseline and an explicit per-phase budget here. The renderer is a single library-mode IIFE bundle with no code splitting, loaded by every output window, so every byte reaches the live-presentation path and each later phase measures its delta against this baseline.
**Success Criteria** (what must be TRUE):

  1. Nothing changed: the main window and a projector output window render pixel-identically to the Phase 1 baseline at 1920×1080 after Tailwind is introduced — no Preflight reset, no new `:root` token and no `.dark` class reaches either window (TOKN-04)
  2. Production-build CSS emission proof: a library-mode IIFE build emits `bundle.css` containing a known Tailwind utility class and the `@theme inline` mapping, and inspection of the built CSS records exactly which variables (if any) land on `:root` and confirms they change nothing in an output window (TOKN-04, TOKN-02)
  3. Switching to each of the 13 built-in themes — including the light ones (`light`, `sea`, `papyrus`) — updates the semantic tokens live, and every semantic role (surface, border, ring, muted, foreground, destructive, radius) resolves for every theme, including roles the current themes do not define (TOKN-02, TOKN-03)
  4. The existing Theme tab remains the single source of truth: editing a theme colour changes both legacy `var(--primary)`/`var(--secondary)` reads and the semantic tokens, with no second theming system and no parallel token writer (TOKN-01, TOKN-03)
  5. Legacy token names keep their existing meanings — every `var(--primary)`, `var(--secondary)`, `var(--accent)` and `var(--text)` read across the existing styled components resolves to the same colour as before the change (TOKN-01)

**Plans**: 4 plans

Plans:

- [ ] 02-01: `design/tokens.ts` + `design/roles.ts` + `tokens.test.ts` — pure, framework-free token bridge resolving every role for all 13 built-in themes, reusing the existing contrast helper (unblocked by Phase 1; may start during it)
- [ ] 02-02: `design/applyTheme.ts` + `updateThemeValues` delegating at its single choke point (all 8 call sites untouched); legacy variables stay on `documentElement`, semantic variables written to the `[data-ds="v2"]` root only
- [ ] 02-03: Tailwind v4 in isolation — `@layer theme, base, components, utilities` with `theme.css`/`utilities.css` only (no Preflight), `@custom-variant dark` derived from `data-theme-mode`, `@theme inline` bridge, `@source` bounded to `src/frontend`, CSS imported from `main.ts`; stylelint allow/ignore pass; Tailwind/Oxide kept in devDependencies with lockfile and CI validation
- [ ] 02-04: Production CSS-emission proof under the Vite library-mode IIFE build plus build-output assertion; bundle budget baseline; output-window pixel-diff gate; token contract document (role / source / user-editable); class-name collision audit

### Phase 3: Settings IA & Flows

**Goal**: Settings has a documented, consolidated information architecture with clearer flows, and every existing entry point still lands on the right screen — structurally, with no styling change yet.
**Depends on**: Phase 2
**Requirements**: IA-01, IA-02, IA-03, IA-04
**Bundle budget**: Structural change only — net bundle delta is reported against the Phase 2 budget and must be negligible (moved and merged tab files, no new runtime dependencies).
**Success Criteria** (what must be TRUE):

  1. Settings presents the consolidated top-level tab structure with at most one sub-level, and every existing location is still reachable — no setting became unreachable after consolidation (IA-01)
  2. Saved profile permissions, translation keys (`settings.{tabId}`) and deep-link/`activePage` navigation all land on the correct screen after the tab-id changes; the redirect/alias table covers every old id (IA-03)
  3. The hidden "global output options" toggle is gone, replaced by a documented, discoverable pattern (IA-02)
  4. Every button in Settings performs the action its label states — the audited list of misleading and nonsensical buttons and layouts is corrected (IA-04)

**Plans**: 3 plans

Plans:

- [ ] 03-01: Inventory every tab-id consumer (`activePage`/`activePopup`, keyboard shortcuts, API/action-driven navigation, locale files, saved profile permission records) and build the redirect/alias table from the inventory
- [ ] 03-02: Consolidate and regroup top-level tabs; remove the hidden global-output-options toggle; adopt one documented sub-tab pattern (max one level); add label + group + keyword metadata for a future search index
- [ ] 03-03: Migrate locale keys, profile permission keys and saved profile data; verify deep-links, shortcuts and API-driven navigation; correct the misleading buttons and layouts from the audit

### Phase 4: Primitive Layer

**Goal**: A repo-owned primitive layer exists under `components/ui/**` and the `components/input/` wrappers are rebuilt on it, so all 21 Settings tabs inherit new controls without per-tab rewrites.
**Depends on**: Phase 1, Phase 2, Phase 3
**Requirements**: PRIM-01, PRIM-02, PRIM-03
**Bundle budget**: The primitive layer ships inside the shared IIFE bundle, so per-component imports only (no barrel) and the `bundle.js`/`bundle.css` delta is recorded against the Phase 2 budget; a material delta triggers a decision on dynamically importing the Settings surface.
**Success Criteria** (what must be TRUE):

  1. A shared primitive layer exists under `components/ui/**`, built on shadcn-svelte + Bits UI, vendored per-component and owned by the repo (PRIM-01)
  2. All 21 Settings tabs consume the rebuilt `components/input/` wrappers and inherit the new controls with no per-tab rewrite (PRIM-02)
  3. Migrated controls are replacements, not restyles: no Tailwind utility is layered onto a legacy scoped-CSS element, and the legacy markup plus its `<style>` block are deleted in the same commit (PRIM-03)
  4. One pilot Settings tab is migrated end-to-end on the primitives, with the legacy↔runes interop boundary documented (callback props, not `bind:`/`on:`) and the input-propagation test written before the wrapper conversion
  5. The bundle delta is measured against the Phase 2 budget and nothing in the new layer mounts into an output window — Bits UI portals are scoped into the Settings subtree, and focus and text selection work in the frameless macOS and Windows windows

**Plans**: 4 plans

Plans:

- [ ] 04-01: Vendor the Settings subset from shadcn-svelte (button, input, label, select, switch, checkbox, radio-group, tabs, separator, scroll-area, dialog/popover/tooltip, collapsible) with the `cn()` helper, **pinning an explicit shadcn-svelte registry version — never `@latest`** (the registry adds components frequently); settle the icon-system fork; reformat generated files through the project Prettier config
- [ ] 04-02: Electron-window and accessibility conventions — focus-visible treatment compatible with the existing negative `outline-offset`, target-size token, `.ds-selectable` scope, portal targets inside `[data-ds="v2"]`; legacy↔runes interop spike; security boundary (sanitizer for any HTML-rendering primitive, theme-value validation, never mount into weak-isolation windows)
- [ ] 04-03: Rebuild the nine `components/input/` wrappers on the primitives, writing the input-propagation test first; track `bundle.js`/`bundle.css` deltas
- [ ] 04-04: Pilot Settings tab migrated end-to-end; verify each primitive in frameless windows on macOS and Windows; record the per-file swap recipe that Phase 5 executes

### Phase 5: Settings Surface Revamp

**Goal**: The Settings shell and all 21 tabs run on the new primitives with accessible navigation and honest loading/empty/error states — one file per commit, `main` shippable throughout.
**Depends on**: Phase 4
**Requirements**: NAV-01, NAV-02, NAV-03, STAT-01, STAT-02, STAT-03
**Bundle budget**: This is the largest ingestion of new UI code into the shared bundle; the cumulative delta against the Phase 2 budget is tracked per migrated file and reported at phase close.
**Success Criteria** (what must be TRUE):

  1. Settings navigation exposes tablist/tab semantics with `aria-selected` (NAV-01)
  2. Settings navigation is operable with Arrow keys plus Home/End using roving tabindex and a visible focus indicator (NAV-02)
  3. A focused control is never obscured by the sticky header — keyboard traversal to any control scrolls it fully into view (NAV-03)
  4. Every async Settings panel shows explicit loading, empty and error states rather than a blank or stale surface (STAT-01)
  5. Saved and "restart required" statuses are announced through `aria-live`, and destructive actions are guarded by a confirmation dialog (STAT-02, STAT-03)

**Plans**: 4 plans

Plans:

- [ ] 05-01: Settings shell + `SettingsTabs` + `Screens.svelte` on the primitives — tablist/tab semantics, `aria-selected`, roving tabindex, Arrow + Home/End, sticky-header focus-scroll fix; drop fixed-height rows so text can resize to 200%
- [ ] 05-02: Migrate tabs 1–8, one file per commit — including the Theme tab, so the token layer and the user-facing theming are visibly one system
- [ ] 05-03: Migrate tabs 9–16, one file per commit
- [ ] 05-04: Migrate tabs 17–21 plus the cross-cutting states — loading/empty/error panels, `aria-live` saved and restart-required status, destructive-action confirmation dialogs, per-setting `defaultValue` indicators

### Phase 6: Accessibility Hardening

**Goal**: Settings passes WCAG 2.2 AA, verified by tooling and recorded evidence rather than assertion.
**Depends on**: Phase 5
**Requirements**: A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, A11Y-06, A11Y-07, A11Y-08
**Bundle budget**: Verification, tooling and lint work only — the shipped bundle delta against the Phase 2 budget is expected to be zero; the axe-core dependency stays in devDependencies.
**Success Criteria** (what must be TRUE):

  1. Every Settings control exposes an accessible name, role and state (checked/selected/expanded/disabled), and every Settings control is keyboard-operable — including reorderable lists through a non-drag alternative (A11Y-01, A11Y-03)
  2. A single visible focus treatment ≥3:1 contrast is defined, all 15 `outline: none` overrides are removed, and focus is never obscured by the sticky header (A11Y-02)
  3. Interactive targets are ≥24×24 CSS px (or adequately spaced), Settings reflows without 2-D scrolling at narrow window widths (the audio-routing graph excepted), and text resizes to 200% without clipping or loss of function (A11Y-04, A11Y-06, A11Y-07)
  4. Text contrast ≥4.5:1 and non-text contrast ≥3:1 hold in the default theme and every user theme, verified by an automated audit against all 13 built-in themes in `defaultThemes.ts` (A11Y-05)
  5. axe-core runs in the existing test harness with no violations on the Settings surface, and Svelte a11y lint is re-enabled for the design-system layer (A11Y-08)

**Plans**: 4 plans

Plans:

- [ ] 06-01: Enable the gates — axe-core in the existing Vitest/Playwright harness, and Svelte a11y lint re-enabled (currently off in the ESLint Svelte config and the Vite `onwarn` hook), scoped to the DS layer
- [ ] 06-02: Focus and naming pass — single visible focus treatment, remove all 15 `outline: none` overrides, auditable name/role/state coverage for every Settings control
- [ ] 06-03: Keyboard operability for the custom controls — non-drag reorder for `DynamicList`, a keyboard path for the audio-routing graph (2.5.7); target-size audit
- [ ] 06-04: Contrast audit across all 13 built-in themes plus user themes; reflow and 200%-resize verification; on-device screen-reader spot check (verified on-device, not by inference)

### Phase 7: Extensibility Proof & Delivery

**Goal**: The component layer is proven reusable, and the milestone's contracts — parity and localization — are verified and documented.
**Depends on**: Phase 6
**Requirements**: DOCS-01, SAFE-01, SAFE-02
**Bundle budget**: Documentation and verification only; the gallery is a development surface and its code must not ship in the renderer bundle (or its delta is reported against the Phase 2 budget if it does).
**Success Criteria** (what must be TRUE):

  1. A one-page component/pattern gallery documents every primitive, its states and its accessibility notes (DOCS-01)
  2. The Settings parity checklist confirms no change to the store/IPC contract and that a setting can still be read and written as before (SAFE-01)
  3. No hard-coded English remains in Settings — every user-facing string routes through `T`/`translateText` (SAFE-02)
  4. The migration recipe and an ADR recording the `@theme inline` bridge and the deliberate deviation from vanilla shadcn are published, and the still-unproven parts are stated honestly, including whether a second consumer outside Settings exists

**Plans**: 3 plans

Plans:

- [ ] 07-01: Component/pattern gallery page — primitives, their states, accessibility notes, and the migration recipe for the next surface
- [ ] 07-02: Settings parity checklist — store/IPC contract unchanged, settings read/write verified, state and destructive-action behaviours smoke-checked
- [ ] 07-03: Localization audit sweep (no hard-coded English in Settings) plus the ADR for the `@theme inline` bridge and an explicit statement of the second-consumer/extensibility judgement

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Toolchain Gate | 0/5 | Not started | - |
| 2. Design-Token Foundation | 0/4 | Not started | - |
| 3. Settings IA & Flows | 0/3 | Not started | - |
| 4. Primitive Layer | 0/4 | Not started | - |
| 5. Settings Surface Revamp | 0/4 | Not started | - |
| 6. Accessibility Hardening | 0/4 | Not started | - |
| 7. Extensibility Proof & Delivery | 0/3 | Not started | - |
