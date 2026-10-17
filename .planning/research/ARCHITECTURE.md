# Architecture Research

**Domain:** Design-system integration into an existing Electron + Svelte 3 desktop app (FreeShow)
**Researched:** 2026-10-17
**Confidence:** HIGH on the codebase-as-is; HIGH on shadcn-svelte/Tailwind v4 mechanics; MEDIUM on final toolchain sequencing (Vite/Svelte upgrade matrix)

> This document answers a **brownfield integration** question, not a greenfield one. FreeShow already has a working runtime token system (`--primary`, `--secondary`, … written to `document.documentElement` by `updateThemeValues`). The task is to layer a shadcn-svelte / Tailwind v4 design system on top **without** breaking 351 scoped-CSS components or the live output path. The sections below replace the template's "Standard Architecture" framing with the *actual* current state plus the target state.

---

## The Non-Obvious Finding First

**FreeShow is already token-based.** It is not "a scoped-CSS app with no design tokens." `updateThemeValues()` in `src/frontend/utils/updateSettings.ts` (line 253) writes a fixed set of CSS custom properties onto `document.documentElement` from the active user theme:

```ts
Object.entries(themeValues.colors).forEach(([key, value]) =>
    document.documentElement.style.setProperty("--" + key, value))
Object.entries(themeValues.font).forEach(([key, value]) =>
    document.documentElement.style.setProperty("--font-" + key, value))
```

`public/global.css` `:root` holds the same names as defaults. Those variables are referenced **1,318 times** across the frontend. So the real work is **not "introduce tokens"** — it is:

1. **Reconcile naming semantics** between FreeShow's variable set and shadcn's semantic set (they collide badly — see below).
2. **Add a primitive/component layer** (shadcn + Tailwind) that reads tokens, and migrate one surface at a time onto it.
3. **Do this without changing what the output windows and 351 legacy components compute.**

Everything else follows from that.

### Measured current state (from the repo)

| Metric | Value | Command evidence |
|--------|-------|------------------|
| `.svelte` components | 464 | PROJECT.md |
| Components with scoped `<style>` | 351 | `grep -rl '<style'` |
| `:global(...)` escape hatches | 489 | `grep -ro ':global('` |
| Inline `style=` attributes | 1,956 | `grep -ro 'style='` |
| `var(--…)` references | 1,318 | `grep -ro 'var(--'` |
| Top tokens used | `--primary-lighter` (226), `--secondary` (196), `--text` (176), `--primary-darker` (141), `--primary-darkest` (121), `--primary` (49), `--accent` (42) | histogram |
| Global stylesheet | `public/global.css`, 161 lines | — |
| Theme engine choke point | `updateThemeValues()` — called from 8 sites | grep |

The 489 `:global(...)` + 1,956 inline `style=` figures matter: **inline styles and `:global` selectors are where Tailwind utilities will lose specificity fights.** That constrains the coexistence strategy (see Anti-Patterns).

---

