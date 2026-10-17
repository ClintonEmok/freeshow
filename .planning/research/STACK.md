# Stack Research

**Domain:** Design-system adoption (shadcn-svelte + Tailwind) inside an existing Electron + Vite + Svelte desktop application
**Researched:** 2026-10-17
**Overall confidence:** HIGH on the recommended path's package matrix; MEDIUM on the Vite major-version target

## The Decision

**Recommendation: Path A — go to Svelte 5, Tailwind 4, shadcn-svelte 1.7, bits-ui 2.19 — but land on Vite 7, not Vite 8.**

| | Path A (recommended) | Path B (rejected) |
|---|---|---|
| Svelte | 5.57.2 (legacy mode for existing files) | 4.2.20 |
| shadcn-svelte | 1.7.0 (live registry) | 0.14.3 (archived registry) |
| Tailwind | 4.3.3 | 3.4.19 (v3-LTS) |
| bits-ui | 2.19.5 | 0.22.0 (pinned by the CLI) |
| Vite | 7.3.7 (upgrade required) | 4.5.14 (unchanged) |
| TypeScript | 5.9.3 | 5.9.3 |
| Migrations required | **1** (3→5) | **3** (3→4, then 4→5, then TW3→v4) |

**Confidence: HIGH** that Path A is correct. The evidence is close to dispositive:

1. **Path B is a dead end by construction, not by opinion.** The Svelte 4 shadcn line is frozen. Its CLI (`shadcn-svelte@0.14.3`) hardcodes its registry to `https://svelte-4.shadcn-svelte.com` (verified live, HTTP 200) and the registry's component manifests pin `bits-ui@0.22.0` exactly. There is no forward maintenance: shadcn-svelte's own docs state *"The latest version of shadcn-svelte expects you to be using Svelte v5 and Tailwind v4"* and only publish **Svelte 4→5** and **Tailwind 3→4** migration guides. Choosing Path B means doing those two migrations later anyway, plus a third (3→4) up front.
2. **Svelte 5's legacy mode collapses the rewrite cost.** FreeShow's ~547 `.svelte` files are overwhelmingly `export let` (317 files / 1547 uses), `$:` (419 / 2747), `on:` directives (404 / 1856), `<slot>` (37 / 52), `createEventDispatcher` (77 / 130 call sites), `bind:` (170 / 278), `<svelte:component>` (6 / 13), `svelte:window|body` (66). **Every one of these keeps working in Svelte 5 legacy mode.** Svelte 5 auto-selects legacy mode for any component that does not use runes. So Svelte 3→5 here is a *compiler and tooling* upgrade, not a 400-file rewrite.
3. **The repo's Svelte API surface is unusually clean.** Verified zero uses of `svelte/internal`, `svelte/compiler`, `SvelteComponentTyped`/`SvelteComponent`, `$$restProps`, `<svelte:options>`, or `.$set`. `$$slots` appears twice. The Svelte 5 breaking-change list barely engages.
4. **The only mechanical code change is six lines.** `new App({ target: document.body })` → `mount(App, { target: document.body })` in `src/frontend/main.ts` and the five `src/server/*/main.ts` files.
5. **Path B's single saving is avoiding the Vite upgrade** — and that saving is not real, because Tailwind v4's `@tailwindcss/vite` has a **hard floor of Vite >= 5.2.0**. Any Tailwind-v4 future forces the Vite bump regardless.

