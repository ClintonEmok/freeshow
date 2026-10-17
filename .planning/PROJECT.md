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

<!-- This milestone: Settings UX/UI revamp on a shadcn-based design system. -->

- [ ] Establish shadcn-based design-system foundations: design tokens, theming, and reusable UI primitives
- [ ] Upgrade the renderer from Svelte 3 to the Svelte version required by the chosen shadcn path (research-gated)
- [ ] Introduce Tailwind CSS alongside/replacing the current scoped-CSS approach for new UI
- [ ] Revamp the Settings surface using the new primitives (tabs, inputs, rows, lists, controls)
- [ ] Improve accessibility across Settings: keyboard navigation, focus management, contrast, touch targets
- [ ] Improve Settings information architecture and flows (not styling alone)
- [ ] Prove the component layer is extensible — documented patterns reusable by later surfaces

### Out of Scope

- App-wide revamp of all 464 components — this milestone is Settings only; other surfaces are later milestones
- Revamping the output/projector rendering path (`Output.svelte`) — live-presentation-critical, separate high-risk milestone
- Rewriting the Electron main process or IPC contract — no UI dependency
- Revamping the remote/stage/controller server apps — separate later milestone
- Changing the shadcn *library* itself / contributing upstream — use as-is

## Context

- **Repo state:** Brownfield, v1.6.7-beta.2, GPL-3.0, ChurchApps. Full codebase map in `.planning/codebase/`.
- **UI reality:** Svelte 3.59.2, 464 `.svelte` components, 351 with scoped `<style>` blocks, one global stylesheet (`public/global.css`, 161 lines), no Tailwind, no design-token system, no shared component library.
- **Settings surface:** `src/frontend/components/settings/` — `Settings.svelte`, `SettingsTabs.svelte`, `SettingsTools.svelte`, `Screens.svelte` plus 21 tab files under `tabs/` (~4,900 lines). Control primitives live in `src/frontend/components/input/` (~640 lines: `Input.svelte`, `InputRow.svelte`, `Inputs.svelte`, `DynamicList.svelte`, `Tabs.svelte`, `Title.svelte`, `List.svelte`, `HRule.svelte`, `FloatingInputs.svelte`).
- **Why Settings first:** it exercises the widest variety of controls (text, number, color, toggle, dropdown, reorderable lists, nested tabs), so it stress-tests the design system with the lowest blast radius on the live output path.
- **shadcn constraint:** shadcn-svelte requires Svelte 5 (current) or Svelte 4 (legacy line) plus Tailwind CSS and bits-ui. FreeShow on Svelte 3 means adoption is a framework-migration decision, not a drop-in. User has confirmed shadcn is the target, adopted incrementally across milestones.
- **Known debt relevant to UI work:** frontend `strict` is disabled with ~2,733 `: any` usages; god modules up to ~3,000 lines; 12 test files for ~1,013 sources; CI is manual-only with non-blocking checks. See `.planning/codebase/CONCERNS.md`.
- **Existing theming:** Settings already has a `Theme` tab and `defaultThemes.ts` — the new token layer must reconcile with, not bypass, the existing theme feature.

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
| Start with the Settings surface | Widest control variety, lowest blast radius on the live output path | — Pending |
| Defer the exact migration path (Svelte 3→5 vs 3→4 legacy shadcn) to research | Need evidence on migration cost, risk, and long-term viability before committing | — Pending |
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
*Last updated: 2026-10-17 after initialization*