## Standard Architecture (Target)

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│  TOKEN SOURCE  (unchanged user-facing contract)                       │
│  ┌────────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │ defaultThemes  │  │ THEMES store     │  │ src/types/Settings.ts │  │
│  │ .ts (built-in) │  │ ($themes/$theme) │  │ Themes interface      │  │
│  └───────┬────────┘  └────────┬─────────┘  └───────────────────────┘  │
│          └───────────┬────────┘                                       │
├──────────────────────┼────────────────────────────────────────────────┤
│  TOKEN BRIDGE  (new — the keystone)                                   │
│  ┌───────────────────▼────────────────────────────────────────────┐  │
│  │ design/tokens.ts  resolveThemeTokens(theme)                     │  │
│  │   ├── legacy vars   (--primary, --secondary, --text …)  [frozen]│  │
│  │   └── semantic vars (--background, --foreground, --ds-brand,    │  │
│  │                      --card, --muted, --border, --ring, --radius│  │
│  │                      derived + optional per-theme overrides)    │  │
│  │ design/applyTheme.ts  applyThemeTokens() → documentElement      │  │
│  └───────────────────┬────────────────────────────────────────────┘  │
│                      │  replaces the body of updateThemeValues()     │
├──────────────────────┼────────────────────────────────────────────────┤
│  STYLE LAYER  (one shared stylesheet — loaded by MAIN + OUTPUT windows)│
│  ┌───────────────────▼────────────────────────────────────────────┐  │
│  │ public/global.css        (legacy, untouched)                    │  │
│  │ public/design.css        (NEW: tailwind theme.css + utilities,  │  │
│  │                           @theme inline mapping, NO preflight)  │  │
│  └───────────────────┬────────────────────────────────────────────┘  │
├──────────────────────┴────────────────────────────────────────────────┤
│  COMPONENT LAYER                                                      │
│  ┌─────────────────────────────┐   ┌──────────────────────────────┐   │
│  │ LEGACY (351 files)          │   │ NEW PRIMITIVES               │   │
│  │ scoped <style> + :global    │   │ components/ui/**  (shadcn)   │   │
│  │ read legacy vars directly   │   │ bits-ui + Tailwind utilities │   │
│  │ e.g. var(--primary-darkest) │   │ read semantic vars via       │   │
│  │                             │   │ @theme inline mapping        │   │
│  └─────────────────────────────┘   └──────────────────────────────┘   │
├───────────────────────────────────────────────────────────────────────┤
│  SURFACES                                                             │
│  Settings (migrated first) → other editor surfaces (later milestones) │
│  Output.svelte (OUT OF SCOPE — must compute identically)              │
└───────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation | Status |
|-----------|----------------|------------------------|--------|
| **Token source** — `defaultThemes.ts`, THEMES store, `Themes` type | Owns user-visible theme values (colors + font + optional border) | Existing TS objects persisted by `electron-store` | **Unchanged** |
| **Token bridge** — `design/tokens.ts` | Pure function: `Themes → { legacy, semantic }` variable maps. Derives missing semantic roles from the legacy palette. | Pure TS, no framework import — testable and upgradable in isolation | **New** |
| **Token applier** — `design/applyTheme.ts` | Writes both maps to `document.documentElement`, sets `data-theme`/`data-theme-mode` | Wraps/replaces the loop currently in `updateThemeValues` | **New** |
| **Design stylesheet** — `public/design.css` | Tailwind v4 `theme.css` + `utilities.css` (preflight omitted), `@theme inline` mapping semantic vars → utilities | One CSS entry, imported after `global.css` | **New** |
| **Primitives** — `src/frontend/components/ui/**` | shadcn-svelte components (Button, Input, Select, Tabs, Switch, Separator, …) | Vendored via `shadcn-svelte` CLI, bits-ui + tailwind-variants | **New** |
| **Legacy components** — rest of `src/frontend/components/**` | Existing UI, reads `var(--primary-darkest)` etc. directly | Scoped `<style>`; frozen | **Frozen** |
| **Migration boundary** | Marks a subtree as "design-system owned" so reviewers know which layer wins | `data-ds="v2"` attribute on migrated containers | **New** |

---

## Recommended Project Structure

```
public/
├── global.css                     # legacy tokens + resets — FROZEN, do not edit for the DS work
└── design.css                     # NEW: @import tailwindcss/theme.css + utilities.css (NO preflight)
                                   #      + @custom-variant dark + @theme inline mapping
                                   #      + @layer base scoped to [data-ds="v2"] only

src/frontend/
├── design/                        # NEW — non-component design system core
│   ├── tokens.ts                  # resolveThemeTokens(theme): { legacy, semantic }
│   ├── applyTheme.ts              # applyThemeTokens(tokens) → documentElement
│   ├── roles.ts                   # canonical token-role names + defaults for all built-in themes
│   └── tokens.test.ts             # unit tests (Vitest already configured)
├── components/
│   └── ui/                        # NEW — shadcn-svelte primitives (vendored source, we own it)
│       ├── button/
│       ├── input/
│       ├── label/
│       ├── select/
│       ├── switch/
│       ├── tabs/
│       ├── separator/
│       ├── scroll-area/
│       └── …
└── components/settings/           # MIGRATION TARGET (first surface)
    ├── Settings.svelte            # shell — migrate to ui primitives
    ├── SettingsTabs.svelte
    └── tabs/*.svelte              # 21 tab files, ~4,100 lines
```

### Structure Rationale

- **`design/` is framework-agnostic and pure.** `resolveThemeTokens` has no Svelte/Tailwind import, so it can be written, unit-tested, and reviewed *before* the toolchain upgrade lands. It is the one piece of the work that is not blocked by the Svelte 5 decision. This de-risks the critical path.
- **`components/ui/` mirrors shadcn-svelte's own layout** (`ui/<component>/index.ts` + `<name>.svelte`) so `shadcn-svelte add` output drops in without path surgery, and so future surfaces (drawer, show editor) can reuse the same imports.
- **`public/design.css` is a separate file from `global.css`.** Both are loaded by the single shared `public/index.html`, so the separation is about *ownership and reversibility*, not runtime isolation — deleting the `<link>` reverts the design system in one line.
- **`data-ds="v2"` boundary** gives a grep-able, reviewable marker and enables scoping Tailwind's base layer to only migrated subtrees (protects output windows and legacy UI from base-style drift).

---

## Architectural Patterns

### Pattern 1: Bridge, don't rename (the token-collision solution)

**What:** Map shadcn's *semantic role names* onto FreeShow's *existing palette* via an explicit role map, using Tailwind's `@theme inline` to decouple **utility class names** from **CSS variable names**.

**Why this is mandatory:** shadcn and FreeShow use the same variable names with *incompatible meanings*.

| Variable | FreeShow meaning | shadcn meaning | Collision |
|----------|------------------|----------------|-----------|
| `--primary` | App/panel background base (dark navy `#242832`) | Brand/CTA button color | **SEVERE** |
| `--secondary` | Brand accent (`#F0008C` pink) | Muted neutral surface | **SEVERE** |
| `--accent` | Sky-blue highlight (`#90caf9`), 42 uses | Hover/active neutral surface | **MODERATE** |
| `--background` | Used locally 10× (not themed) | App background | MODERATE |
| `--text` | Foreground color | (shadcn uses `--foreground`) | LOW |
| `--radius` | Local, scoped in `Tabs.svelte` | Global radius scale | LOW (scoped) |
| `--border` / `--input` / `--ring` | Not present | Border/input/focus colors | NEW (no clash) |

If `--primary` is repointed to shadcn's meaning, all 49 direct `var(--primary)` reads plus 226 `--primary-lighter` + 141 `--primary-darker` + 121 `--primary-darkest` reads, plus every theme in `defaultThemes.ts`, change appearance at once — including the output windows that share `global.css`.

**How:** keep legacy names frozen; add a **new semantic namespace** and map Tailwind utilities to it:

```css
/* public/design.css */
@import "tailwindcss/theme.css" layer(theme);       /* tokens + variants, NO preflight */
@import "tailwindcss/utilities.css" layer(utilities);

