# FreeShow

## What This Is

FreeShow is a free, open-source desktop presentation app for churches and venues. It displays song lyrics, scripture, media, and overlays on projector/second-screen outputs, and exposes browser-based remote, stage, and controller surfaces over the local network. It is built with Electron (main process) and Svelte 3 (renderer + server apps).

## Core Value

The show must not fail: during a live service the operator must be able to get lyrics, scripture, and media onto the output displays reliably and instantly, with no visible interruption.

The interface around that — settings, editors, control surfaces — must never compromise it.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from `.planning/codebase/` for this brownfield repo. -->

- ✓ Multi-window presentation output (projector / second display / `BrowserWindow` per output) — existing
- ✓ Song lyrics display with chords, transposition, and lyric search — existing
- ✓ Scripture display across multiple Bible translations — existing
- ✓ Media playback: video, audio, images, PDF, PowerPoint, YouTube/Vimeo — existing
- ✓ Show and slide editor with stage layout and overlays — existing
- ✓ Web remote control from phones/tablets over Socket.IO — existing
- ✓ Streaming/transport outputs: NDI, OMT, RTMP, WebRTC, Blackmagic DeckLink, Icecast audio — existing
- ✓ Cloud sync (Google Drive) plus import/export/backup (ZIP, thumbnails) — existing
- ✓ Settings system: tabbed surfaces, connection, profiles, themes, outputs, audio routing — existing
- ✓ Multi-language UI (translation component, locale files) — existing
- ✓ Cross-platform packaging (Windows NSIS, macOS dmg/zip notarized, Linux AppImage/deb/rpm/snap) — existing

### Active

<!-- Milestone 1 (current): design-system foundation + Settings revamp. Milestone 2: AI improvements. -->

**Milestone 1 — Design-system foundation + Settings revamp (current)**

- [ ] Upgrade the toolchain as its own phase: Svelte 3→5 (legacy mode), Vite, TypeScript 5.9, svelte-check/ESLint/Vitest — must end shippable with the output path untouched
- [ ] Introduce Tailwind CSS with isolation: no Preflight, no `:root` `@theme`, scoped so nothing leaks into output/projector windows
- [ ] Reconcile design tokens with the existing theme system — freeze legacy `--primary`/`--secondary`/`--accent` names, add a new semantic namespace, derive missing roles (border/muted/card/ring/destructive) from existing themes
- [ ] Build reusable UI primitives (`components/ui/**`) on shadcn-svelte + Bits UI, replacing the ~9 control wrappers in `src/frontend/components/input/`
- [ ] Revamp the Settings surface using the new primitives — all 21 tabs reached through the shared wrapper layer
- [ ] Improve accessibility across Settings: keyboard navigation, visible focus, accessible names/roles, contrast, target size, reflow
- [ ] Improve Settings information architecture and flows (not styling alone) — including the nonsensical/misleading buttons and layout identified by the user
- [ ] Prove the component layer is extensible, with a component gallery and documented patterns reusable by later surfaces

**Milestone 2 — AI improvements (planned, not yet scoped)**

