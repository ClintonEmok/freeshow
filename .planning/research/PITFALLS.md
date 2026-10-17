# Pitfalls Research

**Domain:** Electron + Svelte desktop app adopting a shadcn/Tailwind design system, starting with the Settings surface, across staged milestones
**Researched:** 2026-10-17
**Confidence:** HIGH for repo-derived hazards (direct source evidence); MEDIUM for ecosystem/toolchain hazards (verified against official docs, Context7, and multiple sources)

**Reference phase set** (roadmap not yet authored — derived from the milestone's Active requirements; used for the mapping tables):
P1 Toolchain & Svelte 5 platform upgrade · P2 Tailwind + design-token foundation · P3 shadcn-svelte primitive layer · P4 Settings surface revamp · P5 Accessibility · P6 Settings IA/flows · P7 Extensibility & documentation

---

## Critical Pitfalls

### Pitfall 1: The global stylesheet is shared by every window, including the live output windows

**What goes wrong:**
The renderer is a **single IIFE bundle** (`public/build/bundle.js` + `bundle.css`) loaded by the main window, every output/projector window, the export window, and the offscreen capture window. `loadWindowContent(window, "output")` (`src/electron/index.ts:265-273`) loads the *same* `public/index.html` for outputs and only distinguishes them at runtime via the `STARTUP`/`TYPE` message → `currentWindow.set("output")` (`src/frontend/utils/startup.ts:39-48`). There is no separate output entry point, no per-window CSS, and no tree-shaking of `Settings` code out of the output window.

Consequence: any global CSS the design system introduces — Tailwind Preflight, `@theme` token blocks on `:root`, a `.dark` class toggle, font-family/line-height base rules — is **compiled into `bundle.css` and applied inside every projector output**. Preflight alone resets margins, unstyles headings, makes images `display: block`, and applies `*, ::before, ::after { border: 0 solid }`. On a lyrics/scripture/overlay renderer, a margin or heading-font reset is a visible, on-air regression. The project's Core Value ("the show must not fail") is directly at risk from a *styling* milestone.

This is the single highest-risk item in the milestone. The existing `global.css` already proves the mechanism: `* { margin: 0; padding: 0; box-sizing: border-box; user-select: none }` and `h1..h6 { ... white-space: nowrap }` are applied to outputs today.

**Why it happens:**
Teams assume "we're only touching Settings" means blast radius is limited to Settings. In this architecture, *build-time globals* ignore component scope. `PROJECT.md` explicitly lists `Output.svelte` as out of scope, but scope is a *source* boundary, not a *bundle* boundary.

**How to avoid:**
- Treat `@import "tailwindcss"` as an output-path change, not a Settings change. Decide the isolation strategy **in P2, before any Tailwind class is written**:
  - Import Tailwind's layers explicitly and **omit Preflight** while the legacy components exist:
    `@layer theme, base, components, utilities;` + `@import "tailwindcss/theme.css" layer(theme);` + `@import "tailwindcss/utilities.css" layer(utilities);` — no `preflight.css`.
  - Add a **prefix** so utilities cannot collide with 351 legacy `<style>` blocks and 157 files containing `:global(...)` rules: `@import "tailwindcss/utilities.css" layer(utilities) prefix(tw);`
  - If Preflight is ever desired, scope it to a container (a custom preflight inside a `.ds-scope` wrapper) rather than the document root.
- Never write design-system tokens or `.dark` on `document.documentElement` / `body`. Namespace them under a Settings-scoped root element (see Pitfall 2).
- Add an explicit **output-render regression gate**: a visual/assertion check that an output window renders byte-identical (or pixel-identical at fixed content) before vs. after the CSS change. A Playwright screenshot of `index.html` with `TYPE=output` at 1920×1080 is cheap and catches exactly this class of failure.
- Keep `Output.svelte` and `components/output/**` out of the milestone diff, but do gate their *rendering result*.

**Warning signs:**
- `bundle.css` grows after a "Settings-only" change.
- Any output window shows changed text spacing, heading size/weight, list bullets, or image alignment.
- `bundle.js`/`bundle.css` size delta correlates with Tailwind class count (see Performance Traps).
- A `.dark` class appears on `<html>` in an output window's devtools.

**Phase to address:**
P2 (isolation strategy is decided here and is expensive to change later). Verified again at the end of P3 and P4.

---

### Pitfall 2: shadcn token names silently collide with the existing FreeShow theme system

**What goes wrong:**
FreeShow already has a **runtime theme system** that writes CSS custom properties onto the document root: `updateSettings.ts:256` does `document.documentElement.style.setProperty("--" + key, value)` for every entry of `themes[theme].colors`, and `defaultThemes.ts` defines `primary`, `primary-lighter`, `primary-darker`, `primary-darkest`, `text`, `textInvert`, `secondary`, `secondary-opacity`, `secondary-text`, `hover`, `focus`. `public/global.css` also declares `--primary: #242832`, `--secondary: #f0008c`, `--accent: #90caf9`.

shadcn/Tailwind v4 uses the **same names with inverted semantics**:
| Variable | FreeShow meaning | shadcn meaning |
|---|---|---|
| `--primary` | dark app surface (`#242832`) | high-emphasis brand/CTA color |
| `--secondary` | pink brand accent (`#F0008C`) | low-emphasis muted surface |
| `--accent` | blue focus accent (`#90caf9`) | hover/highlight surface |
| `--border` | (unused today) | dividers/outlines |

Because themes are written to `:root` **at runtime in every window**, and shadcn reads the same variables, adopting shadcn's scaffold verbatim will either (a) repaint the entire app with shadcn's neutral palette the moment a theme loads, or (b) have shadcn components rendered with FreeShow's brand colors in the wrong roles (e.g. a "secondary" button painted hot pink). It also breaks the derived contrast logic in `App.svelte:53-55` (`getContrast($themes[$theme].colors.secondary)` → `--secondary-text`) and the many `var(--secondary)` usages across icons, context menus, trackers, stage tools, and the audio-routing graph.

**Why it happens:**
shadcn docs present `--primary`/`--secondary` as "just CSS variables you can retarget". They are — but only safe if the names are free. Nobody audits existing `:root` variables before running `shadcn-svelte init`.

**How to avoid:**
- **Do not use shadcn's default token names.** Choose one of:
  1. **Namespace shadcn tokens** and map them to FreeShow semantics: `--ds-background`, `--ds-foreground`, `--ds-primary` (→ brand accent), `--ds-card`, `--ds-border`, `--ds-ring`, `--ds-muted`, then `@theme inline` maps `--color-ds-primary: var(--ds-primary)` so utilities read `bg-ds-primary`.
  2. Keep shadcn names but **redefinition by intent**, and add an explicit mapping layer that converts the existing theme's `primary/secondary/accent` into shadcn's *different* roles (e.g. `--secondary-foreground` etc.) — fragile and easy to get backwards.
- Write a **token contract document** in P2: for each token, (a) its role, (b) where its value comes from (legacy theme, dark/light, or constant), (c) whether it is theme-editable by the user.
- Reconcile with the existing `Theme` settings tab and `defaultThemes.ts` rather than bypassing them; `PROJECT.md` already flags this as a required reconciliation. The theme feature is user-facing and shipped.
- Add a test/assertion that `themes.default` + shadcn primitives render with `#F0008C` somewhere intentional and *no* shadcn surface picks up `#242832`.

**Warning signs:**
- Anything in the app goes pink/hot-pink where a neutral surface was.
- The whole app goes grey/neutral after Settings loads.
- `--secondary` has two writers (`updateSettings.ts` and a shadcn stylesheet) — detectable by grepping `:root` blocks.
- The Theme tab's color pickers stop having a visible effect on revamped screens.

**Phase to address:**
P2 (token contract + namespacing). Reconciled again in P4 when the Theme tab is revamped.

---

### Pitfall 3: "Upgrade Svelte" is actually a coupled toolchain migration, not one dependency bump

**What goes wrong:**
`PROJECT.md` frames the gate as "Svelte 3 → the version shadcn needs". In practice Svelte 5 cannot be installed alone. The current stack is internally consistent but old, and several packages are **pinned to Svelte 3 and will not accept Svelte 5**:

| Current | Blocks | Required for Svelte 5 |
|---|---|---|
| `svelte@3.59.2` | — | `svelte@5.x` |
| `@sveltejs/vite-plugin-svelte@2.5.3` | peer Svelte ≤4; v4 removed Svelte 3 support and requires Vite 5; later majors require Vite 6/7 and Node 20.19+ | `@sveltejs/vite-plugin-svelte@^4+` |
| `vite@4.5.14` | plugin peer range | Vite 5–7 |
| `svelte-preprocess@4.10.7` + `svelte.config.mjs` | replaced by `vitePreprocess()` in Svelte 5 | `vitePreprocess()` |
| `svelte-check@2.10.3` | Svelte 3 only | `svelte-check@4/5` |
| `typescript@4.9.5` | new tooling + `verbatimModuleSyntax` requirement of the TS preprocessor | TS 5 |
| `eslint-plugin-svelte3@4` | **unmaintained, Svelte 3 only** | `eslint-plugin-svelte` (flat config) |
| `@tsconfig/svelte@2.0.1` | predates `verbatimModuleSyntax` | current `@tsconfig/svelte` |
| `svelte-inspector` (Svelte-3 fork, pinned to a commit) | only referenced by the dead `config/building/rollup.config.mjs` | delete or replace (Svelte 5 has `$inspect`) |
| `vitest@2` | pinned to the Vite 4 range | Vitest 3 (with Vite 5+) |
| `@playwright/test`, `vite-plugin` ecosystem | follow Vite | follow Vite |

Additionally, `vite-plugin-svelte` v4+ **disables script preprocessing by default** (Svelte 5 handles `lang="ts"` natively), and its TypeScript preprocessor requires the tsconfig to enable `verbatimModuleSyntax` — which `src/frontend/tsconfig.json` does not, because it extends the Svelte-3-era `@tsconfig/svelte@2`.

So the honest scope of "the Svelte upgrade" is: **Vite, the Svelte plugin, Svelte, TypeScript, svelte-check, ESLint's Svelte plugin, the Svelte tsconfig base, and Vitest**, all at once, in a repo where `npm run test:svelte` is non-blocking and there are only 12 test files for ~1013 sources. There is no automated safety net for this step.

**Why it happens:**
The migration is described as a version change. It is a platform change. Teams discover the coupling one failed peer dependency at a time, midway through, with a half-migrated tree.

**How to avoid:**
- Do the **toolchain swap as its own phase (P1) with zero syntax migration**: keep every component in legacy Svelte 4/5 syntax (`export let`, `on:`, `$:`, `props` stores). Svelte 5 explicitly supports legacy mode; a component tree can be mixed (runes parent ↔ legacy child) as long as *individual files* don't mix the two models.
- The only required source change to boot is the entry point: `src/frontend/main.ts:23` uses `const app = new App({ target: document.body })`, which is the classic-component API removed in Svelte 5 — replace with `mount(App, { target: document.body })`.
- Sequence tooling: Vite + plugin first (still compiling Svelte 3/4 components) → bump Svelte → bump TS/svelte-check/ESLint → only then start runes adoption, bottom-up.
- Validate on all three OSes in P1: `scripts/preBuild.js` regenerates `tsconfig.*.prod.json`, `scripts/postBuild.js` minifies with Terser and rewrites `public/index.html`, and `scripts/cleanBuilds.js` reverses it. Every one of these is sensitive to the exact strings emitted by the bundler.
- Establish a **release smoke checklist** before P1 (launch app, open Settings, open an output, play a song, import a file) since automated coverage is thin.
- Recommend the `svelte@5` path over the Svelte 4 + legacy-shadcn path. The Svelte 4 line locks you to the shadcn-svelte **legacy docs** (Tailwind v3 + `bits-ui@0.22`) whose components are frozen and *not* compatible with current shadcn-svelte releases; it defers, not avoids, the migration (see Moderate Pitfalls).

**Warning signs:**
- `npm ls svelte` reports multiple Svelte copies or peer warnings.
- Dev server boots but HMR throws `svelte-hmr` errors (vite-plugin-svelte 3.x bundles `svelte-hmr`, whose range stops at Svelte 4 — a known trap).
- `svelte-check` count explodes and is silently ignored because CI is `continue-on-error`.
- Prod build succeeds locally but `postBuild.js` throws `"Dev script path changed!"`.

**Phase to address:**
P1. This phase gates everything else and should be the first roadmap phase.

---

### Pitfall 4: Svelte 5's event/prop model breaks at component *boundaries*, which is where this codebase lives

**What goes wrong:**
The codebase is boundary-heavy: **259 files** declare `export let` props, **308 files** use `on:click` (566 files contain some `on:` directive), **65 files** use `createEventDispatcher`, **138 files** use `bind:`, **26 files** use `<slot>`, **40 files** reference `$$props`, **24 files** use `use:` actions, and **15 files** use event modifiers like `on:click|preventDefault`. In Svelte 5:
- `createEventDispatcher` is deprecated; component events are callback props. Event **forwarding** (`on:foo` with no handler, which forwards events up) is gone. Wherever a wrapper passes `on:change` through to a parent — exactly the pattern in `components/input/Input.svelte:19-28`, which dispatches `change` from a generic control and is used by many Settings tabs — the contract changes shape.
- `on:click|preventDefault` has no equivalent on `onclick`; modifiers must become handler-body calls (or `addEventListener` options).
- `<svelte:component this={...}>` is unnecessary in Svelte 5 but still supported in legacy mode; it is used in `Input.svelte:45` for the dynamic input dispatch, so the "input primitive" layer is at the exact seam where legacy and runes style meet.
- `$$props` → `$props()` rest spread; `<slot>` → snippets + `{@render}`; `bind:` on a component prop requires `$bindable()` in runes mode.
- Within a single file you **cannot mix** `$:` with `$derived`, or `export let` with `$props()`. Mixed-mode projects must therefore be reviewed file-by-file, and reviewers must know which mode each file is in.

Because the design-system work *replaces* the input primitives (`components/input/*`, ~640 lines) that most Settings tabs consume, this boundary churn lands directly on the revamp's critical path — and a broken callback contract there is silent (an input that simply doesn't propagate its value), not a compile error.