**Why Vite 7 rather than Vite 8 (Confidence: MEDIUM — judgement call, flagged):** Vite 8 replaced Rollup with **Rolldown** — `vite@8.3.4` depends on `rolldown@~1.2.12` and `lightningcss@^1.33.0`. FreeShow's renderer build is non-standard: a single **IIFE `build.lib` bundle** (`formats: ["iife"]`, `name: "freeshow"`, custom `assetFileNames` → `bundle.css`, output `public/build/bundle.js`) that is also loaded by **every output window**. Vite 7 keeps Rollup 4 — the same bundler version the repo already uses for its server builds (`rollup ^4.46.2`) — so `rollupOptions` semantics are known. Vite 7's `@sveltejs/vite-plugin-svelte@6.2.4` (peer: `vite ^6.3.0 || ^7.0.0`, `svelte ^5.0.0`) is the supported non-Rolldown pairing. Moving to Vite 8 + `vite-plugin-svelte@7.3.1` (peer: `vite ^8`, `svelte ^5.46.4`) should be a separate, isolated upgrade after Settings ships.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `svelte` | **5.57.2** | UI framework / compiler | Latest stable. Legacy mode runs all existing FreeShow components unchanged; runes mode is opt-in per component. |
| `@sveltejs/vite-plugin-svelte` | **6.2.4** | Svelte compilation in Vite | Highest version still on Rollup-based Vite 7. Peer `vite ^6.3.0 \|\| ^7.0.0`, `svelte ^5.0.0`. |
| `vite` | **7.3.7** | Renderer bundler | Satisfies Tailwind v4's `>=5.2` floor; avoids Vite 8's Rolldown swap for this milestone. Rollup 4 based. |
| `typescript` | **5.9.3** | Type system | Top of the supported band. Required — see TypeScript section. |
| `tailwindcss` | **4.3.3** | Utility CSS / token engine | The only version the current shadcn-svelte line supports. |
| `@tailwindcss/vite` | **4.3.3** | Tailwind Vite integration | shadcn-svelte docs **remove** `@tailwindcss/postcss` and `postcss.config.js` in favour of this plugin. |
| `shadcn-svelte` | **1.7.0** | Component CLI (devDependency) | Pulls component source into the repo. Zero runtime footprint. |
| `bits-ui` | **2.19.5** | Headless accessible primitives | The accessibility layer under every shadcn component. Peer: `svelte ^5.33.0`. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `clsx` | 2.1.1 | Conditional class joining | The `cn()` helper every shadcn component calls. |
| `tailwind-merge` | 3.7.0 | Conflicting-class resolution | Paired with `clsx` inside `cn()`. |
| `tailwind-variants` | 3.3.1 | Variant API (`cva`) | Required by shadcn blocks and any variant-driven primitive. Peer `tailwind-merge >=3.0.0`. |
| `tw-animate-css` | 1.4.0 | Enter/exit animations | Replaces `tailwindcss-animate`, which is Tailwind 3 only. |
| `@lucide/svelte` | 1.59.0 | Icon set | shadcn-svelte's default icons. Peer `svelte ^5`. Import per-icon (see bundle note). |
| `mode-watcher` | 1.1.0 | Dark-mode class toggling | Peer `svelte ^5.27.0`. **Reconcile with the existing `Theme` tab before adopting** — see token collision. |
| `@internationalized/date` | 3.12.4 | Date/time primitives | Transitive requirement of bits-ui date fields. Add only if a date control is used. |
| `svelte-sonner` | 1.2.1 | Toast notifications | **Optional.** FreeShow already has `newToast()` in `src/frontend/utils/common.ts`. Two toast systems is worse than one — decide explicitly, do not adopt by default. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `svelte-check` | 4.7.7 | Svelte type checking | Peer `svelte ^4 \|\| ^5`, `typescript ^5 \|\| ^6`. Replaces `2.10.3`. |
| `vitest` | 4.1.12 | Unit tests | Peer `vite ^6 \|\| ^7 \|\| ^8`. `2.1.9` is Vite-4 era. (`5.0.5` also works; `4.1.12` is the lower-risk bump.) |
| `prettier-plugin-svelte` | 4.1.1 | Svelte formatting | Replaces `3.4.0`. Keep `prettier@3.6.2` and the `printWidth: 500` config. |
| `stylelint` | 16.23.1 (keep) | Style linting | **Needs config work**: `stylelint-use-logical` and `stylelint-config-html` will fight Tailwind at-rules (`@theme`, `@custom-variant`, `@apply`, `@source`). Plan an ignore/allowlist pass. |