- [ ] Polish the AI model-selection UI/UX — STT, LLM, and local model management currently feel unpolished (user's primary complaint)
- [ ] Improve the transcription pipeline (Nemotron STT) — reliability and operator experience
- [ ] Improve auto-scripture — it already exists (`src/frontend/ai/scripture/`, ~2,000 lines); raise detection accuracy and the operator flow
- [ ] Investigate and build an AI layout designer — extends the existing LLM `ChatAction` slide/template/overlay creation; feasibility research required before committing

### Out of Scope

- App-wide revamp of all 464 components in *this* milestone — beyond Settings, surfaces roll out in later milestones
- Revamping the output/projector rendering path (`Output.svelte`) — live-presentation-critical; the bundle is shared, so it must be *protected*, not redesigned
- Rewriting the Electron main process or IPC contract — no UI dependency
- Revamping the remote/stage/controller server apps — separate later milestone
- Design-system work for the AI surfaces in this milestone — deliberately sequenced after the foundation (Milestone 2)
- Changing the shadcn *library* itself / contributing upstream — use as-is

## Context

- **Repo state:** Brownfield, v1.6.7-beta.2, GPL-3.0, ChurchApps. Full codebase map in `.planning/codebase/`.
- **UI reality:** Svelte 3.59.2, 464 `.svelte` components, 351 with scoped `<style>` blocks, one global stylesheet (`public/global.css`, 161 lines), no Tailwind, no design-token system, no shared component library.
- **Settings surface:** `src/frontend/components/settings/` — `Settings.svelte`, `SettingsTabs.svelte`, `SettingsTools.svelte`, `Screens.svelte` plus 21 tab files under `tabs/` (~4,900 lines). Control primitives live in `src/frontend/components/input/` (~640 lines: `Input.svelte`, `InputRow.svelte`, `Inputs.svelte`, `DynamicList.svelte`, `Tabs.svelte`, `Title.svelte`, `List.svelte`, `HRule.svelte`, `FloatingInputs.svelte`).
- **Why Settings first:** it exercises the widest variety of controls (text, number, color, toggle, dropdown, reorderable lists, nested tabs), so it stress-tests the design system with the lowest blast radius on the live output path.
- **shadcn constraint:** shadcn-svelte requires Svelte 5 (current) or Svelte 4 (legacy line) plus Tailwind CSS and bits-ui. FreeShow on Svelte 3 means adoption is a framework-migration decision, not a drop-in. User has confirmed shadcn is the target, adopted incrementally across milestones.
- **Research findings (see `.planning/research/`):**
  - Svelte 5 **legacy mode** keeps `export let`, `$:`, `on:`, `<slot>`, `createEventDispatcher`, and `bind:` working — the repo uses none of the removed internals, so the mechanical change is ~6 `new App` → `mount()` sites plus config. The Svelte-4 legacy shadcn line is frozen (Tailwind 3, `bits-ui@0.22`) and is a dead end by construction.
  - FreeShow is **already token-based**: `updateThemeValues()` (`src/frontend/utils/updateSettings.ts:253`) writes `--primary`/`--secondary`/`--text` to `documentElement`, referenced ~1,318 times. The work is namespace reconciliation, not token introduction.
  - **Token names collide with inverted meanings** — FreeShow `--primary` is a dark surface (`#242832`); shadcn's is the brand CTA. FreeShow `--secondary` is brand pink (`#F0008C`); shadcn's is a muted surface. Overwriting unmapped would silently repaint ~600 reads across 351 components.
  - **Main and output/projector windows share `public/index.html`** (`src/electron/index.ts:265-285`), so Tailwind Preflight and `:root` `@theme` would run inside live projection. Isolation must be decided before any class is written.
  - Tailwind v4 output is `@layer`-ed while `global.css` and the 351 scoped styles are unlayered, so utilities *cannot* restyle existing elements in place. Coexistence rule: **swap, don't restyle**.
  - `updateThemeValues` is a single choke point (8 call sites) that can delegate to a framework-free `design/tokens.ts` — startable before the Svelte gate.
- **Known debt relevant to UI work:** frontend `strict` is disabled with ~2,733 `: any` usages; god modules up to ~3,000 lines; 12 test files for ~1,013 sources; CI is manual-only with non-blocking checks. See `.planning/codebase/CONCERNS.md`.
- **Existing theming:** Settings already has a `Theme` tab and `defaultThemes.ts` — the new token layer must reconcile with, not bypass, the existing theme feature.
- **Existing AI surface (Milestone 2 scope):** STT via local Nemotron (`src/electron/ai/stt/`), auto-scripture detection (~2,000 lines in `src/frontend/ai/scripture/`), an LLM chat that can already create slides/templates/overlays (`ChatAction.ts`), and 4 LLM providers. Most of Milestone 2 is improving what exists, plus one genuinely new feature (AI layout designer).

## Constraints

- **Tech stack:** Svelte 3.59.2, Electron ^37.10.3, Vite ^4.5.14, TypeScript 4.9.5 — the Svelte version is the gating constraint for shadcn.
- **Compatibility:** Must keep live-presentation reliability. The renderer bundle is shared by the main window and every output window, so bundle size and render performance directly affect output quality.
- **Cross-platform:** Windows, macOS (x64 + arm64, notarized), Linux (x64/arm64, snap). UI changes must hold on all three.
- **Native modules:** Many compiled native addons (`better-sqlite3`, `macadam`, `openmediatransport`, `sherpa-onnx-node`, `libltc-wrapper`, `@discordjs/opus`, `osr-capture`). Build-tooling changes can ripple into native rebuilds.
- **Incremental delivery:** shadcn adoption spans multiple milestones; each milestone must leave the app shippable and the output path untouched.
- **Node:** >=22.12.0; npm with `package-lock.json`.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Adopt shadcn (incrementally, across milestones) | User explicitly wants shadcn; Svelte 3 blocks direct use, so adoption is staged rather than big-bang | — Pending |
| Take the Svelte 5 path in **legacy mode**, not the Svelte 4 legacy shadcn line | Svelte 5 legacy mode collapses rewrite cost to ~6 mount sites; the Svelte 4 line is frozen (Tailwind 3, `bits-ui@0.22`) and would need three chained migrations later | — Pending |
| Freeze legacy token names; add a new semantic namespace | `--primary`/`--secondary` have inverted meanings vs. shadcn; overwriting unmapped would silently repaint ~1,318 var() reads | — Pending |
| Omit Tailwind Preflight; isolate new CSS from `:root` | Main and output/projector windows share `public/index.html`; preflight/`@theme` would reach live projection | — Pending |
| "Swap, don't restyle" — replace legacy controls with primitives | Unlayered scoped styles outrank Tailwind utilities; layering utilities on existing elements cannot work | — Pending |
| Sequence design system before AI work | Keeps new AI UI built once on the new component layer instead of rebuilt after the revamp | — Pending |
| Start with the Settings surface | Widest control variety, lowest blast radius on the live output path | — Pending |
| Keep the output/projector rendering path out of scope | Live-presentation-critical; a UI revamp must not regress it | — Pending |
| Model profile = inherit; parallel execution; standard granularity | OpenCode runtime with `resolve_model_ids: omit` in `~/.gsd/defaults.json` | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-17 after initialization and scope expansion (AI workstream added as Milestone 2)*