**Why it happens:**
Legacy mode makes the upgrade *possible*, which is misread as "make it a non-issue". The failures cluster at inter-component contracts, and those are the hardest to see without component tests (see `CONCERNS.md`: the frontend is "almost entirely untested").

**How to avoid:**
- Migrate **bottom-up**, one component per commit, keeping `main` shippable — the community pattern that consistently works. Top-down migration forces many components to change at once.
- **Pick one event convention for new code (`onclick`) and lint for it** so `on:click` and `onclick` don't coexist within new files. Enforce with an ESLint rule, not convention, because "writing `on:click` out of muscle memory" is an explicitly reported failure mode.
- Where legacy and runes components must interoperate during the transition, prefer passing **callback props** (works both directions) over relying on forwarded component events.
- When converting `Input.svelte` and friends, add the missing component tests **first** — assert that changing a control propagates a `change` value to the consumer. That is the cheapest regression net for the input layer.
- Do not enable project-wide `runes: true` while legacy components remain; that forces everything at once.

**Warning signs:**
- A revamped Settings control renders but its value never saves.
- `$$props is deprecated` / `createEventDispatcher` warnings in the build.
- Components that "work" in isolation but not when a legacy parent renders a runes child.
- Two files in the same PR using different event syntaxes.

**Phase to address:**
P1 (platform + entry-point + convention), executed incrementally through P3/P4 as components are converted.