### Lint Toolchain (required change, not optional)

| Change | From | To | Why |
|--------|------|-----|-----|
| Svelte lint plugin | `eslint-plugin-svelte3@4.0.0` | `eslint-plugin-svelte@3.23.1` + `svelte-eslint-parser@1.9.0` | `eslint-plugin-svelte3` targets Svelte 3 only and will not parse Svelte 5. |
| TS lint | `@typescript-eslint/*@5.62.0` | `typescript-eslint@8.71.2` | v5 caps out below TS 5.9. Peer: `typescript >=4.8.4 <6.1.0`. |
| ESLint core | `eslint@8.57.1` | **keep 8.57.1** (recommended) | `eslint-plugin-svelte@3.23.1` peer is `eslint ^8.57.1 \|\| ^9 \|\| ^10`, so ESLint 8 stays legal. Keeps this milestone off flat-config migration. **Confidence MEDIUM** — `eslint-plugin-svelte` 3.x is flat-config-first; verify the eslintrc shim still works or budget a lint-config rewrite for the following milestone. |

## Installation

```bash
# --- Path A: Svelte 5 + Tailwind 4 + shadcn (devDependencies only) ---
# Framework + build tooling
npm i -D svelte@5.57.2 @sveltejs/vite-plugin-svelte@6.2.4 vite@7.3.7 typescript@5.9.3

# Tailwind v4 (Vite plugin — NOT the PostCSS plugin)
npm i -D tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 tw-animate-css@1.4.0

# shadcn runtime primitives + helpers
npm i -D shadcn-svelte@1.7.0 bits-ui@2.19.5 clsx@2.1.1 tailwind-merge@3.7.0 \
         tailwind-variants@3.3.1 @lucide/svelte@1.59.0 mode-watcher@1.1.0

# Type checking + test tooling
npm i -D svelte-check@4.7.7 vitest@4.1.12 prettier-plugin-svelte@4.1.1

# Lint toolchain
npm i -D eslint-plugin-svelte@3.23.1 svelte-eslint-parser@1.9.0 typescript-eslint@8.71.2
npm uninstall eslint-plugin-svelte3 @typescript-eslint/eslint-plugin @typescript-eslint/parser svelte-preprocess

# Initialise components.json + tokens (run once, then add components individually)
npx shadcn-svelte@1.7.0 init
npx shadcn-svelte@1.7.0 add button input label switch select tabs
```

