# Feature Research

**Domain:** UX/UI revamp of a settings-heavy, accessibility-poor desktop application (Electron + Svelte), first surface = Settings, on an incremental shadcn-svelte adoption path
**Researched:** 2026-10-17
**Confidence:** HIGH for repo-state findings and WCAG requirements; MEDIUM-HIGH for "what a typical revamp includes" (cross-verified industry sources); MEDIUM for competitive positioning

## Scope note

This is a **revamp**, not a greenfield build. There are no new user-facing capabilities here — the feature set is the *work of changing how existing settings are structured, styled, and operated*. The categories below therefore describe **deliverables and qualities**, not new product features. Every item is framed against the three stated goals: **visual consistency**, **clearer information architecture/flows**, and **accessibility/responsiveness** — all three are in scope, so an item is only "done" if it advances all applicable goals.

Current state that grounds this file (verified):
- Settings = `Settings.svelte` (178 lines) + `SettingsTabs.svelte` (79) + `Screens.svelte` (439) + 21 files under `tabs/` (~4,900 lines). 10 top-level tabs: `general, display_settings, styles, audio, connection, files, profiles, theme, ai, other` (`src/frontend/values/tabs.ts:3`).
- Two parallel control layers exist: `src/frontend/components/input/` (9 wrapper files: `Input`, `InputRow`, `Inputs`, `DynamicList`, `Tabs`, `Title`, `List`, `HRule`, `FloatingInputs`) and `src/frontend/components/inputs/` (32 concrete Material-style components: `MaterialToggleSwitch`, `MaterialDropdown`, `MaterialCheckbox`, `MaterialTextInput`, …).
- Token system is a ~15-variable seed in `public/global.css` (`--primary`, `--primary-lighter/darker/darkest`, `--text`, `--secondary`, `--hover`, `--focus`, `--accent`, `--font-family`, `--font-size`, `--navigation-width`). No semantic tokens (no `--surface/--border/--ring/--muted/--foreground`), no light theme, no Tailwind. `* { outline-color: var(--secondary); outline-offset: -4px }` is the only global focus styling.
- 15 input components set `outline: none` (e.g. `MaterialButton.svelte:129`, `MaterialTextInput.svelte:167`, `MaterialDropdown.svelte:490`, `MaterialToggleSwitch.svelte:73`).
- Accessibility in settings/inputs is inconsistent: only ~13 `aria-*` attributes and ~17 `role=` attributes total across both control dirs. `MaterialToggleSwitch` (`role="switch" aria-checked tabindex`) and `MaterialCheckbox` (`role="checkbox"`, hidden native input) are the good patterns; `MaterialDropdown` has `role="listbox"/"option" aria-selected aria-haspopup aria-expanded`. **`SettingsTabs.svelte` has no tablist/tab semantics, no `aria-selected`, and keyboard support is ArrowUp/ArrowDown only** (`SettingsTabs.svelte:15-38`).
- Svelte a11y lint is explicitly disabled: `// disable a11y warnings (not working)` (`config/linting/eslint.svelte.js:42`). No axe/pa11y/lighthouse in tooling. Only one `prefers-reduced-motion` in the whole frontend (an AI component).
- **IA gates:** tab ids in `values/tabs.ts` are reused as translation keys (`settings.{tabId}`), as profile permission keys (`profile.access.settings?.[tabId]`, `SettingsTabs.svelte:12`), and as deep-link state (`settingsTab` store). `display_settings` includes a hidden "global output options" toggle that swaps the whole panel (`Settings.svelte:66-81`). Sub-tabs are nested one level in `display_settings/styles/profiles/theme`.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these = the revamp reads as a half-done reskin, or ships a regression. These are the non-negotiables for a "Settings revamp" milestone.