@custom-variant dark (&:where([data-theme-mode="dark"] *));

/* Semantic roles are NEW variables, derived by design/applyTheme.ts.
   Defaults below only apply if the applier hasn't run (e.g. very early paint). */
:root {
    --background: var(--primary);
    --foreground: var(--text);
    --card: var(--primary-darker);
    --popover: var(--primary-darker);
    --muted: var(--primary-lighter);
    --muted-foreground: var(--text);
    --ds-brand: var(--secondary);            /* FreeShow accent */
    --ds-brand-foreground: var(--secondary-text);
    --destructive: var(--disconnected);
    --border: color-mix(in srgb, var(--text) 12%, transparent);
    --input: color-mix(in srgb, var(--text) 8%, transparent);
    --ring: var(--secondary);
    --radius: 0.375rem;
}

/* Map Tailwind color utilities → our variables. `inline` is required so utilities
   emit `var(--ds-brand)` (runtime-overridable), not a resolved literal value. */
@theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-popover: var(--popover);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-primary: var(--ds-brand);                 /* shadcn's `bg-primary` → FreeShow accent */
    --color-primary-foreground: var(--ds-brand-foreground);
    --color-secondary: var(--primary-lighter);        /* shadcn's `bg-secondary` → a FreeShow surface */
    --color-secondary-foreground: var(--text);
    --color-accent: var(--primary-lighter);
    --color-accent-foreground: var(--text);
    --color-destructive: var(--destructive);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);
}
```

**Key property:** a vendored shadcn component's class string `bg-primary text-primary-foreground` **compiles unmodified** and resolves to FreeShow's accent + its contrast text — while `var(--primary)` in 351 legacy files still means the panel background. The two systems share variables *only* through the deliberate bridge, never by coincidence.

**When to use:** always, for every visual token crossing the boundary.
**Trade-offs:** `@theme inline` + runtime CSS variables costs a small resolution indirection versus static values; naming diverges from "vanilla shadcn" (documented deviation — worth a short ADR). *Confidence: HIGH* — `@theme inline` behaviour is documented in Tailwind's theme docs (Context7) and is the exact mechanism shadcn-svelte's own manual-install CSS uses.

### Pattern 2: No preflight — additive base only

**What:** Import `tailwindcss/theme.css` and `tailwindcss/utilities.css`; **omit `preflight.css`**. Optionally add a minimal, `[data-ds="v2"]`-scoped base layer for the primitives.

**Why:** preflight resets `margin`, `border-width`, `font-size`, heading sizes, and form-control appearance globally. `public/global.css` is loaded by **every** `BrowserWindow` (`loadWindowContent` → `window.loadFile("public/index.html")` for main *and* output windows, `src/electron/index.ts:268`). Preflight would therefore repaint the legacy UI and the output window, which share that one stylesheet. Tailwind's own docs explicitly recommend omitting preflight "when integrating Tailwind into an existing project" that already has a reset — and `global.css` already carries `* { margin:0; padding:0; box-sizing:border-box }`.

**How:** the explicit-layer form from Tailwind docs:

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
/* @import "tailwindcss/preflight.css" layer(base);  ← deliberately omitted */
@import "tailwindcss/utilities.css" layer(utilities);

@layer base {
    [data-ds="v2"] { color: var(--foreground); }
    [data-ds="v2"] * { border-color: var(--border); }
}
```

**Trade-offs:** primitives may need a few explicit base styles shadcn assumed preflight provided (borders default to currentColor in browsers, not a token). Covered by the scoped base block above. *Confidence: HIGH* — Tailwind docs (Context7) state the omit-preflight recipe verbatim; Vuetify/ExtJS integrations document the same pattern.

### Pattern 3: Derive-and-override semantic roles