**Every new package goes in `devDependencies`.** This is not stylistic — see the Electron packaging section.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Svelte 5 + shadcn 1.7 + Tailwind 4 | Svelte 4 + shadcn 0.14.3 + Tailwind 3.4.19 | Only if the team cannot absorb a build-tooling change *at all* this milestone. The saving is real but temporary: the Vite bump is deferred, not avoided, and two more migrations are added to the backlog. |
| Vite 7 + `vite-plugin-svelte@6.2.4` | Vite 8 + `vite-plugin-svelte@7.3.1` | Once Settings has shipped and the IIFE lib build has been validated against Rolldown in a spike. Vite 8 is the long-term target. |
| Vite 7 | Vite 6 + `vite-plugin-svelte@5.1.1` | If Vite 7 shows a regression on the lib/IIFE output. Peer allows it; Tailwind v4 supports it. |
| `@tailwindcss/vite` | `@tailwindcss/postcss` | Only if the Vite plugin proves incompatible with the dual-root build. shadcn-svelte's documented path is the Vite plugin. |
| `typescript@5.9.3` | `typescript@6.0.3` | If the team wants to stay ahead. Both satisfy `svelte-check@4.7.7`. Neither is required. |
| `tailwind-variants@3.3.1` | `class-variance-authority` | Only for non-Svelte familiarity; `tailwind-variants` is what shadcn-svelte emits. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Any shadcn version on Svelte 3** | Impossible. `bits-ui@0.22.0` (the oldest shadcn-compatible primitive) peers `svelte ^4.0.0 \|\| ^5.0.0`. There is no Svelte 3 line. | Svelte 5 |
| `shadcn-svelte@0.x` as the long-term target | Its registry is archived at `svelte-4.shadcn-svelte.com` and pins `bits-ui@0.22.0`; Tailwind 3.4.19 is v3-LTS with v4 shipping since Jan 2025. | `shadcn-svelte@1.7.0` |
| `eslint-plugin-svelte3` | Svelte 3 only; will not parse Svelte 5 syntax. | `eslint-plugin-svelte@3.23.1` |
| `tailwindcss-animate` (1.0.7) | Tailwind 3 API; no v4 support. | `tw-animate-css@1.4.0` |
| `lucide-svelte` (1.0.1) | Legacy icon package; peer stops at `^5.0.0-next`. | `@lucide/svelte@1.59.0` |
| `typescript@7.0.2` | **Latest, but unsupported here.** `svelte-check@4.7.7` peers `typescript ^5.0.0 \|\| ^6.0.0`; `typescript-eslint@8.71.2` peers `<6.1.0`. TS 7 is the native/Go port and the Svelte toolchain has not caught up. | `typescript@5.9.3` |
| `svelte-preprocess` | Deprecated for Svelte 5. The repo currently passes `vitePreprocess()` in `vite.config.mjs` anyway, making `svelte.config.mjs`'s `sveltePreprocess` block redundant. | `vitePreprocess()` from `@sveltejs/vite-plugin-svelte` |
| `vite-plugin-svelte@2.5.3` with Svelte 5 | Its peer technically permits `^5.0.0-next.0`, but it predates Svelte 5's `mount` API. Do not rely on it. | `6.2.4` |
| `@tailwindcss/postcss` + `postcss.config.js` | shadcn-svelte's Tailwind v4 guide explicitly removes these. | `@tailwindcss/vite` |
| Tailwind v4 if targeting old Chromium | v4 requires Chrome 111+ / Safari 16.4+ / Firefox 128+ (`@property`, `color-mix()`). | **Not a risk here** — Electron 37.10.3 ships Chromium 138.0.7204.251. |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `svelte@5.57.2` | — | `engines.node >=18`; repo requires >=22.12.0. Fine. |
| `shadcn-svelte@1.7.0` | `svelte ^5.0.0` | **Hard requirement.** Svelte 4 is not an option for 1.x. |
| `bits-ui@2.19.5` | `svelte ^5.33.0` | This is the binding floor — it is *above* 5.0.0. Pin Svelte to a modern 5.x, not a 5.0-era release. |
| `bits-ui@1.8.0` | `svelte ^5.11.0` | Svelte 5 only. There is no `bits-ui@1.0.0`; the 1.x line starts at `next` tags. |
| `bits-ui@0.22.0` | `svelte ^4.0.0 \|\| ^5.0.0` | The Path B primitive. |
| `vite@7.3.7` | `@sveltejs/vite-plugin-svelte@6.2.4` | Peer `vite ^6.3.0 \|\| ^7.0.0`. |
| `vite@7.3.7` | `@tailwindcss/vite@4.3.3` | Peer `vite ^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8`. |
| `vite@7.3.7` | `vitest@4.1.12` | Peer `vite ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`. **Not optional** — Vitest 4/5 declares `vite` as a required peer. |
| `svelte-check@4.7.7` | `typescript ^5.0.0 \|\| ^6.0.0` | Caps the TS choice at 6.x. |
| `typescript-eslint@8.71.2` | `typescript >=4.8.4 <6.1.0`, `eslint ^8.57.0 \|\| ^9 \|\| ^10` | Keeps ESLint 8 viable. |
| `tailwind-variants@3.3.1` | `tailwind-merge >=3.0.0` | Must not be mixed with a `tailwind-merge@2.x` pin. |
| `mode-watcher@1.1.0` | `svelte ^5.27.0` | Path B equivalent: `mode-watcher@0.5.1` (`svelte ^4.0.0 \|\| ^5.0.0-next.1`). |
| `svelte-sonner@1.2.1` | `svelte ^5.0.0` | Path B equivalent: `svelte-sonner@0.3.28` (`svelte ^3 \|\| ^4 \|\| ^5.0.0-next.1`). |
| `@lucide/svelte@1.59.0` | `svelte ^5` | Path B equivalent: `lucide-svelte@1.0.1`. |
| Electron `37.10.3` | Chromium `138.0.7204.251`, Node `22.21.1`, V8 `13.8.258.32` | Comfortably above Tailwind v4's Chrome 111 baseline. |