| Feature / Deliverable | Why Expected | Complexity | Notes (grounded) |
|---|---|---|---|
| **1. Design-token layer, reconciled with the existing Theme feature** | Without shared tokens there is no "visual consistency"; hard-coded colors are the root cause of drift | MEDIUM | Extend `public/global.css` seeds to semantic tokens (`--surface`, `--border`, `--ring`, `--muted`, `--foreground`, `--destructive`, `--radius`) and map shadcn-svelte's `:root`/`.dark` + `@theme inline` model. **Must not bypass** `Theme.svelte` + `defaultThemes.ts`, which override the current vars at runtime. This is the single highest-leverage item. |
| **2. One shared control primitive set replacing the two control layers** | Users read inconsistent toggles/inputs/rows as "broken"; every tab currently wires its own Material component | HIGH | Adopt shadcn-svelte primitives (Button, Input, Select, Switch, Checkbox, RadioGroup, Label/Field, Tabs, Separator, Collapsible/Accordion, Dialog, Tooltip) and re-implement the `components/input/` wrappers **on top of** them so all ~21 tabs inherit the change without per-tab rewrites. shadcn-svelte is built on Bits UI → WAI-ARIA behavior comes for free. |
| **3. Every control keyboard-operable (2.1.1, 2.1.2)** | Settings is a keyboard-first surface for operators; a mouse-only settings panel is a hard fail | MEDIUM | Fixed by (2) for standard controls; must be explicitly verified for custom ones (`InputRow` arrow toggle, `DynamicList` reorder, `MaterialColorsInput`). Verify no keyboard trap in `Dialog`/popup surfaces. |
| **4. Visible focus indicator on every interactive control (2.4.7 AA, target 2.4.13)** | 15 components currently `outline: none`; keyboard users cannot see where they are | MEDIUM | Define a single `ring`/`focus-visible` treatment from the token layer; remove the ad-hoc `outline: none` overrides. Must be ≥3:1 against adjacent colors (ties to 1.4.11). |
| **5. Focus not obscured by the sticky header (2.4.11 AA)** | `Settings.svelte` has a persistent `.title` bar with a box-shadow; scrolled-to controls can sit under it | LOW | Ensure the focused control scrolls into view clear of the header (scroll-margin / focus scrolling). Cheap, concrete, testable. |
| **6. Accessible name + role + state on every control (4.1.2, 1.3.1, 3.3.2)** | `aria-*` is near-absent; screen-reader users cannot identify fields or read current values | MEDIUM | Every `Material*` control: real `<label for>` or `aria-labelledby`, `role`, `aria-checked/selected/expanded/disabled`. Mirror the existing good pattern in `MaterialToggleSwitch.svelte:37-43`. |
| **7. Target size ≥24×24 CSS px with adequate spacing (2.5.8 AA)** | Many icon buttons and small controls are sub-24px; mis-taps especially on touch laptops | LOW–MEDIUM | Audit icon-only buttons (`MaterialButton` with icon only), `small` variants of switch/checkbox. Provide spacing alternative where a target must stay visually small. |
| **8. Text contrast ≥4.5:1, non-text contrast ≥3:1 (1.4.3, 1.4.11 AA)** | Dark theme + secondary pink accent frequently sits below threshold | MEDIUM | Validate token pairs (`--text` on `--primary*`, `--secondary` on dark). Must hold in **both** default theme and user themes — audit `defaultThemes.ts`. |
| **9. Accessible Settings navigation (2.4.3, 4.1.2)** | The primary way users move through Settings is currently a set of styled `<button>`s with ArrowUp/Down only | MEDIUM | Use shadcn Tabs/Sidebar semantics on the top-level nav: `tablist`/`tab` + `aria-selected`, roving tabindex, Arrow Up/Down **and** Home/End; keep visible focus. |
| **10. Responsive/reflow layout for a resizable window (1.4.10 AA)** | Desktop windows resize; current layout uses fixed `--padding` breakpoints only (`Settings.svelte:163-177`) | MEDIUM | Content must not require 2-D scrolling at narrow widths / 320px-equivalent. The audio-routing canvas graph is an accepted 2-D exception (like a map); surrounding controls must still reflow. |
| **11. Text resizes to 200% without loss (1.4.4 AA)** | `user-select: none` + fixed-height containers (`height: 50px` rows) clip enlarged text | MEDIUM | Replace fixed heights with min-heights / relative units where text can grow. |
| **12. Async/empty/error states are explicit (3.3.1, 4.1.3)** | Connection, Files, Outputs load remote data and can silently no-op (echo of CONCERNS: swallowed errors) | MEDIUM | Loading, empty, and error states for every async settings panel; "saved"/"restart required" status announced via `aria-live`. Precedent exists (`alertMessage`). |
| **13. Destructive actions guarded + reversible where possible** | Settings contains reset/remove/delete operations (reset audio routing, delete cloud data, remove profile/output/destination) | LOW–MEDIUM | Confirmation `Dialog` for irreversible ops; keep existing "restart required" affordance. |
| **14. Existing behavior preserved: no regressions to Settings data or the output path** | Core Value: "The show must not fail" — the revamp must not touch `Output.svelte`/rendering | MEDIUM | Settings parity checklist + a smoke test that Settings opens, and a setting can be read/written through the existing store/IPC contract unchanged. Explicitly out of scope: the projector rendering path. |
| **15. i18n preserved (all strings through `T`/`translateText`)** | 100% of current labels are key-based; a revamp that hard-codes English breaks the app's multi-language feature | LOW | Any IA relabel must add/adjust keys, not inline strings. |
| **16. Accessibility is testable, not asserted (tooling deliverable)** | The milestone claims accessibility as a goal; without automated checks it regresses immediately | LOW–MEDIUM | Wire axe-core into the existing Vitest/Playwright harness, re-enable `svelte-check`/svelte a11y lint (currently disabled at `eslint.svelte.js:42`), add a "Settings a11y" check. This is what makes items 3–8 verifiable. |