**What:** `resolveThemeTokens` **derives** any semantic role the theme doesn't define (from the legacy palette), but allows a theme to **override** it.

**Why:** existing themes define only `colors: { primary, primary-lighter, primary-darker, primary-darkest, text, textInvert, secondary-text, secondary, secondary-opacity, hover, focus }`. They have no `--border`, `--muted`, `--card`, `--ring`, `--destructive`. A shadcn primitive needs all of them. The `Themes` type is already open — `colors: { [key: string]: string | null }` — so **new optional roles are backward-compatible** and can be surfaced in the Theme tab for power users later. Note also `border?: { radius?: string }` already exists in the type and a commented-out radius block already sits in `updateThemeValues` — the radius plumbing was started and abandoned; the bridge can finish it.

```ts
// design/tokens.ts (illustrative)
export function resolveThemeTokens(theme: Themes): { legacy: Record<string,string>; semantic: Record<string,string> } {
    const c = theme.colors ?? {}
    const legacy = { ...c, ...prefix("font", theme.font) }            // unchanged names/values

    const semantic = {
        "--background":      c.primary,
        "--foreground":      c.text,
        "--card":            c["primary-darker"],
        "--popover":         c["primary-darker"],
        "--muted":           c["primary-lighter"],
        "--muted-foreground": c.text,
        "--ds-brand":        c.secondary,
        "--ds-brand-foreground": c["secondary-text"],
        "--destructive":     c.disconnected,
        "--border":          `color-mix(in srgb, ${c.text} 12%, transparent)`,
        "--input":           `color-mix(in srgb, ${c.text} 8%, transparent)`,
        "--ring":            c.secondary,
        "--radius":          theme.border?.radius ?? "0.375rem",
        ...pickIfPresent(c, ["border", "ring", "muted", "card", "popover", "destructive", "input"])  // overrides win
    }
    return { legacy, semantic }
}
```

**Trade-offs:** derived colors (color-mix) need Electron/Chromium ≥ 111 for `color-mix` — Electron ^37 (Chromium ~138) is far past that. Contrast-derived `*-foreground` pairs should reuse the existing `getContrast` helper (`App.svelte:53`) so the Theme tab's per-theme brand color still yields readable button text.

### Pattern 4: Single choke-point application (preserve every call site)

**What:** Keep `updateThemeValues(theme)` as the public API and have it delegate to `design/applyTheme.ts`. All 8 existing call sites (`Theme.svelte`, `ThemeTabs.svelte`, `ThemeButtons.svelte`, `responsesMain.ts`, `historyHelpers.ts`, `menuClick.ts`, `updateSettings.ts`) keep working untouched.

**Why:** the theme engine is already centralised. Reusing the choke point means the design system is wired into *every* place a theme can change — including undo/redo of theme edits and theme switch via context menu — for free, and with zero risk of "works in Settings, stale elsewhere" bugs.

```ts
// utils/updateSettings.ts
export function updateThemeValues(themeValues: Themes) {
    const { legacy, semantic } = resolveThemeTokens(themeValues)
    applyThemeTokens(legacy, semantic)          // writes BOTH sets + data-theme-mode
}
```

**Trade-offs:** `updateThemeValues` grows a dependency on `design/`. Acceptable — it already owns theming. Keep it a thin shell so `design/tokens.ts` stays unit-testable without Svelte.

---

## Data Flow

### Theme → tokens → surfaces (main window)

```
User picks/edits theme
  ThemeTabs.svelte / Theme.svelte / menuClick / historyHelpers
      ↓ history({ id: "UPDATE", … })            (undo/redo-aware)
  THEMES store ($themes) + theme store ($theme)
      ↓ updateThemeValues($themes[$theme])       ← the single choke point
  design/tokens.ts  resolveThemeTokens(theme)
      ↓ { legacy, semantic }
  design/applyTheme.ts  applyThemeTokens()
      ↓ document.documentElement.style.setProperty("--…", …)
      ↓ document.documentElement.dataset.themeMode = deriveMode(theme)
  CSS cascade
      ├── legacy components: scoped <style> → var(--primary-darkest)  (unchanged)
      └── ui primitives: Tailwind utilities → @theme inline → var(--ds-brand)  (new)
```

### Runtime theme propagation to output windows (critical boundary)

Each output is a **separate `BrowserWindow`** running the same renderer bundle (`src/electron/output/helpers/OutputLifecycle.ts` → `loadWindowContent(window, "output")`). Consequences:

1. `document.documentElement.style` set in the **main window does not propagate** to output windows. `updateThemeValues` is called only from main-window paths (grep confirms: `responsesMain.ts:146`, `theme`/`historyHelpers`/`menuClick`/Theme tab). Output windows get only (a) `global.css` `:root` defaults and (b) the inline `--secondary-text` that `App.svelte:53-55` computes from `$themes[$theme]` and applies to `<main>` in **all** windows.
2. Both windows load the same `public/index.html` → same `global.css`. **Any edit to `global.css` or the Tailwind base layer is an output-window change.**