## TypeScript Implications

The repo is on `typescript@4.9.5` with frontend `strict` disabled and ~2,733 `: any` uses. **TS 4.9.5 cannot be retained on either path.** The constraint chain (all verified against published peer dependencies):

- `svelte-check@4.7.7` → `typescript ^5.0.0 || ^6.0.0`
- `typescript-eslint@8.71.2` → `typescript >=4.8.4 <6.1.0`
- `svelte-preprocess@6.0.5` → `typescript ^5.0.0 || ^6.0.0`
- `svelte2tsx@0.7.62` → `typescript ^4.9.4 || ^5.0.0 || ^6.0.0`

Intersection: **TypeScript 5.x**. `5.9.3` is the recommended target; `6.0.3` is the ceiling. **`7.0.2` (current `latest`) is out of band for the Svelte toolchain** and must not be adopted.

Two mitigating facts worth carrying into the plan:
- Keeping `strict: false` and the existing `any` usage is fine — nothing in Path A requires tightening types. TS 5 resolves supersets of TS 4 syntax.
- The repo's `@typescript-eslint` rules that are currently *off* (`no-explicit-any`, `no-unsafe-*`, `no-floating-promises`) stay off. The upgrade does not force a typing cleanup.

## Electron / Native-Module / Packaging Implications

**1. All new packages must be `devDependencies`.** The repo's convention already reflects this: bundled renderer libraries (`pdfjs-dist`, `dayjs`, `@vimeo/player`, `youtube-player`, `chord-transposer`, `qrcode-generator`) live in `devDependencies`, while `dependencies` holds only 33 genuinely runtime-Node packages. `electron-builder` packages `dependencies` into the app; `bits-ui`, `tailwindcss`, `shadcn-svelte`, `clsx`, `tailwind-merge`, `tailwind-variants`, `@lucide/svelte`, `mode-watcher` must not be there. Verify with `npm ls --omit=dev` after install.

**2. New build-time native binaries appear — keep them out of the Electron rebuild chain.** Tailwind v4 ships `@tailwindcss/oxide` (Rust). If Vite 8 is ever adopted, `rolldown` (Rust) and `lightningcss` (Rust) join it. The repo's `postinstall` runs `electron-builder install-app-deps`, and `rebuild-opus` / `rebuild-osr` run `electron-rebuild`. None of these should touch the new binaries, but confirm: (a) they stay out of `dependencies`, and (b) `electron-rebuild` is never invoked with `-f` (all) rather than the targeted `-w <module>` form it currently uses. **No new native *runtime* addon is introduced by either path** — the existing matrix (`better-sqlite3`, `macadam`, `openmediatransport`, `sherpa-onnx-node`, `libltc-wrapper`, `@discordjs/opus`, `osr-capture`) is untouched.

**3. Bundle-size exposure is higher here than in a web app.** `vite.config.mjs` builds the renderer as a single **IIFE lib bundle with no code splitting**, and that same bundle is loaded by the main window *and every output window*. Every byte added to the design system ships to the live-presentation path. Concretely: (a) import icons individually (`import { Check } from "@lucide/svelte"`, never a barrel), (b) add components via `shadcn-svelte add` rather than pulling the whole set, (c) Tailwind's JIT output is proportional to classes actually used, which is inherently bounded — but Preflight and `@theme` output is unconditional, so measure the delta in the phase that installs the system.