---

### Pitfall 5: The production build pipeline rewrites HTML with brittle string replacement and post-minifies with Terser

**What goes wrong:**
The frontend is built in **Vite library mode as IIFE** (`vite.config.mjs:22-42`) — not a normal Vite app build. `public/index.html` is then mutated in place:

- `scripts/postBuild.js:168-176` replaces the exact string `<script type="module" src="/src/frontend/main.ts"></script>` with `<script type="module" crossorigin src="./build/bundle.js"></script><link rel="stylesheet" href="./build/bundle.css">` and **throws `"Dev script path changed!"` if neither string is found**.
- `scripts/cleanBuilds.js:40` holds a mirrored copy of the same string for teardown.
- `postBuild.js:91-106` runs **Terser** (`mangle.toplevel: true`, `compress.passes: 2`) over every emitted `.js`, and calls `process.abort()` on failure.
- `postBuild.js:151-166` (`renameOpusBuild`) mutates `node_modules/@discordjs/opus/prebuild` based on the installed Electron version, matching a folder name pattern derived from `require("electron/package.json").version`.

Any change to how CSS is emitted, how the entry script is referenced, or the syntax Terser must parse can break the release path in ways that don't show up in `npm run build` alone. Example: Tailwind v4 with `@tailwindcss/vite` injects its own CSS pipeline; if the emitted asset name stops matching `.css` (`assetFileNames` hook at `vite.config.mjs:34-39`), the file will **not** be renamed to `bundle.css` and `index.html` will reference a missing stylesheet → an *unstyled app in production only*.