**Rule for this milestone:** the design system must be **additive and output-neutral**.
- Do **not** modify `global.css` beyond adding nothing; put all new CSS in `public/design.css`.
- Do **not** add preflight (nothing changes on output elements).
- New semantic variable *defaults* must be chosen so that, in a window where the applier never runs, nothing visual changes. Since the semantic vars are *new names*, nothing that output windows already reference changes.
- If the bridge ever writes semantic tokens in output windows, it must be idempotent and derived from the same theme so output chrome stays consistent — but the **default plan is main-window-only**, leaving output behaviour byte-identical.

This is the formal statement of the milestone constraint "the live output/projector rendering path must not regress": the output path is isolated by *non-modification*, not by feature flags.

### State management

```
$themes  (Writable<{[id]: Themes}>)  ──read──▶ ThemeTabs / Theme / Tabs(sample swatches)
$theme   (Writable<string>)          ──read──▶ App.svelte (contrast), Settings
        │
        └──update──▶ updateThemeValues ──▶ design/tokens.ts ──▶ applyTheme.ts ──▶ :root
```

No new store is required for tokens. The token layer is a **derived projection** of `$themes[$theme]`, not a second source of truth. (A second source is the classic design-system failure — see Anti-Pattern 3.)

### Key data flows

1. **Theme switch:** `theme.set(id)` → Theme.svelte subscription → `updateThemeValues` → both variable sets rewritten → legacy surfaces + primitives repaint together. No primitive-specific theme code.
2. **Live theme edit in the Theme tab:** `history({id:"UPDATE"…})` → store update → 20ms debounced `updateThemeValues` → repaint. Unchanged.
3. **Undo/redo of a theme change:** `historyHelpers.ts:535/554` → `updateThemeValues` → repaint. Unchanged.
4. **First paint:** `global.css` `:root` defaults are present before JS; `design.css` adds semantic defaults via `:root` referencing legacy vars. Applier overwrites on load.

---

## Coexistence & Migration Strategy (concrete, reversible)

The strategy is **swap, don't restyle**. Migrating a Settings control means *replacing* the legacy component with a `ui/` primitive, not layering Tailwind classes onto the legacy component.

**Why swap, not restyle:** legacy controls carry 1,956 inline `style=` attributes and 489 `:global(...)` rules. Svelte scoped CSS compiles to `.class.svelte-hash` (specificity 0,1,1) which **beats** a Tailwind utility (0,1,0) on the same element; inline `style=` beats both. Adding utilities to legacy elements produces specificity wars and dead code. Replacing the component makes the primitive the sole owner of that DOM.

### The five rules

| # | Rule | Enforces |
|---|------|----------|
| 1 | **Additive tokens only.** Legacy variable names and values are frozen for the milestone. Never repoint `--primary`/`--secondary`/`--accent`. | Output windows + 351 components unchanged |
| 2 | **No preflight**, no edits to `global.css`. All new CSS lives in `public/design.css`. | One-line revert; no global surface drift |
| 3 | **Swap, don't restyle.** A migrated control is an `ui/` primitive; the legacy control is deleted from that file in the same commit. No hybrid elements. | No specificity fights; no orphaned styles |
| 4 | **Scope utilities to migrated code.** Own the `color`/`background`/`text` variable set under `[data-ds="v2"]`; mark migrated containers with `data-ds="v2"`. | Reviewable boundary; grep-able progress |
| 5 | **Per-surface, per-file migration.** One tab file per commit, each independently shippable. | App stays shippable throughout |

### Reversibility ladder

1. **Revert one surface:** restore the legacy component file (git). No shared state.
2. **Disable the design system at runtime:** a `designSystemEnabled` boolean derivable from a `special` settings flag; when off, `Settings.svelte` renders the legacy tab components. Optional but cheap insurance for a live-service app.
3. **Remove the design system entirely:** delete `design/`, `components/ui/`, drop the `<link href="./design.css">` from `public/index.html`, and revert the ~10-line body of `updateThemeValues`. The app returns to its current state with **zero** data migration (themes were never rewritten).

### Why Settings first (and what it proves)

Settings exercises the widest control variety with the lowest blast radius: text, number, color, toggle, dropdown, reorderable lists (`DynamicList`), nested tabs (`Tabs.svelte` is itself slated to become a primitive). It does not touch `Output.svelte`. It is ~4,100 lines across 21 tab files — small enough to finish, large enough to stress the primitives.

### Class-name collision audit (do before adding utilities)

Tailwind generates `.bg-primary`, `.text-muted`, etc. Legacy files use semantic class names like `.color`, `.tab`, `.active`, `.primary`. Property-prefixed utilities make collisions unlikely, but `text-primary`, `border-primary`, `ring`, `card` could theoretically match a legacy class used with `:global()`. **Add a one-time grep audit as a task** (`grep -rn 'class="[^"]*\b\(primary\|secondary\|muted\|card\|input\|ring\)\b'`) and record the result. Low effort, prevents a silent cross-surface style leak.