### Differentiators (Competitive Advantage)

Not expected from a minimal revamp; these are where the milestone earns trust and de-risks later surfaces.

| Feature / Deliverable | Value Proposition | Complexity | Notes |
|---|---|---|---|
| **Settings search / jump-to-setting (Cmd/Ctrl+K palette)** | With 10 tabs × dozens of controls, "I know it exists but can't find it" is the #1 settings complaint; competitors are worse here | HIGH | Depends on IA metadata (label + group + keywords per setting). Highest-value differentiator for a settings-heavy app. Can be deferred if IA is consolidated first. |
| **Deep links / contextual entry into a specific setting** | "Set up NDI", "Enable remote", "Fix audio" jump straight to the exact control — turns IA into a discoverable flow, not a maze | MEDIUM | Reuses the existing `settingsTab` store; extend to `subTab` + anchor. Natural fit with search. |
| **Per-setting "reset to default" + modified-from-default indicator** | Operators experiment and forget original values; a visible "changed" dot already exists on toggles (`defaultValue`) | MEDIUM | Generalize the `defaultValue` dot into a consistent affordance with a reset action. |
| **Consistent "Advanced" progressive disclosure pattern** | Hides expert-only options (GPU device, streaming encoders, API password) without a wizard; replaces the ad-hoc hidden global-outputs toggle | MEDIUM | Follows NN/g progressive disclosure; one documented pattern reused across tabs. |
| **Inline validation with clear, actionable errors** | Turns silent failures into guidance (directly addresses CONCERNS: swallowed errors, unauth API) | MEDIUM | Especially for Connection/API fields (ports, URL, password) and Files/cloud. |
| **Live preview panel for display/output settings** | See the effect of a setting without leaving Settings — high value for a presentation app | HIGH | Keep strictly off the live output path's critical section; read-only preview only. |
| **Accessibility as a stated, documented, tested quality** | Free from Bits UI primitives, but competitors (ProPresenter, EasyWorship) do not ship this; it is a real differentiator for volunteer operators | MEDIUM | Documented patterns + automated checks + a short a11y statement. |
| **Reduced-motion + high-contrast support (`prefers-reduced-motion`, `forced-colors`)** | Only one `prefers-reduced-motion` exists today; operators with vestibular sensitivity get a calm UI | LOW | Mostly honoring media queries in the shared primitives. |
| **Keyboard-first navigation throughout Settings** | Power users and stage operators never touch the mouse | MEDIUM | Full arrow/Home/End navigation, logical tab order, shortcut to Settings search. |
| **Component documentation / gallery ("design system page")** | Required by the milestone ("prove the layer is extensible"); a living gallery is how later surfaces (main shell, editor) adopt it safely | LOW–MEDIUM | One route/Storybook-lite page listing primitives, states, and a11y notes. |
| **Role-aware / profile-aware surfacing of settings** | The app already gates tabs per profile; making that visible and consistent improves clarity | MEDIUM | Must preserve `profile.access.settings` semantics (see dependency risk). |