Also note `vite.config.mjs:20` uses `root: production ? "." : "public"` and `publicDir: false`, and `svelte.config.mjs` picks a different tsconfig per environment — unconventional settings that new plugins may not tolerate.

**Why it happens:**
The build is a bespoke pipeline accumulated over years. Library mode + IIFE + in-place HTML rewriting is not the shape any Tailwind/shadcn install guide assumes, so "follow the docs" produces a config that compiles in dev but assembles incorrectly in prod.

**How to avoid:**
- Add a **build-output assertion** to the release path: after `postbuild`, verify that `public/index.html` references existing `./build/bundle.js` and `./build/bundle.css`, and that `bundle.css` is non-empty and contains the expected tokens. Fail the build otherwise.
- Verify the CSS extraction path *before* writing UI: build once in P2 with a trivial Tailwind import and confirm `bundle.css` lands where `index.html` expects.
- Keep `assetFileNames` returning `bundle.css` for all CSS assets; explicitly assert one CSS file is emitted (multiple stylesheets would silently keep their hashed names).
- Re-validate Terser against Svelte 5 output early in P1 (`mangle.toplevel` on modern output is where breakage appears). If Terser struggles, prefer Vite's built-in `minify: "terser"` (as the server config already does at `vite.config.servers.mjs:106`) and drop the post-build minify for the frontend.
- Update `cleanBuilds.js` in the same commit as any `index.html`/`postBuild.js` change — the two share a literal constant.

**Warning signs:**
- Production app is unstyled while dev is fine.
- `bundle.js` referenced in HTML but no `bundle.css` in `public/build/`.
- `postBuild` emits `"Dev script path changed!"` or Terser aborts with `process.abort()`.
- Build output contains more than one `.css` file.

**Phase to address:**
P1 (Terser + toolchain) and P2 (CSS emission path). Treat as a gate before P4.

---

### Pitfall 6: Tailwind v4's native engine interacts badly with `npm ci`, CI matrices, and emulated cross-builds

**What goes wrong:**
Tailwind CSS v4 is not pure JS. It ships a **native Rust engine (`@tailwindcss/oxide`)** plus `lightningcss`, distributed as per-platform optional dependencies. Known failure modes:
- Under **QEMU emulation** (e.g. building `linux-arm64` images on an x64 host, or x64 images on Apple Silicon) the Oxide binary can **fail silently**: the build reports success but generates missing or partial utility CSS.
- Optional platform binaries can fail to install on CI, which is exactly the class of bug this repo has already hit and documented in `.gitignore:1-3`: *"Error: Cannot find module @rollup/rollup-x-gnu. npm has a bug related to optional dependencies."*
- `@tailwindcss/oxide` and `lightningcss` are native but are **build-time-only**; `electron-builder install-app-deps` (the `postinstall` script, `package.json:19`) walks native dependencies, and mixing build-time natives into that process is a known source of install/build breakage.
- The release scripts build across the matrix in `build.yml` (windows-latest / macos-latest / ubuntu-latest) and via `release:arm64` with `--arm64` using a separate builder config.

**Why it happens:**
Tailwind is mentally filed as "a devDependency that produces CSS", so its binary distribution is not considered part of the native-module story. It is.

**How to avoid:**
- Keep Tailwind, the Vite plugin, and Oxide strictly in `devDependencies` so release packaging never includes them.
- On CI, ensure the platform's optional binary is installed: pin `package-lock.json` (it is committed), avoid `--no-optional`/`--omit=optional`, and consider an explicit `@tailwindcss/oxide-<platform>` dependency for the CI OS/arch that is actually building.
- If any Linux arm64 build runs under emulation, run the Tailwind/PostCSS JS path there instead of the native scanner, or build CSS once on a native runner and ship the artifact — do not let an emulated scan silently produce an unstyled app.
- Add a post-build assertion (see Pitfall 5) that `bundle.css` contains a known utility class, so a silent Oxide failure fails loudly.
- Do not let the Tailwind migration change the Electron/native dependency set or `postinstall` behavior. The repo already carries six GitHub-commit-pinned runtime deps (`grandiose`, `macadam`, `slideshow`, `osr-capture`, `openmediatransport`, `libltc-wrapper`) plus `better-sqlite3`, `@discordjs/opus`, `osr-capture` and a `renameOpusBuild` hack; a lockfile churn on top of that is a broad risk surface.
- After any `package.json` change, re-run the rebuild scripts (`rebuild-opus`, `rebuild-osr`) and load-test each native module on all three OSes.

**Warning signs:**
- `npm ci` reports missing optional dependency packages.
- `bundle.css` present but missing expected classes.
- Native module load failures after a lockfile refresh (`@discordjs/opus`, `osr-capture`).
- CI build "succeeds" but the packaged app renders unstyled.

**Phase to address:**
P2 (Tailwind install) with verification in the release checklist from P1.

---

### Pitfall 7: Global `user-select: none`, transparent frameless windows, and `backgroundThrottling: false` fight shadcn primitives