---

## Build Order (dependencies)

```
        ┌──────────────────────────────────────────────┐
        │ 0. design/tokens.ts  (pure, framework-free)  │  ← START NOW, unblocked
        │    resolveThemeTokens + unit tests           │
        └───────────────────┬──────────────────────────┘
                            │ (no dependency on 1/2)
                            ▼
┌──────────────────────────────────────────────┐
│ 1. Toolchain uplift: Svelte 3→5 + Vite 4→5/6 │  ← GATE, highest risk
│    + vite-plugin-svelte 2→4/5 + TS 4.9→5.x   │
└───────────────────┬──────────────────────────┘
                    ▼
┌──────────────────────────────────────────────┐
│ 2. Tailwind v4 wiring, NO preflight,         │
│    @theme inline, scoped @source. No UI      │  ← verify output window pixel-diff
│    changes yet.                              │
└───────────────────┬──────────────────────────┘
                    ▼
┌──────────────────────────────────────────────┐
│ 3. Token bridge live: updateThemeValues →    │
│    applyThemeTokens. Reconcile Theme.svelte/ │  ← verify theme switching + undo/redo
│    defaultThemes with semantic roles.        │
└───────────────────┬──────────────────────────┘
                    ▼
┌──────────────────────────────────────────────┐
│ 4. Primitives: components/ui/** (the subset  │
│    Settings needs: button, input, label,     │
│    select, switch, tabs, separator,          │
│    scroll-area, dialog/popover)              │
└───────────────────┬──────────────────────────┘
                    ▼
┌──────────────────────────────────────────────┐
│ 5. Settings migration, file by file          │
│    (shell + tabs → rows/inputs → lists)      │
└───────────────────┬──────────────────────────┘
                    ▼
┌──────────────────────────────────────────────┐
│ 6. Accessibility layer (focus via --ring,    │
│    keyboard nav, contrast, touch targets)    │
└──────────────────────────────────────────────┘
```

**Critical path & sequencing notes:**