**4. `svelte.config.mjs` must change.** Drop `sveltePreprocess` (and the `svelte-preprocess` dependency) and let `vite.config.mjs`'s existing `vitePreprocess()` handle TS. Note the current config passes `tsconfigFile` pointing at `config/typescript/tsconfig.svelte{,.prod}.json` — confirm those tsconfigs are picked up via the `vitePreprocess()` path or pass the option explicitly, otherwise path mappings silently stop applying to `.svelte` files.

## Critical Integration Constraints (verified, and non-obvious)

These are not stack choices but they determine whether the stack works, so they belong with it.

### 1. CSS cascade layers: legacy CSS will beat Tailwind utilities

Tailwind v4 emits `@layer theme, base, components, utilities;` — **everything Tailwind generates is layered.** The repo's `public/global.css` and all 351 Svelte scoped `<style>` blocks compile to **unlayered** CSS. Per the cascade-layers spec (and Tailwind's own docs), *unlayered declarations outrank layered ones at the same origin*, regardless of specificity.

Two consequences, both important:

- **Good news — first install is low-risk.** Tailwind's Preflight sits in the `base` layer, so it **cannot** clobber the existing global stylesheet or any scoped component style. The usual "Tailwind reset broke my app" failure mode does not occur here.
- **Bad news — Tailwind utilities cannot reliably restyle existing elements.** Any unlayered rule that matches an element outranks Tailwind's `.bg-primary` / `.p-4` on that same element. You cannot incrementally "Tailwind-ify" a legacy component in place.

**Therefore the design system must own its own subtree.** shadcn primitives live in a new `ui/` directory and are styled purely with Tailwind; legacy components are left untouched. Escaping this requires wrapping a legacy sheet in `@layer legacy { … }`, which lowers its precedence against *other* legacy CSS too — a deliberate, tested change, never a drive-by.

### 2. Token name collisions are immediate and silent

`public/global.css` already defines `--primary`, `--secondary`, `--accent`, `--text`, `--primary-lighter`, `--primary-darker`, `--primary-darkest`, `--hover`, `--focus`, and `defaultThemes.ts` supplies values per theme (e.g. `primary: #242832`, `secondary: #F0008C`).

shadcn-svelte defines `--primary`, `--secondary`, `--accent`, `--background`, `--foreground`, `--card`, `--border`, `--input`, `--ring`, `--radius`, …

**`--primary`, `--secondary`, and `--accent` collide by name and differ in meaning** — FreeShow's `--primary` is a dark *surface* colour; shadcn's `--primary` is the *interactive/brand* colour. Overwriting them silently recolours every existing component that reads `var(--primary)`.

**Recommendation:** treat reconciliation as an explicit design task in the Settings phase, and prefer **mapping FreeShow's existing theme values into shadcn's token names** so the existing `Theme` tab remains the single source of truth. Namespacing shadcn's tokens (`--ui-primary`) avoids the collision but means hand-editing every component the CLI emits — a permanent tax. Do not ship both without an explicit mapping table. Note: shadcn's token set is authored in **OKLCH**, while FreeShow's themes are hex/rgba — a conversion step is needed.

### 3. Dual-root CSS entry means Tailwind must be imported from `main.ts`

`vite.config.mjs` sets `root: production ? "." : "public"` and `publicDir: false`. `global.css` is loaded via a static `<link>` in `public/index.html` (and `public/loading.html`). In **production** the build is `build.lib` with entry `src/frontend/main.ts` and `root: "."` — `public/index.html` is not a build input, so a Tailwind `@import` placed in `public/global.css` **would never be processed in the production build**.

Correct approach: create `src/frontend/styles/tailwind.css` containing `@import "tailwindcss";` (plus tokens, the `@custom-variant dark` line, and `@theme inline`), and `import "./styles/tailwind.css"` from `src/frontend/main.ts`. It then emits as an asset renamed to `bundle.css` by the existing `assetFileNames` hook. Keep the `global.css` `<link>` for legacy tokens.