### Anti-Features (Commonly Requested, Often Problematic)

Explicitly do **not** build these in this milestone. Each has a better alternative.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| **Big-bang rewrite/migration of all 464 components** | "Do it right, once" instinct | Explicitly out of scope; huge blast radius; touches the live output path; stalls shippability | Strangler-fig: replace Settings surface only, behind existing store/IPC contracts. |
| **Visual reskin with no IA change** | Cheapest path to "looks modern" | Fails the stated goal of "clearer IA/flows"; users still can't find things | Pair any restyle with the IA consolidation (table stake 9/10) in the same phase. |
| **A second, parallel theming system alongside `defaultThemes.ts`** | shadcn ships its own tokens, so "just use those" | Two sources of truth; the user-facing Theme feature silently stops affecting new UI | Map shadcn tokens *onto* the existing theme vars; one source of truth. |
| **Global "Apply/Save" button for Settings** | Feels safer/enterprise-y | Fights the app's established immediate-apply + live-state model; creates stale-state and "did it save?" bugs | Keep immediate apply; add per-setting modified/reset indicators and status messages instead. |
| **Nesting tabs deeper than the current one sub-level** | Seems like tidy categorization | Deep tab trees bury settings (NN/g); discovery collapses | Max 1 sub-level; prefer grouped sections + "Advanced" disclosure within a tab. |
| **Modals/wizards for simple settings** | Looks guided | Slower for repeat use; frequent operators live in Settings | Reserve Dialog for confirmations and genuinely multi-step setup; inline everything else. |
| **Replacing custom Material controls with bespoke new SVGs/CSS** | "shadcn doesn't look like us" | Rebuilds accessibility work Bits UI already did; recreates the drift we're removing | Use shadcn/Bits primitives as-is; theme via tokens only. |
| **Drag-only reordering (DynamicList, audio routing, tab lists)** | Natural interaction | Violates 2.5.7 Dragging Movements (AA) — no keyboard/pointer alternative | Provide move-up/down buttons or keyboard reorder alongside drag. |
| **Icon-only buttons without accessible names** | Compacts the dense settings UI | Fails 4.1.2 / 2.5.3; `data-title` tooltips alone are not accessible names | Always pair an icon button with `aria-label`/visible text; keep tooltips as enhancement (and meet 1.4.13 for them). |
| **Search that surfaces permission-gated or destructive settings to all users** | "One search finds everything" | Leaks restricted capabilities (profiles gate settings) and invites accidental destructive ops | Filter search by current profile/permissions; mark destructive results. |
| **One-off per-tab fixes instead of shared primitives** | Faster per-ticket | Guarantees inconsistency returns; later surfaces copy the mess | Fix at the `components/input/` wrapper + primitive layer so all tabs inherit. |
| **Turning on TypeScript `strict` or the full Svelte 4→5 migration as part of this milestone** | Good hygiene, tempting to bundle | Enormous surface (~2,733 `any`); dilutes the UI milestone and risks the output path | Keep scoped to what shadcn-svelte requires; schedule TS strictness as its own effort. |
| **Settings telemetry/analytics collection** | "Measure what users change" | The app already flags privacy-sensitive analytics (CONCERNS); adds risk and scope with no UI-revamp value | Validate with usability testing, not silent analytics. |

---

## Feature Dependencies