**What goes wrong:**
`public/global.css:59-67` sets `* { user-select: none; outline-offset: -4px; outline-color: var(--secondary) }` globally. shadcn/bits-ui components assume normal browser affordances:
- Text inputs, `select` contents, combobox text, and copyable rows need `user-select: text`; today they get it ad hoc.
- `outline-offset: -4px` with a global outline color interacts with `--ring`/`--ring-offset` focus styling in shadcn components; focus rings may be clipped or invisible.
- Output windows are `transparent: true`, `frame: false`, `alwaysOnTop: true`, `hasShadow: false` (`windowOptions.ts:42-71`) and the main window is frameless on macOS with a custom `MenuBar`. shadcn surfaces/popovers that assume an opaque page background (or a shadow to separate layers) will look wrong over transparency, and portals mounted to `document.body` can render inside a transparent output window if a component is ever reachable there.
- All windows set `backgroundThrottling: false` (needed for timers/API playback). bits-ui uses floating-ui, `ResizeObserver`, and rAF-based positioning/animations; these keep running unfocused and per-window, and in an output window they compete with the rAF-driven effect renderer (`effectRenderer.ts`).
- The app already has an "optimized mode" that strips `backdrop-filter` (`global.css:157-161`). shadcn components that use blur/backdrop-blur are inconsistent with that mode.

**Why it happens:**
Design-system components are built for a normal web page (opaque, selectable, focused, one window). A frameless always-on-top transparent Electron window with global interaction overrides is not that.

**How to avoid:**
- Audit and explicitly re-enable selection where needed: a `.ds-selectable` scope with `user-select: text` on inputs and content areas, rather than relying on inheriting from a global reset.
- Define focus-ring tokens that work with the existing negative `outline-offset`; test keyboard focus in each new primitive at 1× and on a projector resolution.
- Keep bits-ui portals scoped with `portalProps.to`/`target` to the Settings subtree rather than `document.body`, so nothing new can mount into an output window.
- Gate decorative motion (`animate-in`, blur, shadows) on the existing optimized-mode flag.
- Verify each primitive in a real frameless window on macOS *and* Windows — the `MenuBar`/drag-region behavior differs (`isWindows` height offset in `App.svelte:28,55`).

**Warning signs:**
- Unable to select text in a new input/combobox.
- Focus ring invisible or clipped in dark themes.
- A dropdown/popover appears in the wrong window or over the projector.
- Output framerate drops after a Settings change.