Also set an explicit `@source` directive: with a dual-root config and `publicDir: false`, Tailwind v4's automatic source detection (relative to the CSS file's directory, honouring `.gitignore`) may not reach `src/frontend`. Declare `@source "../../../src/frontend"` (exact path to be confirmed against the final CSS location). **Confidence MEDIUM** — this needs a 30-minute spike rather than more research.

### 4. shadcn components are runes-mode; consuming them from legacy-mode files is constrained

shadcn-svelte 1.x components are compiled with runes. A legacy-mode parent can render them, pass props, and receive callbacks — but:
- `bind:` against a runes component's props requires `$bindable` on the child, which shadcn components do not declare. **`bind:` will not work.**
- `on:click` (dispatched events) is not how shadcn primitives communicate; they spread `onclick` onto the underlying element. Use **Svelte 5 event-attribute syntax (`onclick`)**.
- Composition through children uses **snippets** (`{#snippet}`), not `<slot>`.

**Recommendation: write the new Settings components in runes mode, in new files, alongside the untouched legacy files.** This avoids every cross-boundary rough edge and is the natural end state anyway — runes mode is incremental per component and needs no flag when the component uses runes. Reserve the legacy-mode question for the existing 547 files, which need no changes at all. **Confidence MEDIUM** — the exact event/snippet interop boundary deserves a small spike before the Settings rewrite starts.

## Cost Comparison

| Work item | Path A (3→5) | Path B (3→4) |
|---|---|---|
| Svelte major upgrade | 3 → 5 (legacy mode; no component rewrites) | 3 → 4 (no component rewrites) |
| Later forced migrations | — | 4 → 5 **and** Tailwind 3 → 4, both later |
| Mechanical code changes | 6 mount sites (`new App` → `mount`), `svelte.config.mjs` | Config only |
| Vite | 4.5.14 → 7.3.7 | **4.5.14 unchanged** |
| Tailwind | v4 from day one | v3.4.19, migrate to v4 later |
| TypeScript | 4.9.5 → 5.9.3 | 4.9.5 → 5.9.3 (svelte-check 3.8.6 pulls TS 5 itself) |
| ESLint toolchain rewrite | Required | Required (same work) |
| Vitest | 2.1.9 → 4.1.12 | 2.1.9 → 3.x |
| shadcn maintenance status | Actively maintained, live registry | Archived, frozen at `bits-ui@0.22.0` |
| Long-term cost | One migration, then forward-only maintenance | Three migrations, then forward-only maintenance |

Path B trades one large, well-trodden migration now for three chained migrations later — the last two of which have no upgrade tool that has ever seen FreeShow's config. It is not a cheaper path; it is a deferred-bill path.

## Open Questions (for phase-level research, not blockers)

1. **`eslint-plugin-svelte@3` + ESLint 8 eslintrc compatibility** (MEDIUM). Confirm the eslintrc shim works with `config/linting/eslint.svelte.js`, or plan a flat-config rewrite as its own phase.
2. **Vite 7 against the IIFE `build.lib` output** (MEDIUM). Needs a spike: build, load `bundle.js` in an Electron `BrowserWindow`, confirm `output.assetFileNames` still renames CSS to `bundle.css` and that the output window renders identically.
3. **Exactly how FreeShow's `Theme` tab values map onto shadcn's OKLCH token set** (needs design decision, not research).
4. **Whether `svelte-sonner` replaces or coexists with `newToast()`** (product decision).
5. **Tailwind `@source` resolution under the dual-root config** (MEDIUM).
6. **Snippet/event interop between legacy and runes components** (MEDIUM) — validate with one throwaway component pair.
7. **Does any output-window code path render Settings-adjacent UI?** If yes, the design system's CSS reaches the live-presentation surface and the bundle-size budget must be enforced, not assumed. (The milestone scopes `Output.svelte` out, but the bundle is shared — verify, do not assume.)

## Sources