```
[1 Token layer reconciled w/ existing themes]
        └──requires──> [2 Shared control primitives]
                                └──requires──> [3 Keyboard operability]
                                └──requires──> [4 Visible focus]
                                └──requires──> [6 Names/roles/states]
                                └──requires──> [7 Target size]
                                └──requires──> [8 Contrast]
                                └──requires──> [12 Async states]
                                └──requires──> [13 Destructive guards]
                                └──enhances──> [11 Text resize / 10 Reflow]

[9 Accessible Settings navigation] ──requires──> [1 Token layer]
[9 Accessible Settings navigation] ──shares semantics with──> [2 Primitives]

[10 Reflow] ──enhances──> [9 Navigation]        (nav must collapse gracefully when narrow)
[11 Text resize] ──enhances──> [9 Navigation]

[Search / jump-to-setting] ──requires──> [IA consolidation] ──requires──> [1 Token layer]
[Deep links] ──requires──> [IA consolidation] + [9 Accessible navigation]
[Per-setting reset/indicators] ──requires──> [2 Primitives]
[Advanced progressive disclosure] ──requires──> [IA consolidation]
[Inline validation] ──requires──> [2 Primitives] + [12 Async states]
[Live preview] ──requires──> [2 Primitives] + [IA consolidation]
[Component gallery/docs] ──requires──> [1 Token layer] + [2 Primitives]
[Accessibility tooling/tests] ──verifies──> [3,4,6,7,8,10,11]
[Reduced-motion / high-contrast] ──requires──> [1 Token layer] + [2 Primitives]

[IA consolidation] ──conflicts──> [stable tab ids used by profiles/translations]
[Search] ──conflicts──> [permission gating]        (must filter by profile)
[Drag-only reorder] ──conflicts──> [2.5.7 Dragging Movements AA]
```

### Dependency Notes

- **1 → 2 → (3,4,6,7,8,12,13):** The token layer and primitives are the load-bearing items. Almost every accessibility and consistency item is "free" once the primitives are adopted because shadcn-svelte sits on Bits UI (WAI-ARIA behavior). Doing accessibility per-tab without (2) is unaffordable across 21 tabs.
- **IA consolidation is the risky dependency:** tab ids in `values/tabs.ts` are simultaneously (a) translation keys `settings.{tabId}`, (b) profile permission keys `profile.access.settings?.[tabId]` (`SettingsTabs.svelte:12`), and (c) deep-link state (`settingsTab`). Changing IA must map old→new ids, migrate saved profile permissions, update locale files, and keep deep links working. **Map the IA change before touching styling**, and treat id stability as a constraint, not an afterthought.
- **Search requires IA:** a search index is only as good as the grouping/labels it searches. Consolidating IA first (or at least finalizing the label+group metadata) is a prerequisite; this is why search is a differentiator, not a table stake.
- **Live preview enhances display/output settings but sits beside the output path:** keep it strictly read-only and off the live-presentation-critical section (Core Value).
- **Search conflicts with permission gating:** `profile.access.settings` already restricts which tabs a profile sees; search results must respect that or it leaks restricted capabilities.
- **Drag-only reorder conflicts with WCAG 2.5.7:** any reorderable list (DynamicList, audio routing, tab reordering) needs a non-drag path. This is an accessibility *and* consistency item.

---

## MVP Definition

**Minimum shippable revamp for a Settings-only first milestone.** Ruthlessly scoped: it must leave the app shippable, the output path untouched, and prove the component layer is extensible.

### Launch With (v1 — the Settings milestone)

- [ ] **Token layer reconciled with the existing Theme feature (light + dark)** — nothing else is consistent without it; must not break `defaultThemes.ts`.
- [ ] **Shared control primitives adopted and the `components/input/` wrappers rebuilt on them** — the leverage point; migrating the ~9 wrappers upgrades all 21 tabs.
- [ ] **Accessible names/roles/states on every Settings control** (4.1.2, 1.3.1, 3.3.2) — replaces near-absent `aria-*`.
- [ ] **Single visible focus treatment + focus-not-obscured** (2.4.7, 2.4.11) — remove the 15 `outline: none` overrides and protect against the sticky header.
- [ ] **Keyboard operability for the whole surface** (2.1.1, 2.1.2), including reorderables.
- [ ] **Target size (2.5.8) and contrast (1.4.3, 1.4.11) baselines** — audited against default tokens and existing themes.
- [ ] **Accessible top-level Settings navigation** (tablist semantics, Arrow + Home/End, roving tabindex, `aria-selected`).
- [ ] **IA consolidation**: reduce/regroup top-level tabs, remove the hidden "global output options" toggle, adopt one documented sub-tab pattern (max 1 level), with old→new id migration for profiles/translations.
- [ ] **Reflow + text-resize resilience** (1.4.10, 1.4.4) — no fixed-height clipping, no 2-D scroll (audio graph excepted).
- [ ] **Explicit loading/empty/error + status messages** for async panels (3.3.1, 4.1.3), and destructive-action guards.
- [ ] **Accessibility test tooling**: axe-core in the existing test harness; re-enable svelte a11y lint/`svelte-check`.
- [ ] **One-page component/pattern documentation + gallery** — the "prove extensibility" deliverable for later surfaces.
- [ ] **Settings parity + regression checklist**, confirming no change to the store/IPC contract or the output path.