**Phase to address:**
P3 (primitive layer) — establish the conventions there; verify in P4/P5.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Enable full Tailwind Preflight "because it's the default" | Consistent baseline for new components | Silently restyles 351 legacy components **and the live output windows** | Only after a scoped/isolated preflight is designed; otherwise never during this milestone |
| Reuse shadcn's `--primary`/`--secondary` names as-is | No mapping work; docs copy-paste works | Collides with the shipped theme system; brand colors inverted; Theme tab appears broken | Never — namespace from day one |
| Adopt Svelte 4 + shadcn legacy docs (Tailwind 3, bits-ui 0.22) | Avoids the Svelte 5 upgrade now | Frozen component line; current shadcn-svelte components are Svelte-5-only, so the upgrade is deferred *and* made harder later | Only if a hard deadline forces it, and only with a dated plan to move to 5 |
| Keep every component in legacy syntax indefinitely | Fastest path to "running on Svelte 5" | `$:`/`on:`/slots accumulate; two mental models; new contributors copy the wrong syntax | Acceptable through P2; must be actively burned down from P3 |
| Migrate components top-down (App first) | App "looks migrated" | Forces large multi-file commits; every intermediate state is broken | Never |
| Skip the output-render regression gate | Saves a phase of setup | A styling change can silently degrade live projection — the app's Core Value | Never |
| Rely on `continue-on-error` for format/type checks while doing this work | Unblocks merges | The Svelte 5 type/tooling backlog grows invisibly during the exact moment it matters most | Only if a temporary burn-down counter is added; otherwise flip to blocking for touched paths |
| Let `postBuild` Terser handle the frontend minify | One pipeline | Couples release correctness to Terser's parser across a Svelte major upgrade | Acceptable only with a build-output assertion |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| Tailwind v4 ↔ Vite **library mode** | Following the normal app-mode install; assuming `index.html` is processed by Vite | Validate CSS emission against the existing `assetFileNames → bundle.css` contract; assert exactly one CSS file is emitted |
| Tailwind source detection ↔ monorepo-ish root | Assuming only `src/` is scanned | v4 auto-detects from the git root and honours `.gitignore` (so `/build/`, `/public/build/`, `/dist/` are excluded — good), but classes built dynamically (`class={`bg-${x}-500`}`) and any class created in `.ts` string tables are missed. Use `@source inline(...)` / explicit mappings for dynamic class names, and `source(...)` to bound the scan to `src/frontend` |
| shadcn-svelte ↔ theme feature | Treating shadcn tokens as the single source of truth | Map shadcn tokens to the existing theme system; the Theme tab is a shipped user-facing feature |
| shadcn-svelte ↔ Svelte version | Trying to add current shadcn components to a Svelte 3/4 tree | Current shadcn-svelte requires Svelte 5 + `bits-ui@^1`, `mode-watcher@^1`, `@lucide/svelte`; the Svelte 4 line is `bits-ui@0.22` and Tailwind 3 under "Legacy Docs" |
| Vite plugin ↔ TypeScript preprocessor | Leaving `svelte-preprocess` in place | `vitePreprocess()`; the TS preprocessor now requires `verbatimModuleSyntax` in the tsconfig that `@tsconfig/svelte` provides |
| ESLint ↔ Svelte 5 | Leaving `eslint-plugin-svelte3` | Move to `eslint-plugin-svelte`; `eslint-plugin-svelte3` is unmaintained and Svelte-3-only |
| Electron net/2nd windows ↔ design system | Styling `document.documentElement` | Scope all DS globals under a container element; `:root` reaches output windows |
| Stylelint ↔ Tailwind | Applying `csstools/use-logical`-only expectations to utility classes | Tailwind utilities are not authored CSS; extend the stylelint ignore list for generated CSS, but keep logical-property enforcement on hand-written component styles (RTL matters — `App.svelte:50` sets `dir`) |
| Prettier (`printWidth: 500`, `semi: false`, `tabWidth: 4`) ↔ generated shadcn files | Running `shadcn add` and committing as-generated | Reformat generated components through the project's Prettier config so they match conventions; expect a large diff on every added component |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| Tailwind CSS grows `bundle.css`, which **every window parses** | Output window startup time and memory rise; projector quality degrades | Keep utilities scoped/prefix-limited; measure `bundle.css` size in CI; avoid safelisting broadly (one team generated 8 MB with pattern-based safelists) | Immediately — CSS is loaded by every window, not just Settings |
| Revamped Settings code ships inside the output-window bundle | Output bundle size and startup regress for features the projector never uses | Acceptable long-term; **measure it** and consider code-splitting the Settings surface behind a dynamic import if the delta is material | At any meaningful CSS/JS growth |
| Oxide scan over 464 components on every dev HMR | Slow dev feedback, especially on Windows CI/dev | Bound the scan with `source("./src/frontend")`; exclude generated/legacy dirs with `@source not` | Large repos on non-Linux filesystems |
| bits-ui floating-ui/rAF work in unfocused windows | CPU keeps spinning (`backgroundThrottling: false`), competing with the effect renderer | Don't mount DS portals/components in output windows; gate animations on the optimized-mode flag | Several outputs open simultaneously (the app already shares one effect renderer across preview + outputs) |
| `$effect` loops introduced during runes migration inside output-path components | Extra frames, visible jank on projector | Keep runes conversion away from `components/output/**` in this milestone; where unavoidable, prefer `$derived` over `$effect` | Any effect in a per-frame path |
| Blur/shadows/backdrop-filter in primitives | GPU cost on lower-end machines; inconsistent with optimized mode | Respect the existing `isOptimized` class | On integrated GPUs / multiple outputs |

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| New primitives render imported/user content through `{@html}` | HTML injection origin point is *imported shows/converters*, of which there are ~74 `{@html}` uses today; a design-system `html`-rendering primitive would add more | Route any new HTML-rendering primitive through a sanitizer at the DS boundary; document it as the single choke point |
| Design-system components mounted into windows with `contextIsolation: false` / `nodeIntegration: true` | `loadingOptions`, `screenIdentifyOptions`, `exportOptions` (partially), and the WebRtcHost hidden window run with weak isolation; a DS component with a remote/`{@html}` content path there is OS-level code execution | Never mount the DS into loading/identify/export/WebRtcHost windows; if the export window is ever revamped, harden it first |
| shadcn dialogs/popovers rely on inline styles (floating-ui positioning) | Works today because no `style-src` is declared; tightening CSP later silently breaks positioning | If CSP is ever tightened, add `style-src` allowances or use floating-ui's CSS-variable mode; note current CSP already allows `unsafe-inline` + `unsafe-eval` |
| Untrusted strings written into `:root` CSS variables | `updateSettings.ts` writes theme color values via `setProperty("--" + key, value)`; an imported theme file could inject arbitrary values | Validate theme color values against a color/token allowlist before `setProperty`; keep the write path namespaced so a bad theme can't reach shadcn roles |
| `@lucide/svelte` / new transitive UI deps added casually | This repo already pins six runtime deps to GitHub commit SHAs and has npm `overrides` masking advisories | Keep DS packages in `devDependencies` (except runtime-required ones), review transitive natives, and avoid new `overrides` |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---|---|---|
| Two theming systems visible to the user (legacy `Theme` tab + shadcn tokens) | Colors change in some screens and not others; the Theme tab appears broken | Single reconciled token contract presented once in the UI; revamp the Theme tab in the same milestone slice (P4) |
| Revamping Settings IA while `activePage`/deep-links and `activePopup` are load-bearing | Keyboard shortcuts and API/action-driven navigation land on the wrong screen; automations break | Change IA behind a compatibility mapping or stage it as its own phase (P6) with a redirect table |
| Mouse-first assumptions carried into "accessible" components | Keyboard/AT users can't reach controls; tab order jumps | Verify focus management per primitive; the a11y warnings are currently disabled project-wide via `onwarn` (`vite.config.mjs:13-17`) — re-enable at least for the new DS layer |
| Losing the touch/large-target sizing for booth operators | Live operators on touch screens mis-tap during a service | Keep explicit minimum target sizes as a token; test on a touch display, not just mouse |
| Physical-direction utilities in an RTL-capable app | Layout breaks in RTL locales (`dir` is set at runtime) | Prefer logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`); the project already enforces logical properties in stylelint |
| Global `user-select: none` inherited by new controls | Users can't select/copy values from Settings (paths, IDs, tokens) | Add an explicit selectable scope for value-display components |
| Replacing `Icon.svelte`'s theme-colored iconography with a new icon set | Visual identity and per-theme icon coloring regress across the app | Keep the existing icon indirection for now; map the new primitives onto it |

## "Looks Done But Isn't" Checklist

- [ ] **Svelte 5 upgrade:** Often missing the **non-Svelte** toolchain — verify `vite`, `@sveltejs/vite-plugin-svelte`, `typescript`, `svelte-check`, `eslint-plugin-svelte`, `@tsconfig/svelte`, and `vitest` all moved together, and that `src/frontend/tsconfig.json` has the module settings the TS preprocessor now requires.
- [ ] **Svelte 5 upgrade:** Often missing the entry-point API change — verify `main.ts` uses `mount(...)` and the app boots in a packaged build, not just dev.
- [ ] **Tailwind adoption:** Often missing **Preflight isolation** — verify the output window's computed styles are unchanged for existing content (screenshot diff at 1920×1080).
- [ ] **Tailwind adoption:** Often missing the **production CSS path** — verify `public/build/bundle.css` exists, is non-empty, is referenced by `public/index.html`, and that `postBuild` did not throw.
- [ ] **Tailwind adoption:** Often missing **dynamic class names** — verify classes built from data/strings are generated (grep the built CSS) or are explicitly sourced.
- [ ] **Token system:** Often missing **collision resolution** — verify `--primary`/`--secondary`/`--accent` have exactly one writer per role and the Theme tab still changes what it claims to.
- [ ] **shadcn primitives:** Often missing **windows beyond the main one** — verify a primitive in a frameless macOS window and a Windows frameless window, and confirm nothing mounts into an output window.
- [ ] **shadcn primitives:** Often missing **`user-select` / focus ring** behavior — verify text selection, visible focus, and keyboard traversal in dark and light themes.
- [ ] **Accessibility:** Often missing **the project's own disabled a11y linting** — verify a11y warnings are enabled (or explicitly reviewed) for new components.
- [ ] **Cross-platform:** Often missing **native module sanity** — verify `better-sqlite3`, `@discordjs/opus`, `osr-capture`, and the GitHub-pinned deps still load after any dependency/lockfile change, on Windows/macOS/Linux.
- [ ] **Cross-platform:** Often missing the **arm64 / snap** path — verify the Linux arm64 and snap builds still produce styled output.
- [ ] **Extensibility claim:** Often missing a **second consumer** — verify the new primitives are actually used by at least one surface outside Settings, or explicitly acknowledge the pattern is unproven.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| Preflight/global CSS leaked into output windows | MEDIUM | Revert `bundle.css` consumers by disabling Preflight; re-import only `theme`+`utilities` layers; add the screenshot gate; audit `.dark`/`:root` writers |
| Token collision shipped | MEDIUM | Rename to namespaced `--ds-*` tokens; add a compatibility mapping from legacy theme values; sweep all shadcn components for the old names; add a test asserting both systems |
| Svelte 5 toolchain half-migrated | HIGH | Revert `package.json`/lockfile to the last green commit; redo as a single self-contained P1 commit series behind the release smoke checklist |
| Event/prop contract broken in a revamped input | LOW–MEDIUM | Restore the old dispatch path for the affected control; add the missing propagation test before re-attempting |
| Production build unstyled (`bundle.css` missing/misnamed) | LOW | Restore `assetFileNames → bundle.css`; add the build assertion; rebuild and re-release |
| Oxide/QEMU silent CSS failure | MEDIUM | Pin platform packages for the build host; build CSS on a native runner; assert a known class exists in `bundle.css` |
| Native module broke after dependency churn | MEDIUM–HIGH | Re-run `npm ci`, `rebuild-opus`, `rebuild-osr`; verify `renameOpusBuild` still applies for the Electron version; smoke-load each native module per OS |
| Settings IA change broke deep-links/automations | MEDIUM | Reinstate the old route IDs as aliases; add a redirect table; re-verify keyboard shortcuts and API actions that target settings pages |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---|---|---|
| Shared bundle: global CSS reaches output windows | P2 | Output-window screenshot/visual diff at fixed 1920×1080 unchanged vs. baseline |
| shadcn token collision with theme system | P2 | Grep for `:root` writers; Theme tab changes still take effect; no brand color in a neutral role |
| Coupled toolchain migration (Vite/plugin/TS/ESLint/svelte-check) | P1 | `npm ls svelte` shows one copy; dev + prod build green on Windows/macOS/Linux |
| Svelte 5 boundary/event model changes | P1 → P3/P4 | Per-file mode is unambiguous; input propagation tests exist before conversion |
| Brittle `postBuild` HTML rewrite + Terser | P1, P2 | Post-build assertion: `index.html` references existing, non-empty `bundle.js`/`bundle.css`; single CSS file |
| Tailwind native engine vs. `npm ci`/CI matrix/QEMU | P2 | `npm ci` clean on all matrix OSes; packaged build renders styled |
| Global `user-select`/frameless/transparent/throttling vs. primitives | P3 | Selection, focus ring, and portal target verified in frameless windows; nothing mounts into outputs |
| Tailwind CSS size in every window | P2 → P4 | `bundle.css` size tracked per phase; explicit budget |
| Settings revamp ships into the output bundle | P4 | Output bundle size delta measured; consider dynamic import if material |
| `$effect`/rAF work in output-path code | P1, P3 | No runes/effects introduced into `components/output/**` this milestone |
| Security: `{@html}`, weak-isolation windows, CSS-var injection | P3, P4 | Sanitizer at the DS boundary; DS not mounted in `contextIsolation:false` windows; theme values validated |
| Two visible theming systems | P2, P4 | Theme tab revamped in the same milestone; single token contract documented |
| IA changes break `activePage`/deep-links | P6 | Redirect table; shortcuts and API-driven navigation re-verified |
| Accessibility disabled by project config | P5 | a11y warnings enabled (or reviewed) for the DS layer; keyboard traversal verified |
| Cross-platform native module regression | P2, release | Native modules load on all three OSes; arm64/snap build styled |
| "Extensible" claim unproven | P7 | At least one non-Settings consumer, or an explicit limitation note |

## Sources

**Repo evidence (HIGH confidence — direct source):**
- `src/electron/index.ts:265-285` — `loadWindowContent` loads the same `public/index.html` for main and output windows, distinguishing only via the `STARTUP`/`TYPE` message.
- `src/frontend/utils/startup.ts:32-58` — `currentWindow.set(type)`, output branch.
- `vite.config.mjs:6-59` — Vite library mode, IIFE, single `bundle.js`, `assetFileNames → bundle.css`, `root`/`publicDir` overrides, a11y warnings disabled via `onwarn`.
- `scripts/postBuild.js:91-106,168-189` — Terser post-minify, `"Dev script path changed!"` throw, `renameOpusBuild`; `scripts/cleanBuilds.js:40` mirrors the prod HTML string.
- `scripts/preBuild.js` — regenerates `tsconfig.*.prod.json`.
- `package.json:13-19,66-169` — dependency and toolchain versions, `postinstall: electron-builder install-app-deps`, GitHub-SHA-pinned native/runtime deps.
- `.gitignore:1-9` — documented npm optional-dependency failure for `@rollup/rollup-*`; `/build/`, `/public/build/`, `/dist/` ignored.
- `public/global.css:30-67,150-161` — `:root` variables (`--primary`, `--secondary`, `--accent`), global `*` reset, `user-select: none`, `.isOptimized`.
- `src/frontend/utils/updateSettings.ts:256-259` — runtime `setProperty("--" + key, value)` on `document.documentElement`.
- `src/frontend/components/settings/tabs/defaultThemes.ts` — theme color keys (`primary`, `secondary`, `secondary-text`, …).
- `src/frontend/main.ts:23` — `new App({ target })` (removed component API).
- `src/electron/utils/windowOptions.ts:9-117` — per-window `webPreferences`, transparency, frameless, `backgroundThrottling: false`, `contextIsolation: false` windows.
- `.planning/codebase/CONCERNS.md`, `.planning/codebase/CONVENTIONS.md`, `.planning/PROJECT.md` — god modules, missing test gate, a11y disabled, native module rebuild risk, theming reconciliation requirement.
- Corpus counts (direct grep): 464 frontend `.svelte`, 351 `<style>` blocks, 259 `export let`, 308 `on:click` files (566 with any `on:` directive), 65 `createEventDispatcher`, 138 `bind:`, 26 `<slot>`, 40 `$$props`, 24 `use:` actions, 118 `transition:` files, 15 event-modifier usages, 157 files containing `:global(`, 83 server `.svelte` files.

**Official documentation & Context7 (HIGH/MEDIUM confidence):**
- Svelte 5 migration guide (`/sveltejs/svelte` via Context7; svelte.dev) — legacy mode, per-file model exclusivity, `$props`/`$state`/`$derived`/`$effect`, `createEventDispatcher` → callback props, `<svelte:component>` unnecessary, `children` reserved, `mount()`.
- `@sveltejs/vite-plugin-svelte` changelog (GitHub) — v4 removes Svelte 3/Svelte 4 support and moves to Vite 5; later majors require Vite 6/7, Node 20.19+, and `verbatimModuleSyntax` for the TS preprocessor; `vitePreprocess` disables script preprocessing by default.
- shadcn-svelte docs (shadcn-svelte.com; Context7 `/websites/shadcn-svelte`) — Svelte 5 requires `bits-ui@^1`, `mode-watcher@^1`, `@lucide/svelte`; Svelte 4 line frozen at `bits-ui@0.22` + Tailwind 3 under Legacy Docs; Tailwind v4 install (`@tailwindcss/vite`, `@theme inline`, `@custom-variant dark`); theming tokens and the "don't use `--primary` for your brand color" guidance.
- Tailwind CSS v4 docs (tailwindcss.com; Context7 `/websites/tailwindcss`) — Preflight contents and how to disable it; partial-layer imports; `prefix(tw)` migration path for existing projects; `source()` / `@source` / `@source not` / `@source inline()` (4.1); automatic source detection honours `.gitignore` and the git root; `@theme inline` and the `--color-` prefix requirement for utilities.
- Tailwind CSS v4 upgrade guide — unreleased/new v4 behavior differences (dialog margins, button cursor) that affect an existing app.
- Bits UI migration guide (bits-ui.com) — v1 rewrite for Svelte 5.

**Community (MEDIUM/LOW confidence, corroborating):**
- Reports of Oxide native binaries failing silently under QEMU emulated cross-builds (errorfirst.com; tailwindlabs/tailwindcss discussion #19661) — corroborates the repo's own optional-dependency note.
- "Move to Tailwind without breaking existing styles" (HyperUI) and Tailwind Preflight collision reports (StackOverflow 72654538, tailwindlabs discussion #16597) — corroborate the Preflight-breaks-legacy-styles hazard.
- Svelte 5 migration experience write-ups (dev.to, Okupter, sveltejs/svelte discussion #14131) — bottom-up migration, `on:click` vs `onclick` mixing, `$effect` timing, `svelte/legacy` bridges.
- Tailwind bloat reports from pattern-based safelists (javascript.plainenglish.io) — corroborates the CSS-size trap.

---
*Pitfalls research for: FreeShow — shadcn/Tailwind design-system revamp starting with Settings*
*Researched: 2026-10-17*