- **npm registry, resolved 2026-10-17** — `dist-tags`, `versions`, and `peerDependencies` for: `svelte`, `svelte@4.2.20`, `shadcn-svelte@1.7.0` / `@0.14.3`, `bits-ui@2.19.5` / `@1.8.0` / `@0.22.0`, `tailwindcss`, `@tailwindcss/vite`, `@sveltejs/vite-plugin-svelte` (2.5.3 / 3.1.2 / 4.0.4 / 5.1.1 / 6.2.4 / 7.3.1), `vite` (4.5.14 / 7.3.7 / 8.3.4), `typescript` (5.9.3 / 6.0.3 / 7.0.2), `svelte-check` (2.10.3 / 3.8.6 / 4.7.7), `vitest` (2.1.9 / 4.1.12 / 5.0.5), `typescript-eslint@8.71.2`, `eslint-plugin-svelte@3.23.1`, `tailwind-variants@3.3.1`, `tailwind-merge@3.7.0`, `clsx`, `tw-animate-css`, `tailwindcss-animate`, `@lucide/svelte`, `lucide-svelte`, `mode-watcher`, `svelte-sonner`, `svelte-preprocess` (5.1.3 / 6.0.5), `svelte2tsx`. **Confidence: HIGH** (authoritative, machine-readable, version-exact).
- **shadcn-svelte official docs** — `https://shadcn-svelte.com/docs/installation/manual` (Tailwind v4 CSS/token block, `@custom-variant dark`, `@theme inline`, OKLCH values), `/docs/installation/vite` (Vite guide — confirms non-SvelteKit support), `/docs/migration/svelte-5` (prerequisites, `sv-migrate`, `@lucide/svelte`/`svelte-sonner`/`mode-watcher` versions), `/docs/migration/tailwind-v4` (install `@tailwindcss/vite`, **remove** `@tailwindcss/postcss` and `postcss.config.js`), `/docs/migration` ("The latest version of shadcn-svelte expects you to be using Svelte v5 and Tailwind v4"). **Confidence: HIGH.**
- **shadcn-svelte legacy archive** — `https://svelte-4.shadcn-svelte.com/` and `/registry/index.json` verified HTTP 200 (2026-10-17), manifest pins `bits-ui@0.22.0`. The 0.14.3 CLI's default registry is hardcoded to this host (`COMPONENTS_REGISTRY_URL ?? "https://svelte-4.shadcn-svelte.com"`). **Confidence: HIGH** (directly probed).
- **Svelte official docs** — `https://svelte.dev/docs/svelte/legacy-overview` (legacy vs runes mode; legacy auto-selected absent runes), `/docs/svelte/v5-migration-guide` (`on:event` → `onevent`, `$:` → `$effect`, slot/snippet divergence). **Confidence: HIGH.**
- **Tailwind official docs** — `https://tailwindcss.com/docs/compatibility` (Chrome 111 / Safari 16.4 / Firefox 128 baseline), `/docs/upgrade-guide`, `/docs/preflight` (Preflight injected into the `base` layer), `/docs/theme` and `/docs/adding-custom-styles` (`@layer theme, base, components, utilities` import order; utilities override the `components` layer). **Confidence: HIGH.**
- **Electron release metadata** — `https://releases.electronjs.org/releases.json`: `37.10.3` → Chromium `138.0.7204.251`, Node `22.21.1`, V8 `13.8.258.32`. **Confidence: HIGH.**
- **Local repo verification, 2026-10-17** — `package.json` (dependency placement, scripts, `postinstall`, rebuild targets), `vite.config.mjs` (IIFE `build.lib`, dual `root`, `assetFileNames`), `svelte.config.mjs`, `public/index.html` (`<link href="./global.css">`, CSP), `public/global.css` custom properties, `src/frontend/components/settings/tabs/defaultThemes.ts`, and pattern counts across `src/frontend` + `src/server` (547 `.svelte` files). **Confidence: HIGH** (direct inspection).
- **Not verified / not relied upon:** blog posts, Stack Overflow answers, and third-party migration write-ups were not used for any recommendation in this document.

---

*Stack research for: shadcn-svelte design-system adoption in Electron + Svelte*
*Researched: 2026-10-17*