### Add After Validation (v1.x)

- [ ] **Settings search / jump-to-setting (Cmd/Ctrl+K)** — add once IA + metadata stabilize.
- [ ] **Deep links into a specific setting** — reuses `settingsTab`; natural follow-on to search.
- [ ] **Per-setting reset + modified-from-default indicators** — generalize the existing `defaultValue` dot.
- [ ] **Consistent "Advanced" progressive disclosure** — once tabs are consolidated.
- [ ] **Inline validation with actionable errors** — Connection/API/Files first.
- [ ] **Live preview panel for display/output settings** (read-only, off the critical output path).
- [ ] **Non-drag reorder alternative** if not shipped in v1.
- [ ] **Reduced-motion / high-contrast (`forced-colors`) support** across primitives.

### Future Consideration (v2+)

- [ ] **Undo/redo for Settings changes** — needs a history model (CONCERNS notes missing history coverage); high cost, defer.
- [ ] **Cross-surface design system** — main shell, stage/show editor (separate milestones by design).
- [ ] **Mobile web remote parity** — separate later milestone; not Settings.
- [ ] **Settings-as-API / documented deep links from docs** — only after IA is stable.
- [ ] **Frontend TypeScript `strict` burn-down** — its own effort, leverage `svelte-check` backlog.

---

## Feature Prioritization Matrix

| Feature / Deliverable | User Value | Implementation Cost | Priority |
|---|---|---|---|
| 1. Token layer reconciled w/ themes | HIGH | MEDIUM | P1 |
| 2. Shared control primitives (+`input/` wrappers) | HIGH | HIGH | P1 |
| 3. Keyboard operability | HIGH | MEDIUM | P1 |
| 4. Visible focus + focus-not-obscured | HIGH | MEDIUM | P1 |
| 6. Names/roles/states on controls | HIGH | MEDIUM | P1 |
| 7. Target size ≥24px | MEDIUM | LOW–MED | P1 |
| 8. Contrast 4.5:1 / 3:1 | HIGH | MEDIUM | P1 |
| 9. Accessible settings navigation | HIGH | MEDIUM | P1 |
| IA consolidation (incl. remove hidden toggle) | HIGH | HIGH | P1 |
| 10. Reflow (1.4.10) | MEDIUM | MEDIUM | P1 |
| 11. Text resize 200% (1.4.4) | MEDIUM | MEDIUM | P1 |
| 12. Async/empty/error + status messages | MEDIUM | MEDIUM | P1 |
| 13. Destructive-action guards | MEDIUM | LOW–MED | P1 |
| 14. Regression/parity safety | HIGH | MEDIUM | P1 |
| 15. i18n preservation | MEDIUM | LOW | P1 |
| 16. Accessibility test tooling | HIGH | LOW–MED | P1 |
| Component docs/gallery | MEDIUM | LOW–MED | P1 |
| Settings search / Cmd+K | HIGH | HIGH | P2 |
| Deep links to a setting | MEDIUM | MEDIUM | P2 |
| Per-setting reset + indicators | MEDIUM | MEDIUM | P2 |
| Advanced progressive disclosure | MEDIUM | MEDIUM | P2 |
| Inline validation | MEDIUM | MEDIUM | P2 |
| Live preview panel | MEDIUM | HIGH | P2 |
| Non-drag reorder | MEDIUM | MEDIUM | P2 |
| Reduced-motion / high-contrast | LOW–MED | LOW | P2 |
| Undo/redo for settings | MEDIUM | HIGH | P3 |
| Cross-surface design system | HIGH | HIGH | P3 (next milestone) |
| Frontend TS strict burn-down | LOW (user) | HIGH | P3 |

**Priority key:** P1 = must have for the Settings milestone · P2 = should have, add when possible · P3 = future consideration.