- **Step 0 can run in parallel with everything and should start immediately.** `design/tokens.ts` is pure TypeScript with no framework dependency; it is unit-testable with the existing Vitest setup. Doing it first also forces the token-role decisions (which collision resolution, which derived roles) to be settled *before* they become expensive.
- **Step 1 is the gate.** It is a separate, precedented migration (`vite-plugin-svelte@2.5.3` targets Svelte 3/4; Svelte 5 needs vite-plugin-svelte 4+/5+, which needs Vite 5+; Tailwind v4's `@tailwindcss/vite` declares peer `vite ^5.2.0 || ^6 || ^7`). Svelte 5 runs existing Svelte 3/4 syntax in legacy mode and can mix old and new components, so step 1 does **not** require rewriting components — but it does touch the shared build, so it warrants its own phase with its own verification. `@tailwindcss/postcss` is a fallback if the Vite plugin's peer range blocks the chosen Vite, though it does not remove the Svelte 5 requirement for shadcn-svelte itself.
- **Step 2 is verifiable in isolation** — no UI changes means the acceptance test is "output window renders identically; bundle delta is small and reported." This is the cheapest possible proof that the shared-stylesheet hazard is handled.
- **Step 4 requires 1 + 2.** bits-ui and the vendored shadcn source need Svelte 5 and Tailwind utilities.
- **Step 6 is cross-cutting and lands last**, but its *hooks* (`--ring`, focus-visible styles) should be built into the primitives in step 4, not retrofitted.

---

## Anti-Patterns

### Anti-Pattern 1: Importing `@import "tailwindcss"` wholesale

**What people do:** the default Tailwind v4 entry, which includes preflight.
**Why it's wrong:** preflight resets element defaults globally. Here it would leak into the output windows (same `index.html`/`global.css`) and repaint 351 legacy components — a direct hit on the "output must not regress" constraint.
**Do this instead:** import `theme.css` + `utilities.css` only; add a `[data-ds="v2"]`-scoped base layer for anything the primitives need.

### Anti-Pattern 2: Repointing `--primary`/`--secondary` to shadcn semantics

**What people do:** "make FreeShow match shadcn" by rewriting the theme to shadcn's names/meanings.
**Why it's wrong:** ~600 direct reads of `--primary*`/`--secondary` across 351 files and every `defaultThemes` entry change meaning simultaneously; themes in users' `electron-store` files silently repaint; the output windows change. This is a big-bang rewrite wearing a one-line disguise.
**Do this instead:** freeze legacy names; map shadcn *utilities* to a new `--ds-*` / semantic namespace via `@theme inline`.

### Anti-Pattern 3: Token file as a second source of truth

**What people do:** define tokens in a CSS file / Tailwind `@theme` block and *also* keep the theme in `defaultThemes.ts`/THEMES store, then hand-sync them.
**Why it's wrong:** the Theme tab already treats `$themes` as authoritative and calls `updateThemeValues`; a second definition drifts the moment either side changes, and the drift is invisible until a user picks a theme.
**Do this instead:** `resolveThemeTokens(theme)` derives **all** tokens from the one theme object. Avoid putting the real token values in `@theme`; use `@theme inline` referencing external variables so runtime overrides win.

### Anti-Pattern 4: Restyling legacy elements in place with utilities

**What people do:** add `class="flex gap-2 bg-card"` to an existing component without removing its `<style>`.
**Why it's wrong:** scoped `.x.svelte-hash` (0,1,1) and inline `style=` beat utilities (0,1,0); the utilities appear to "not work," prompting `!important` escalation and dead CSS. With 1,956 inline styles and 489 `:global` rules, this is the default outcome.
**Do this instead:** swap the control for a `ui/` primitive and delete the legacy markup/styles in the same commit.

### Anti-Pattern 5: Shipping bits-ui into the output-window bundle unbounded

**What people do:** vendor every shadcn component and let all of it land in the single `bundle.js` that output windows also load.
**Why it's wrong:** the renderer bundle is shared with every output window; an inflated bundle affects output render performance during a live service (the core value). A shadcn-svelte + bits-ui component set is not negligible.
**Do this instead:** vendor incrementally (only components Settings needs), and treat bundle-size delta as an acceptance metric on the Tailwind and primitives phases. Tree-shaking helps only if imports are per-component, so import from `components/ui/<name>` and avoid a barrel that pulls everything.

---

## Integration Points

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `defaultThemes.ts` / THEMES store ↔ `design/tokens.ts` | direct (pure function) | Tokens are derived; theme objects are never rewritten by the DS |
| `updateThemeValues` ↔ `design/applyTheme.ts` | direct call | Only ~10 lines change; all 8 call sites untouched |
| `public/global.css` ↔ `public/design.css` | CSS cascade order | One `<link>` order in `public/index.html`; `design.css` after `global.css` |
| `@theme inline` ↔ semantic CSS variables | Tailwind build → CSS | `inline` is required for runtime override; verified in Tailwind docs |
| `components/ui/**` ↔ bits-ui | npm imports | Needs Svelte 5; `@lucide/svelte`, `tailwind-variants`, `cn`, `tw-animate-css` |
| `Settings.svelte` ↔ primitives | Svelte props/events | Legacy `createEventDispatcher` used heavily; primitives must accept the same event shapes or wrap them |
| main window ↔ output window | separate `BrowserWindow` | **No token propagation today**; DS must not add any that changes output rendering |
| `src/types/Settings.ts` `Themes` | TS interface | `colors` is open (`[key:string]:string\|null`) so new roles are backward-compatible; `border.radius` already exists unused |
| `history` (undo/redo) ↔ theme edits | `historyHelpers.ts` | Already routes through `updateThemeValues`; DS inherits undo/redo for free |

### External dependencies introduced

| Dependency | Integration pattern | Notes / gotchas |
|------------|---------------------|-----------------|
| `tailwindcss` v4 | `@tailwindcss/vite` (peer `vite ^5.2 || ^6 || ^7`) or `@tailwindcss/postcss` fallback | Vite plugin is faster but its peer range forces a Vite bump; PostCSS is the escape hatch |
| `shadcn-svelte` CLI | `components.json` + `shadcn-svelte add` | Current line targets **Svelte 5 + Tailwind v4 + bits-ui 2.x**; there is a legacy Svelte 4 line — the choice is the milestone's flagged research question |
| `bits-ui` | npm | Svelte 5 only on the current line |
| `@lucide/svelte` | npm | shadcn-svelte's icon default; FreeShow already has its own `Icon.svelte` + `values/icons.ts` — **decide whether primitives use Lucide or the existing icon component** to avoid two icon systems |
| `tailwind-variants`, `cn`, `tw-animate-css` | npm | Required by the vendored components |
| `mode-watcher` | optional | shadcn's dark-mode helper assumes a binary light/dark and a `.dark` class. FreeShow has N user themes, several of them light — **do not adopt a binary dark switch**; derive `data-theme-mode` from the theme instead |

**Icon-system decision is a real fork** and should be settled before primitives are vendored: shadcn components ship with `<lucide>` icons and a `.size-4` convention; FreeShow's `Icon.svelte` reads from a custom icon set (`customIcons`/`values/icons.ts`) and supports user-customised icons. Using Lucide inside primitives creates a second icon language inside Settings.

---

## Scaling Considerations

This section is reframed for a **brownfield migration scale**, not user scale.

| Migration stage | Architecture adjustment |
|-----------------|-------------------------|
| Settings only (this milestone) | `design/` + `components/ui/` + one `<link>`. Legacy untouched. No splitting needed. |
| Multiple surfaces (later milestones) | The primitive set grows; the bridge stays identical. Watch `bundle.js` size growth (shared with output windows) and consider dynamic imports per surface. |
| App-wide | The 351 legacy components become the long tail. Endgame is either (a) most surfaces migrated onto primitives, legacy scoped CSS decaying, or (b) legacy variables formalised as "primitive tokens" and Tailwind mapped onto them permanently. Decide before ~50% migration to avoid a second rewrite. |

### Scaling priorities

1. **First thing that breaks: bundle size shared with output windows.** Mitigate with incremental vendoring + per-component imports + measured deltas per phase.
2. **Second: token-role drift between `defaultThemes.ts` and the semantic map.** Mitigate with `design/tokens.test.ts` asserting every role resolves for every built-in theme (including the light themes `light`, `sea`, `papyrus`).
3. **Third: two icon systems / two spacing scales** as surfaces multiply. Mitigate by deciding early and documenting in the primitives.

---

## Sources

### Repo evidence (HIGH confidence — read directly)
- `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`
- `src/frontend/utils/updateSettings.ts` (`updateThemeValues`, `updateSettings`)
- `src/frontend/components/settings/tabs/defaultThemes.ts` (13 built-in themes)
- `src/frontend/components/settings/tabs/Theme.svelte`, `ThemeTabs.svelte`
- `public/global.css` (`:root` token defaults, resets), `public/index.html` (single shared stylesheet + CSP)
- `src/electron/index.ts` (`loadWindowContent` — main + output share `public/index.html`)
- `src/electron/output/helpers/OutputLifecycle.ts` (output windows load the same bundle)
- `src/frontend/App.svelte` (contrast → `--secondary-text`, `getContrast`)
- `src/frontend/components/input/*.svelte`, `components/inputs/Material*.svelte` (legacy primitives)
- `src/types/Settings.ts` (`Themes` interface), `vite.config.mjs`, `package.json`, `.stylelintrc.json`
- Histograms/counts from `grep -ro` over `src/frontend/**/*.svelte`

### External (HIGH/MEDIUM confidence)
- **Tailwind CSS — Preflight** (docs): disabling preflight by importing `theme.css`/`utilities.css` and omitting `preflight.css`. https://tailwindcss.com/docs/preflight — HIGH
- **Tailwind CSS — Theme / `@theme inline`** (Context7 `/websites/tailwindcss`): referencing external CSS variables so utilities resolve dynamically for light/dark/runtime theming. HIGH
- **Tailwind CSS — Install with Vite / PostCSS** (docs + Context7): `@tailwindcss/vite` requires `vite ^5.2 || ^6 || ^7`; `@tailwindcss/postcss` is the fallback. https://tailwindcss.com/docs/installation — HIGH (peer range confirmed via multiple issue reports incl. vitejs/vite#20284)
- **shadcn-svelte — Theming / Installation: Manual / Migration: Tailwind v4** (Context7 `/websites/shadcn-svelte`): full `:root`/`.dark`/`@theme inline` token block; `tailwind-variants`, `cn`, `tw-animate-css`; current components target **Svelte 5 + Tailwind v4**. https://www.shadcn-svelte.com/docs/theming — HIGH
- **Svelte 5 Migration Guide** (docs): legacy syntax supported; old and new components can mix; `mount`/`unmount`; `compatibility.componentApi: 4`. https://svelte.dev/docs/svelte/v5-migration-guide — HIGH
- **Design-token taxonomy (primitive → semantic → component)** — 2026 industry summary (Digital Applied). MEDIUM (industry commentary, consistent with shadcn/DTCG practice)

### Open questions flagged for later research
- **Exact Svelte 5 / Vite / vite-plugin-svelte / TypeScript version matrix** for this repo — the milestone's explicitly deferred research item. This document assumes the chain Svelte 5 → vite-plugin-svelte 4/5 → Vite 5/6 → TS 5.x but does not pin versions.
- **shadcn-svelte legacy (Svelte 4) line viability** vs going to the Svelte 5 current line — deferred by PROJECT.md; affects whether step 1 targets Svelte 4 or 5.
- **Whether the Theme tab should expose the new semantic roles** (border/muted/card/ring) to users, or derive them silently — a product decision, not an architecture one.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Current token/theme state | **HIGH** | Read the code; counts measured |
| Token-collision finding | **HIGH** | Direct comparison of both variable sets |
| Bridge pattern (`@theme inline` + frozen legacy names) | **HIGH** | Mechanism documented; matches shadcn-svelte's own CSS |
| No-preflight necessity | **HIGH** | Shared stylesheet proven via `loadWindowContent`; Tailwind docs give the exact recipe |
| Coexistence/migration strategy | **MEDIUM-HIGH** | Specificity reasoning is sound and evidence-based; the "swap don't restyle" discipline is well-established practice |
| Build order / toolchain sequencing | **MEDIUM** | Depends on the deferred Svelte/Vite version research; the dependency direction is certain, exact versions are not |

---

*Architecture research for: FreeShow design-system integration*
*Researched: 2026-10-17*