**Note on P1 breadth:** because the three stated goals (consistency, IA/flows, accessibility/responsiveness) are all in scope, several items that a styling-only revamp would skip (10, 11, 16) are genuinely P1 here — they are the difference between "reskin" and "revamp."

---

## Competitor Feature Analysis

| Feature | ProPresenter | EasyWorship | OpenLP | Our Approach (FreeShow) |
|---|---|---|---|---|
| Settings/preferences layout | Extensive, deep preferences; reported steep learning curve | Simplified, guided preferences for volunteers | Functional, less polished; community feedback drives changes | Consolidate to fewer top-level groups; max one sub-level; document the pattern |
| Settings search | Preference search exists but discovery remains a known pain | Minimal | Minimal | Differentiator: Cmd/Ctrl+K jump-to-setting with profile-aware filtering |
| Accessibility (keyboard/SR/contrast) | Not a marketed strength | Not a marketed strength | Not a marketed strength | Differentiator: WCAG 2.2 AA-scoped, tested, documented |
| Design system / visual consistency | Mature, proprietary | Proprietary, dated | Inconsistent (Qt) | shadcn-svelte + tokens, adopted incrementally (strangler-fig) |
| Theming | Built-in themes | Limited | Limited | Keep existing Theme feature; map tokens onto it (no parallel system) |
| Progressive disclosure of advanced options | Deep nested preferences | Simpler defaults | Mixed | One consistent "Advanced" pattern; remove hidden global-outputs toggle |
| Cross-platform parity (Win/macOS/Linux) | macOS + Windows | Windows only | Win/macOS/Linux | Win/macOS/Linux; UI changes must hold on all three |

Sources: competitor comparison guides (see Sources). Competitor specifics are MEDIUM confidence (vendor/third-party comparisons); our-approach column is grounded in the repo and this milestone's scope.

---

## Accessibility Conformance Checklist (concrete & testable)

Scoped to **WCAG 2.2 Level AA** for the Settings surface. Each row states the criterion, the concrete test, and the current gap it addresses. This list is what makes items 3–16 verifiable rather than aspirational.

| # | SC | Requirement | Concrete, testable check | Current gap (evidence) |
|---|---|---|---|---|
| A1 | 1.3.1 Info and Relationships | Labels programmatically associated with controls; groups use fieldset/legend | Every control exposes an accessible name; grouped toggles have a group label | Near-absent `aria-*` in `settings/` + `inputs/`; labels are visual only |
| A2 | 1.3.2 Meaningful Sequence | Reading order matches visual order | Screen-reader traversal order matches layout | Unverified; custom rows/`InputRow` may reorder |
| A3 | 1.4.3 Contrast (Minimum) | Text ≥4.5:1 (≥3:1 large) | Automated contrast audit of token pairs in default + user themes | Dark theme + `--secondary` pairs unverified; `defaultThemes.ts` varies |
| A4 | 1.4.4 Resize Text | 200% zoom, no loss of content/function | Zoom to 200%; no clipping in fixed `height: 50px` rows | `SettingsTabs`, `InputRow`, toggle rows use fixed heights |
| A5 | 1.4.10 Reflow | No 2-D scroll at narrow width / 320px-equivalent | Resize window narrow; content reflows (audio graph excepted) | Only fixed-breakpoint `--padding` today (`Settings.svelte:163-177`) |
| A6 | 1.4.11 Non-text Contrast | UI component borders/icons/focus ≥3:1 | Audit control borders, switch thumb/track, focus ring | `outline: none` in 15 components; custom thumb colors |
| A7 | 1.4.13 Content on Hover or Focus | Tooltips dismissable, hoverable, persistent | Tooltips (heavy `data-title` use) meet the three conditions | `data-title`-based tooltips are not dismissable/focus-managed |
| A8 | 2.1.1 Keyboard | All functionality keyboard-operable | Tab to every control; operate via Enter/Space/Arrows | Custom controls via `on:click` only (`MaterialColorsInput.svelte:84`) |
| A9 | 2.1.2 No Keyboard Trap | Focus can always leave a component | Tab out of every Dialog/popup/dropdown | Unverified for popups (`MaterialPopupButton`) |
| A10 | 2.4.3 Focus Order | Logical, predictable focus order | Tab sequence follows reading order | Unverified; nested tabs + hidden panels |
| A11 | 2.4.7 Focus Visible | Visible focus on all interactive controls | Visual check; no `outline: none` without replacement | 15 explicit `outline: none` overrides |
| A12 | 2.4.11 Focus Not Obscured (Minimum) | Focused item not entirely hidden by author content | Tab to a control scrolled under the sticky `.title` bar | `Settings.svelte` sticky header w/ box-shadow |
| A13 | 2.5.3 Label in Name | Visible label included in accessible name | Icon+text buttons: accessible name contains visible text | Icon-only buttons rely on `data-title` |
| A14 | 2.5.7 Dragging Movements | Drag has a non-drag alternative | Reorder via buttons/keyboard, not drag-only | `DynamicList` + audio routing reorder |
| A15 | 2.5.8 Target Size (Minimum) | Targets ≥24×24 or adequately spaced | Measure small/icon controls | `small` switch/checkbox variants, icon buttons |
| A16 | 3.2.2 On Input | Changing a value doesn't unexpectedly change context | Toggling a setting doesn't navigate/refresh unexpectedly | Context-change paths (e.g. `settingsTab` resets) exist |
| A17 | 3.3.1 Error Identification | Errors identified and described in text | Invalid Connection/API/Files inputs show text errors | Silent failure paths (CONCERNS: swallowed errors) |
| A18 | 3.3.2 Labels or Instructions | Labels/instructions provided | Every input has label or instruction | Visual labels not exposed to AT |
| A19 | 4.1.2 Name, Role, Value | Custom controls expose name/role/value | AT tree shows correct role + checked/selected/expanded | Good in `MaterialToggleSwitch`/`Checkbox`; missing elsewhere |
| A20 | 4.1.3 Status Messages | Status announced without focus move | "Saved"/"restart required" announced via `aria-live` | `alertMessage` exists but is not `aria-live` |

**Testing tools to include (table stake 16):** axe-core via Vitest/Playwright; `svelte-check` a11y warnings enabled (currently disabled at `eslint.svelte.js:42`); manual keyboard pass; screen-reader spot check (NVDA on Windows — Electron's accessibility support is documented but historically fragile, so verify on-device). Note: Electron/Chromium deliver the accessibility tree; the app must use real semantic elements/ARIA, not divs with `on:click`.

---

## Sources

**Repo (HIGH confidence — direct evidence):**
- `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`
- `public/global.css` (token seeds, global focus outline)
- `src/frontend/values/tabs.ts`, `src/frontend/components/settings/Settings.svelte`, `SettingsTabs.svelte`, `Screens.svelte`, `tabs/*`
- `src/frontend/components/input/*`, `src/frontend/components/inputs/*` (audited `aria-*`/`role=`/`outline: none`)
- `config/linting/eslint.svelte.js` (a11y lint disabled)

**Standards (HIGH confidence):**
- WCAG 2.2 (W3C Recommendation) — https://www.w3.org/TR/WCAG22/
- WAI "Understanding" pages: Focus Not Obscured (2.4.11), Target Size (2.5.8), Non-text Contrast (1.4.11), Reflow (1.4.10), Resize Text (1.4.4), Focus Appearance (2.4.13)
- Electron accessibility tutorial — https://www.electronjs.org/docs/latest/tutorial/accessibility
- shadcn-svelte docs (components, theming, Tailwind v4 tokens) via Context7 `/websites/shadcn-svelte`

**Industry patterns (MEDIUM-HIGH confidence, cross-verified):**
- NN/g, "Progressive Disclosure" — https://www.nngroup.com/articles/progressive-disclosure/
- Azure Architecture Center, "Strangler Fig pattern" — https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig
- Eleken, "Tabs UX best practices" (≤6 tabs → sidebar; tabs within a tab)

**Competitive (MEDIUM confidence — vendor/third-party):**
- Renewed Vision / EasyWorship comparison guides; Ruah Creative House "Church Presentation Software 2026" comparison
- OpenLP community discussion on worship-experience enhancements

---

*Feature research for: FreeShow Settings UX/UI revamp (first milestone of incremental shadcn adoption)*
*Researched: 2026-10-17*
