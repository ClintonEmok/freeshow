# Phase 1: Toolchain Gate — Research

**Researched:** 2026-10-17 / 2026-10-18
**Domain:** Build-platform migration inside an Electron + bespoke-Vite + Svelte desktop app (Svelte 5 legacy mode, Vite 7, TypeScript 5.9, ESLint/lint plugin, Vitest, Terser, cross-OS packaging)
**Confidence:** HIGH on the mechanical migration and every repo claim; MEDIUM on two items flagged explicitly (Rollup 4 `assetInfo.name` deprecation timing, Electron page viewport control in Playwright)

**Phase requirement IDs:** TOOL-01, TOOL-02, TOOL-03, TOOL-04
**Repo state at research time:** `node_modules/` is **empty** — nothing has been installed (`ls node_modules | wc -l` → 0). No command in the acceptance criteria has been run yet, so every "baseline" number in this phase is still unknown and must be measured in plan 01-01.

---

## Summary

Three things were true before this research and are now false:

1. **The repo's own tsconfig chain is already incompatible with TypeScript 5.9** — and this was not previously known. `src/frontend/tsconfig.json` and `src/server/tsconfig.json` both `extends "@tsconfig/svelte/tsconfig.json"`, and the installed `@tsconfig/svelte@2.0.1` sets `"importsNotUsedAsValues": "error"`. TypeScript 5.5 made that option an **error** (`TS5102: Option 'importsNotUsedAsValues' has been removed`), so TS 5.9 cannot read the current config at all. The fix (bump the base) drags in `verbatimModuleSyntax: true` **and** `strict: true`; the `strict` flip is the dangerous half and must be explicitly overridden or the "no new errors" criterion fails by an order of magnitude.
2. **A Vite 6 breaking change silently renames the production stylesheet.** In Vite 6+, library-mode CSS is no longer always `style.css`; it is derived from `build.lib.cssFileName` → `build.lib.fileName` (string only) → `package.json` `name`. FreeShow's `fileName: () => "bundle.js"` is a *function*, so the fallback is the package name and the emitted asset would be **`freeshow.css`** — not `bundle.css`. It only still works because the `assetFileNames` hook happens to strip-and-rename anything ending in `.css`. That is an accident, not a contract. Both the renderer and the four server builds need an explicit `cssFileName`.
3. **The Svelte 5 a11y-warning suppression in two config files stops working.** Svelte 5 renamed all compiler warning codes from kebab-case to snake_case ("Compiler error and warning codes have been updated to use underscores instead of dashes"), so `warning.code.startsWith("a11y-")` in `vite.config.mjs:15` and `config/building/vite.config.servers.mjs:79` never matches again.

Beyond that, the migration is genuinely small and the risk surface is smaller than the research files imply:

- **Legacy mode needs no flag and no config.** Svelte 5 auto-selects legacy mode per component. `compatibility.componentApi: 4` is only for keeping `new App()` alive — and this phase removes `new App()` at all six sites instead. Zero `<svelte:options>`, zero `svelte/internal`, zero `SvelteComponentTyped` in the repo (re-verified).
- **No code-emit TypeScript features exist in any `.svelte` file** (0 `enum`, 0 `using`, 0 decorators, 0 parameter properties) and **no `<style lang="scss">` anywhere** — so Svelte 5's native `lang="ts"` handling plus `vitePreprocess()` defaults is sufficient, and `svelte-preprocess` can be dropped outright rather than "kept and turned off".
- **`verbatimModuleSyntax` costs 8 one-line edits.** A repo-wide scan of 1013 source files found 8 ambiguous type imports (all in `.ts`, none in `.svelte`) and 0 type-only re-exports.
- **Terser never minifies the shipped Svelte bundle.** `scripts/postBuild.js` Terser runs over `build/electron/**`, `build/types/**` and a **dead** `build/public/**` copy; electron-builder ships `build/electron/**`, `build/types/**` and `public/**` (verified in `config/building/electron-builder.yaml:10-13`). So the `mangle.toplevel` × Svelte 5 risk is real only as "`npm run postbuild` must not `process.abort()`" — not as a shippable-bundle risk. PITFALLS.md's framing ("re-validate Terser against Svelte 5 output early") can be downgraded to a postbuild step in plan 01-03.

**Primary recommendation:** sequence the phase exactly as ROADMAP has it, but invert two priorities. First, **pin every baseline command explicitly** (`svelte-check --tsconfig …`, an eslint fixture that proves the plugin is loaded, vitest total/skip counts) — because "no new errors vs. baseline" is unenforceable while `npm run test:svelte` resolves no tsconfig and the ESLint Svelte job currently enables no `svelte/*` rules at all. Second, **make `vite.config.mjs` and `vite.config.servers.mjs` independent of Vite defaults** (`cssFileName`, `assetInfo.names`, `a11y_`) before touching `svelte`, `vite` or `typescript` versions — those are the config changes that the Vite 4→7 jump actually breaks.

---

## Standard Stack

Versions are carried forward from `.planning/research/STACK.md` (npm-registry verified 2026-10-17) except where marked; nothing in this research contradicted them.

### Core

| Library | From | To | Purpose | Why |
|---|---|---|---|---|
| `svelte` | 3.59.2 | **5.57.2** | Compiler / runtime | Legacy mode runs all 547 existing components unchanged; `bits-ui@2` (Phase 4) floors at `svelte ^5.33.0` |
| `@sveltejs/vite-plugin-svelte` | 2.5.3 | **6.2.4** | Svelte compilation in Vite | Highest line whose peer is `vite ^6.3.0 \|\| ^7.0.0`. 7.x requires Vite 8 |
| `vite` | 4.5.14 | **7.3.7** | Renderer + server bundler | Keeps Rollup; Vite 8 swaps in Rolldown and would break the IIFE `build.lib` shape |
| `typescript` | 4.9.5 | **5.9.3** | Type system | Hard floor. TS 4.9.5 cannot be kept (see Q4) |
| `@tsconfig/svelte` | 2.0.1 | **5.0.0** | Shared Svelte tsconfig base | **Mandatory bump** — 2.0.1 contains the removed `importsNotUsedAsValues` (see Q4) |

### Checks and tests

| Library | From | To | Notes |
|---|---|---|---|
| `svelte-check` | 2.10.3 | **4.7.7** | Peer `svelte ^4 \|\| ^5`, `typescript ^5 \|\| ^6` |
| `vitest` | 2.1.9 | **4.1.12** | Peer `vite ^6 \|\| ^7 \|\| ^8`; Vite is a *required peer* in Vitest 4/5 |
| `prettier-plugin-svelte` | 3.4.0 | **4.1.1** | Keep `prettier@3.6.2` and `printWidth: 500` |
| `eslint` | 8.57.1 | **8.57.1 (keep)** | Required by `eslint-plugin-svelte@3`'s peer range; see Q3 for the flat-config consequence |
| `eslint-plugin-svelte3` | 4.0.0 | **remove** → `eslint-plugin-svelte@3.23.1` | Svelte-3 only, will not parse Svelte 5 |
| — | — | **+ `svelte-eslint-parser@1.9.0`** | Required parser for eslint-plugin-svelte |
| `@typescript-eslint/*@5.62.0` | — | **`typescript-eslint@8.71.2`** | v5 caps below TS 5.9; peer `typescript >=4.8.4 <6.1.0` |
| `svelte-preprocess` | 4.10.7 | **remove** | Replaced by `vitePreprocess()`; see Q6 |

### Declare explicitly (currently only present transitively)

| Package | Version in lockfile | Why |
|---|---|---|
| `terser` | **5.43.1** (`node_modules/terser`, pulled in by `@rollup/plugin-terser@1.0.0`) | `scripts/postBuild.js:4` does `require("terser")` with no `package.json` entry. It resolves today only because npm hoisted it. Vite's `minify: "terser"` (used by `vite.config.servers.mjs:106`) also resolves it. Pin it so neither path can break on a lockfile refresh |

### Installation

```bash
# 0. Precondition: nothing is installed. Baseline first, installs second.
npm ci

# 1. Framework + bundler (replaces the existing four)
npm i -D svelte@5.57.2 @sveltejs/vite-plugin-svelte@6.2.4 vite@7.3.7 typescript@5.9.3 @tsconfig/svelte@5.0.0

# 2. Checks
npm i -D svelte-check@4.7.7 vitest@4.1.12 prettier-plugin-svelte@4.1.1

# 3. Lint toolchain
npm i -D eslint-plugin-svelte@3.23.1 svelte-eslint-parser@1.9.0 typescript-eslint@8.71.2
npm uninstall eslint-plugin-svelte3 @typescript-eslint/eslint-plugin @typescript-eslint/parser svelte-preprocess

# 4. Declare what postBuild already requires
npm i -D terser@5.43.1
```

**Do not** add `@sveltejs/vite-plugin-svelte@7`, `vite@8`, or `typescript@6`/`7` in this phase (deferred by CONTEXT.md; TS 7 is rejected by both `svelte-check` and `typescript-eslint` peers).

---

## The Eight Specific Questions

### Q1. Vite 7 × the IIFE `build.lib` output — does the shape survive?

**Verdict: yes, with one required config change.** `build.lib` + `formats: ["iife"]` + `name` + `fileName()` + `outDir` + `emptyOutDir: false` + `root` + `publicDir: false` + `resolve.dedupe` are all still valid in Vite 7. **Confidence: HIGH** (Vite 7 migration guide + Vite 7 build-options docs).

What actually changed between Vite 4 and 7 that touches this config:

| Version | Change | Effect here |
|---|---|---|
| Vite 5 | Rollup 3 → **Rollup 4** | `build.rollupOptions.output` semantics change slightly; `assetFileNames` still honoured |
| Vite 5 | `build.lib.cssFileName` **did not exist**; CSS was always `style.css` | the existing hook was written for this world |
| **Vite 6** | **Library-mode CSS file name is now derived, not fixed.** "From Vite 6, the default file name now uses `"name"` in `package.json` similar to the JS output files. If `build.lib.fileName` is set with a string, the value will also be used for the CSS output file name. To explicitly set a different CSS file name, you can use the new `build.lib.cssFileName`." | **This is the one that changes behaviour** |
| Vite 6 | `assetFileNames` default in lib mode is `[name].[ext]` (Vite's own default), user-supplied `output` values still spread over it | the existing hook still applies |
| Vite 7 | Node ≥ 20.19 / 22.12; `build.target` default renamed to `baseline-widely-available` (Chrome 107+); `splitVendorChunkPlugin` removed; `transformIndexHtml` hook-level `enforce`/`transform` removed; Sass legacy API removed | none apply — repo engines are `>=22.12.0`, Electron 37 is Chromium 138, no Sass, no `splitVendorChunkPlugin`, `postBuild` rewrites HTML as text, not via a Vite hook |

The exact resolver, from Vite's own source (`packages/vite/src/node/plugins/css.ts`):

```ts
export function resolveLibCssFilename(libOptions, root, packageCache): string {
  if (typeof libOptions.cssFileName === 'string') return `${libOptions.cssFileName}.css`
  else if (typeof libOptions.fileName === 'string') return `${libOptions.fileName}.css`
  const packageJson = findNearestMainPackageData(root, packageCache)?.data
  const name = packageJson ? getPkgName(packageJson.name) : undefined
  if (!name) throw new Error('Name in package.json is required if option "build.lib.cssFileName" is not provided.')
  return `${name}.css`
}
```

FreeShow has `fileName: () => "bundle.js"` (a **function**, not a string) → the `else if` branch is skipped → `package.json` `name` = `freeshow` → **`freeshow.css`**. The rename to `bundle.css` then happens only because the repo's `assetFileNames` hook matches on the `.css` suffix. Two consequences:

- It will probably keep working, because the hook is suffix-based and Rollup calls `assetFileNames` with the asset's name. **But it is one property rename away from breaking.**
- Rollup 4 introduced `PreRenderedAsset.names` (array) and deprecated `PreRenderedAsset.name`. `vite.config.mjs:35` calls `assetInfo.name.endsWith(".css")` — if `name` is ever absent this throws `TypeError: Cannot read properties of undefined`, which fails the build after CSS was already extracted. **Confidence: MEDIUM** — I could not pin the exact Rollup minor that removes `name`, only that it is deprecated in Rollup 4.

**Actions (both configs, before the version bump):**

1. Set `build.lib.cssFileName: "bundle"` (renderer) / `"styles"` (each server). This is the *documented* mechanism for Vite 6+, so the outcome is deterministic regardless of the `assetFileNames` path.
2. Make the hook name-agnostic: `const names = assetInfo.names ?? (assetInfo.name ? [assetInfo.name] : [])`.
3. Keep `assetFileNames` (it is harmless and covers future non-CSS assets), and assert the output (see Validation Architecture).

Note `build.lib` forces `cssCodeSplit: false` by default ("If you specify `build.lib`, `build.cssCodeSplit` will be `false` as default"), which is the mechanism that makes "**exactly one** CSS asset" true today. Keep it implicit or set it explicitly; do not enable it.

### Q2. Terser × Svelte 5 output

**Verdict: the risk is a hard abort of `npm run postbuild`, not a broken shipped bundle — and the fallback is trivial.** **Confidence: HIGH for the file-flow analysis (direct source reading); MEDIUM for Terser's parse behaviour on Svelte 5 output (not testable until `npm ci` runs).**

`scripts/postBuild.js` runs Terser over:

| Target | Source | Shipped? |
|---|---|---|
| `build/electron/**`, `build/types/**` | `tsc --p tsconfig.electron.prod.json` output | **Yes** (`electron-builder.yaml:11-12`) — but unchanged by this phase |
| `build/public/**` (includes `build/public/build/bundle.js`, the Svelte IIFE) | `copyPublicFolderAndMinify("public" → "build/public")` at `postBuild.js:183` | **No** — not in electron-builder's `files` list |
| `public/build/bundle.js` (the file that *is* shipped, via `files: public/**`) | Vite, `minify` unset → default `esbuild` | **Yes**, and **never passed through Terser** |

So: Terser 5.43.1 (from `node_modules/terser`, per `package-lock.json`) *does* parse Svelte 5 output — but only in a dead copy. Failure mode is `minifyJS` → `process.abort()` (`postBuild.js:104`), which kills `npm run postbuild` and therefore `npm run release`, with no diagnostic beyond a warning. Vite itself already bumped its minimum supported terser to 5.16.0, and 5.43.1 satisfies it.

**Actions:**
- Keep the plan's Terser validation, but scope it as "**`npm run postbuild` completes with exit 0 after the Svelte 5 bump**" — not "the shipped bundle is correct".
- Fallback ladder, in order of preference: (a) skip `.js` under the copied `public/build/` in `copyPublicFolderAndMinify` (one condition, zero behaviour change to shipped files); (b) delete the now-provably-dead `build/public/**` copy entirely, keeping only the `icon.png`/`dmg.png` the builder references; (c) set `minify: "terser"` on the renderer build and stop re-minifying copied files.
- Do **not** rely on `mangle.toplevel` being safe by reasoning. Test it by running `node scripts/postBuild.js` and asserting exit 0.

### Q3. `eslint-plugin-svelte@3` against ESLint 8.57 eslintrc

**Verdict: it does not work in eslintrc. v3 is flat-config only.** **Confidence: HIGH** (upstream migration guide, quoted below).

> "**ESLint Flat Config Only** — `.eslintrc.js` and `.eslintrc.json` are **no longer supported**. You must use **Flat Config (`eslint.config.js`)**."

ESLint 8.57.1 *is* inside the peer range (`eslint ^8.57.1 || ^9 || ^10`), so the version stays; only the **config format** of the Svelte lint job must change. ESLint 8.57 supports flat config when `ESLINT_USE_FLAT_CONFIG=true` is set, and `--config <file>` *does* work in that mode (confirmed by an ESLint maintainer on eslint/eslint#18212 and in the migration guide). Also note, for flat-config CLI mode: `--ext` is **not** supported, `--env` is not supported, and `files`/`ignores` patterns in an alternate `--config` file are resolved **relative to the current working directory**.

**What is actually at risk of being "silently dropped"** (the criterion-4 trap):

Reading `config/linting/eslint.svelte.js`, the job extends only `plugin:@typescript-eslint/recommended*` + `prettier`, enables the `svelte3/svelte3` **processor**, and enables **no `svelte3/*` rule** — the only svelte rule line is commented out (`eslint.svelte.js:43`), and the file's own note says the a11y disable "not working". Its real behaviour therefore comes from `eslint-plugin-svelte3`'s one distinguishing feature: it **reports Svelte compiler errors/warnings as lint problems**, plus the enabled `@typescript-eslint` rules running inside `<script>`.

In `eslint-plugin-svelte@3`, that compiler check is the rule `svelte/valid-compile` — and the v3 migration guide states explicitly: "**`svelte/valid-compile` has been removed from `recommended`**." So a naive `svelte.configs.recommended` swap **drops the check that existed before**. It must be re-enabled by hand:

```js
"rules": { "svelte/valid-compile": ["error", { "ignoreWarnings": true }] }
```

`ignoreWarnings: true` preserves the current intent (compile *errors* are fatal, a11y warnings stay muted until Phase 6).

**Recommended end state (Option A — lowest blast radius):**

- Keep `eslint@8.57.1`.
- Replace `config/linting/eslint.svelte.js` with a **flat** config (e.g. `config/linting/eslint.svelte.flat.mjs`) built on `eslint-plugin-svelte`'s `configs.recommended` + `svelte-eslint-parser` + `typescript-eslint`'s parser, re-applying the existing `@typescript-eslint/*` overrides verbatim.
- `package.json`: `"lint:svelte": "cross-env ESLINT_USE_FLAT_CONFIG=true eslint -c config/linting/eslint.svelte.flat.mjs --fix src/frontend"` (drop `--ext`, move the file glob into `files:`).
- Leave `eslint.electron.json`, `eslint.frontend.json` and `.stylelintrc.json` untouched (still eslintrc — that still works under ESLint 8.57).

**Fallback (Option B)** if 8.57 flat mode misbehaves: bump ESLint to `^9` and migrate all four configs. That also forces `eslint-plugin-jsdoc@39` and `eslint-plugin-prefer-arrow@1.2.3` bumps (their peers stop at ESLint 8), so it is a materially larger change. Decide with a 30-minute spike: does `ESLINT_USE_FLAT_CONFIG=true npx eslint -c <flat file> --fix src/frontend/components/helpers/T.svelte` produce findings?

**Note for the record:** eslintrc is removed in ESLint 10 and ESLint 9 is EOL as of 2026-08-06, so Option A is a deliberate bridge, not a destination. Record it as deferred.

### Q4. `verbatimModuleSyntax` — required, and what does it cost?

**Verdict: it is not "required by Svelte" — it is forced on us by the *removed* option in `@tsconfig/svelte@2.0.1`. The cost is 8 one-line edits.** **Confidence: HIGH** (TS release notes + npm registry package contents + repo scan).

The chain, verified end to end:

1. `src/frontend/tsconfig.json:2` and `src/server/tsconfig.json:2` both `"extends": "@tsconfig/svelte/tsconfig.json"`.
2. Installed `@tsconfig/svelte@2.0.1` (fetched from unpkg) contains:
   ```json
   "moduleResolution": "node", "target": "es2017",
   "importsNotUsedAsValues": "error", "isolatedModules": true,
   "strict": false, "esModuleInterop": true, "skipLibCheck": true, "forceConsistentCasingInFileNames": true
   ```
3. TypeScript 5.0 deprecated `importsNotUsedAsValues`; **TypeScript 5.5 makes it a hard error**: `error TS5102: Option 'importsNotUsedAsValues' has been removed. Please remove it from your configuration. Use 'verbatimModuleSyntax' instead.` (`ignoreDeprecations: "5.0"` no longer silences it.)
4. ⇒ **TS 5.9 cannot load the current frontend or server tsconfig.** A child config cannot escape an inherited removed option by re-declaring it; the base must change or the `extends` must go.
5. Current `@tsconfig/svelte@5.0.0` (fetched from unpkg) is:
   ```json
   "module": "esnext", "moduleResolution": "bundler", "target": "es2017",
   "verbatimModuleSyntax": true, "sourceMap": true, "strict": true,
   "esModuleInterop": true, "skipLibCheck": true
   ```
   Note two behavioural flips: `verbatimModuleSyntax: true` **and `strict: true`**. The repo relies on inheriting `strict: false` (it comments `strict` and `noImplicitAny` out of the frontend config) — inheriting `strict: true` would additionally turn on `noImplicitAny`, `strictPropertyInitialization`, `strictBindCallApply`, `alwaysStrict` and `useUnknownInCatchVariables` against ~2,733 `: any` uses. **That alone would destroy criterion 4.**

Cost measurement (my own scan of all 1013 `.ts`/`.svelte` files under `src/`):

| Violation class | Count | Where |
|---|---|---|
| `import { Type }` where the name is declared `export interface`/`export type` | **8** | `src/frontend/audio/audioAnalyser.ts`, `src/frontend/components/export/projectLink.ts` (11 names, 1 line), `src/frontend/components/timeline/TimelinePlayback.ts`, `src/frontend/utils/searchFast.ts`, `src/server/remote/util/socket.ts`, `src/server/remote/util/stores.ts`, `src/server/stage/util/itemHelpers.ts`, `src/server/stage/util/stores.ts` |
| Same, inside `.svelte` files | **0** | — |
| `export { Type }` / `export { Type } from "…"` re-export of a type | **0** | — |

The 0-in-`.svelte` result matters independently: Svelte 5 strips types itself and cannot elide an import it can't prove is type-only, so an ambiguous type import inside a component becomes a *bundler* error ("X is not exported by …"). The repo is clean of that class today.

**Actions:**
- Bump `@tsconfig/svelte` to `^5` (or inline its contents and drop the `extends`).
- **Explicitly pin the options that must not change**, in both configs, rather than inheriting them: `"strict": false` (frontend; server already sets `strict: true` itself), `"module": "ESNext"`, `"moduleResolution": "Bundler"`.
- Fix the 8 imports with `import type` / inline `type`.
- Turn the finding into a guard: `verbatimModuleSyntax: true` means a future `<script lang="ts">` cannot import a type as a value. `eslint.frontend.json` already enforces `@typescript-eslint/consistent-type-imports` on `.ts`; **add the same rule to the new flat Svelte lint config** so `.svelte` files are covered too.
- Also add a guard for the *other* native-TS limitation: Svelte 5 does not support TS features that **emit code** inside `<script lang="ts">`. The repo has zero today (0 `enum`, 0 `using`, 0 decorators, 0 constructor parameter properties across 542 `.svelte` files — verified). If one is ever added, either move it to a `.ts` module or set `vitePreprocess({ script: true })`. Record this as a one-line rule in the phase's notes.

**`moduleResolution: "bundler"` risk (MEDIUM, flag for the spike):** the frontend currently type-checks under `moduleResolution: "node"` with no explicit `module` (TS default `commonjs`). `bundler` is more permissive about `exports` maps and extensionless imports; it should reduce errors, not add them, but it is a real behaviour change — pin it explicitly so a later base bump cannot move it silently.

### Q5. What exactly is needed for Svelte 5 legacy mode?

**Verdict: nothing — legacy mode is the automatic default, and `compatibility.componentApi` is *not* needed because this phase replaces the six `new App()` sites.** **Confidence: HIGH** (Svelte 5 migration guide + `legacy-overview` + `svelte-options` via Context7).

- "Svelte 5 distinguishes between legacy mode and runes mode. **Legacy mode supports older Svelte 3/4 syntax**, while runes mode is activated by using runes or setting the compiler option to `true`." A component that uses no rune is legacy. There is no project-wide "legacy mode" switch to set, and the supported opt-outs are per-component (`<svelte:options runes={false} />`) — which the repo does not use.
- `compilerOptions.compatibility.componentApi: 4` exists **only** to keep Svelte-4-style instantiation (`new Component(...)`) working. It is documented as "deprecated and intended only as temporary migration aids". Since all six sites become `mount(App, …)`, enabling it would be pure legacy weight. **Do not set it.**
- Verified legacy surface that stays live in this repo: `export let` (317 files), `$:` (419), `on:` (404 files / 1856 uses, incl. 26 modifier uses such as `on:click|stopPropagation`, `on:wheel|passive`, `on:keydown|capture`), `<slot>` (52), earlier-reported `createEventDispatcher` (77 files / 154 call sites), `bind:`, `<svelte:component>` (13), `<svelte:window>` (66), `:local` transition modifier (1), `svelte/store` (152 imports), `svelte/transition` (29), `svelte/easing` (4), `svelte/motion` (2), `tick` (22).
- Verified **absent** (so no rewrite is required): `svelte/internal`, `svelte/compiler`, `svelte/register`, `svelte/ssr`, `SvelteComponentTyped`, `$$restProps`, `<svelte:options>`, `.$set(`.
- **The one required config change is the warning-code rename**: "Compiler error and warning codes have been updated to use underscores instead of dashes." → `vite.config.mjs:15` and `config/building/vite.config.servers.mjs:79` must change `startsWith("a11y-")` → `startsWith("a11y_")`, or every a11y warning becomes visible in build output (a dropped suppression, not a dropped *check*, but it is exactly the "silently made different" failure the criterion is about).
- The six mount sites (`src/frontend/main.ts:23`, `src/server/{remote,stage,controller,output_stream,cam}/main.ts:3`) become:
  ```ts
  import { mount } from "svelte"
  const app = mount(App, { target: document.body })            // frontend
  const app = mount(App, { target: document.body, props: {} }) // each server
  ```
  Keep `export default app` (an IIFE lib build assigns the default export to the global; removing it is a gratuitous change).
- `import "svelte"` at `src/frontend/main.ts:5` is vestigial in Svelte 5 (the runtime is imported by compiled components) but harmless — leave it to keep the source diff at exactly one line per entry.

### Q6. `svelte-preprocess` vs `vitePreprocess()` — correct end state, and who reads `svelte.config.mjs`

**Verdict: drop `svelte-preprocess` and use `vitePreprocess()` with its defaults; put it in *both* config files so neither dev nor prod depends on config discovery.** **Confidence: HIGH** (vite-plugin-svelte `preprocess.md` / `config.md` + repo scan).

Facts:

- `vitePreprocess()` defaults are **`{ script: false, style: true }`**. The docs: "**TypeScript is no longer preprocessed by default as Svelte 5 understands most syntax natively.** If you use TypeScript features that emit code (like `enum`, `using`, `accessors`, decorators or class declarations with visibility modifiers), you have to enable the script preprocessor by setting the `script` option to `true`."
- Repo scan: 542 `.svelte` files with `<script lang="ts">`, **zero** `<style lang="…">` blocks (no SCSS/Less/Stylus/SugarSS anywhere in `src`), **zero** code-emitting TS features inside components. ⇒ `script: false` is correct and `style: true` is a no-op. Nothing needs a preprocessor. **No `@import`-style preprocess features (template tag, external files, global styles) are used.**
- Upstream guidance for keeping `svelte-preprocess` at all: "you can still use `svelte-preprocess`, but **make sure to turn off its script and style preprocessing options**" — i.e. keeping it buys nothing here.
- **Who reads `svelte.config.mjs`:** `vite-plugin-svelte` auto-discovers `svelte.config.js|mjs|ts|mts` (path relative to the **Vite root**, overridable with the `configFile` inline option) and merges it under inline plugin options; `svelte-check` also consumes it (or `--config <path>`). **Trap:** `vite.config.mjs:20` sets `root: production ? "." : "public"` — so in **dev** the plugin's search root is `public/`, where `svelte.config.mjs` does not exist. Today that is harmless because `vite.config.mjs:9` already passes `preprocess: vitePreprocess()` inline. After this phase it must stay harmless: **keep the inline `preprocess` and set the same preprocess in `svelte.config.mjs`**, or pass `configFile: "svelte.config.mjs"` explicitly. Either way, verify empirically in both NODE_ENV modes rather than trusting discovery. **Confidence: MEDIUM** on the discovery-root detail (read from docs, not executed — `node_modules` is empty).

**Correct end state:**

```js
// svelte.config.mjs  — read by svelte-check and (conditionally) by vite-plugin-svelte
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"
export default { preprocess: [vitePreprocess()] }
```

`vite.config.mjs` keeps `preprocess: vitePreprocess()` (unchanged line). `config/typescript/tsconfig.svelte{,.prod}.json` survive: they are still referenced by `config/linting/eslint.svelte.js:17` (`parserOptions.project`) and must be referenced by the pinned `svelte-check --tsconfig` (see Q4 / Validation). The `tsconfigFile` option that would have been passed to `svelte-preprocess` has no `vitePreprocess` equivalent — that is fine because Svelte 5 needs no tsconfig to strip types, but **it means the `.svelte` files stop being resolved through `tsconfig.svelte.json`** at build time. Path aliases are unaffected: the repo uses only relative imports (CONVENTIONS.md) plus the dev-only `"/src"` Vite alias.

### Q7. The five server apps

**Verdict: there are only **four** built server apps; `cam` is an orphan. Do not invent work for it, but do change the shared config for the four.** **Confidence: HIGH** (direct source).

- `config/building/vite.config.servers.mjs:7-12` defines exactly `{ remote, stage, controller, output_stream }`. `src/server/cam/` exists (with `App.svelte`, `main.ts:3` doing `new App(…)`, `index.html` referencing `styles.css`), but it is **not** in that map; `scripts/vite/createServerFiles.js` iterates `Object.keys(servers)`; and the legacy `config/building/rollup.config.mjs` has the cam entry commented out (`// webServer("cam")`). Nothing builds `src/server/cam`.
- They **do not share `vite.config.mjs`** — `getServerViteConfig()` is a separate config object with its own `root`, `publicDir`, `build.lib` (`fileName: () => "client.js"`), `assetFileNames` → `styles.css`, `minify: production ? "terser" : false`, `sourcemap`, `resolve.alias { "@": <root>/src }`, and `server.port = 3001 + index`. They must move with the Svelte plugin (they import `svelte` and `vitePreprocess` from `@sveltejs/vite-plugin-svelte@2.5.3` today, which will not compile Svelte 5).
- They need the same three edits as the renderer: (a) `cssFileName: "styles"` in `build.lib` (Vite 6+ derivation would otherwise emit `freeshow.css` while every `index.html` links `styles.css` — a silently unstyled remote/stage/controller/output_stream on stage, which is *worse* than a build failure); (b) the `assetInfo.names` fix; (c) `a11y-` → `a11y_` in `onwarn`.
- All five `index.html` files link `styles.css` + `client.js` (verified for all five, including the unbuilt `cam`).
- The server apps are built by `npm run build:servers:prod` → `scripts/vite/createServerFiles.js` → `build({ ...getServerViteConfig(id), configFile: false })`. **`configFile: false`** means `svelte.config.mjs` is *not* loaded for server builds — another reason the inline `preprocess` must stay in `getServerViteConfig`.

### Q8. Pixel-diff feasibility — the practical capture-and-diff path in this repo

**Verdict: reuse the Playwright Electron harness, add one spec, compare with Playwright's built-in `toHaveScreenshot`. Cheapest reliable path; no new dependency, and the capture is CDP-based so window visibility does not matter.** **Confidence: MEDIUM-HIGH** — mechanism verified from Playwright's own source and docs; the `TYPE=output` part is a *mechanism that does not exist yet* and must be built (see below).

**First, a correction to the framing:** there is no `TYPE=output` launch flag, env var, or CLI arg anywhere in the repo. `TYPE` is an IPC *message*: `loadWindowContent(window, "output")` registers `window.webContents.ipc.on(STARTUP, …)` and replies `{ channel: "TYPE", data: "output" }` to the window's `READY` message (`src/electron/index.ts:265-279`). The renderer branches on it in `startup()` (`src/frontend/utils/startup.ts:32-55`) → `currentWindow.set("output")` → `App.svelte:81` renders `<MainOutput />`. So "captured with `TYPE=output`" means "**a window that went through the output branch**", and the harness has to *create* one. Cheapest ways, in order:

1. **Drive the UI** the way `config/testing/start.test.ts` already does (fresh store via `FS_MOCK_STORE_PATH`, mocked `dialog.showOpenDialog`, first-run setup, create project/show/lyrics), then trigger an output. Output creation is `send(OUTPUT, ["CREATE"], { id, ...output })` (`src/frontend/components/settings/tabs/OutputsTabs.svelte:66,77`, `Outputs.svelte:81,92`, `helpers/output.ts:1153,1204`) and lands in `OutputLifecycle.createOutput()` (`src/electron/output/helpers/OutputLifecycle.ts:80`).
2. **Skip the UI** with `electronApp.evaluate()` and call the app's own loader in the main process:
   ```js
   const page = await electronApp.evaluate(async ({ BrowserWindow }, appPath) => {
     const app = require(appPath + "/build/electron/index.js")
     const win = new BrowserWindow({ width: 1920, height: 1080, show: false, frame: false, webPreferences: { preload: appPath + "/build/electron/preload", contextIsolation: true } })
     await app.loadWindowContent(win, "output")
     return win.id
   }, await electronApp.evaluate(({ app }) => app.getAppPath()))
   ```
   Then locate the page: `electronApp.windows()` → find the one whose DOM matches `#output_window` (`MainOutput.svelte:56` is that stable hook; the main window never has it, because `App.svelte:81` only renders `<MainOutput />` when `currentWindow === "output"`). Prefer this to `windows()[2]`; window order is not a contract.

**Determinism controls (all required, or the gate is flaky and gets ignored):**

| Control | How |
|---|---|
| Fixed pixel size | Target 1920×1080. Try `page.setViewportSize({ width: 1920, height: 1080 })` first (Playwright drives Chromium's `Emulation.setDeviceMetricsOverride`, which does not need an OS window that big); if it no-ops for Electron pages, fall back to `electronApp.evaluate` → `BrowserWindow.setContentSize(1920, 1080)`. **On Linux CI the fallback needs a big enough virtual screen** — `playwright.yml` currently runs `xvfb-run --server-args="-screen 0 1280x960x24"`, and Electron's `enableLargerThanScreen` is macOS-only, so a 1920×1080 window would be clamped there |
| Device scale | `page.screenshot({ scale: "css" })` — otherwise Retina returns a 3840×2160 PNG and the baseline is machine-specific |
| Animation/transition settling | `expect(page).toHaveScreenshot({ animations: "disabled", caret: "hide" })` plus an explicit wait for the content to be present (the existing spec's `delay()` idiom) |
| Content | A **text-bearing** frame. A "nothing playing" output is largely transparent/black and would not catch the class of regression this gate exists for (P2's Preflight changing margins/fonts on lyrics). Reuse the show the existing spec already creates ("test line 1..4"), then select it and let the output render it. Assert the text is in the output DOM *before* screenshotting — that also guards against a blank capture |
| Non-blankness | Assert the PNG is 1920×1080 **and** not a single uniform colour. A black/blank frame must never pass as "no diff" |
| Baseline scope | Playwright's default snapshot template already includes `{platform}`, which is the honest scope: pixel-identical is a same-machine claim. Cross-OS comparison is not achievable (different font rasterisation) — per-OS baselines are re-captured as part of the release smoke checklist |

**Diff tool: Playwright's own `toHaveScreenshot`** (`@playwright/test@1.56.1` is already a dependency; no `pixelmatch`/`pngjs` addition). Generate the baseline pre-upgrade with `--update-snapshots` and commit it (`test-output/` is gitignored, so snapshots must go under the spec's default `*-snapshots/` directory next to `config/testing/`). Assert `maxDiffPixels: 0` first; if font-hinting noise makes that flaky on a given machine, relax to `maxDiffPixelRatio: 0.001` **and** keep the generated diff image for human review. Do not silently raise the threshold — that turns the gate into a decoration, which is precisely what this phase is supposed to prevent.

**Where NOT to put the effort:** `osr-capture` + `FS_CAP_STATS` (`src/electron/capture/`, `OutputLifecycle.ts:216-230`) is the live-presentation offscreen path, gated on `output.invisible === true` and an optional native addon. It is the right tool for verifying *frame delivery* (a later phase), and the wrong tool here: it adds native-addon flakiness, DPI-corrected bounds math (`OutputHelper.Bounds.getRenderBounds`), and 60 fps timing to a test that only needs one deterministic frame. Verify it *loads* (criterion 5) and leave the pixels to Playwright.

---

## Architecture Patterns

### Target file-by-file end state

| File | Change | Risk |
|---|---|---|
| `package.json` | versions per Standard Stack; `lint:svelte` gains `ESLINT_USE_FLAT_CONFIG=true`, loses `--ext`; add explicit `terser` | MED |
| `vite.config.mjs` | `build.lib.cssFileName: "bundle"`; `assetFileNames` uses `names` w/ `name` fallback; `onwarn` prefix `a11y_`; keep inline `preprocess` | HIGH if skipped |
| `config/building/vite.config.servers.mjs` | same three edits, `cssFileName: "styles"` | HIGH if skipped (unstyled web clients) |
| `svelte.config.mjs` | `sveltePreprocess(…)` → `vitePreprocess()`; drop the per-mode `tsconfigFile` | LOW |
| `src/frontend/main.ts`, `src/server/{remote,stage,controller,output_stream,cam}/main.ts` | `new App(…)` → `mount(App, …)` | LOW |
| `src/frontend/tsconfig.json`, `src/server/tsconfig.json` | pin `strict`, `module`, `moduleResolution`, `verbatimModuleSyntax` explicitly on top of the bumped base | HIGH if `strict` is inherited |
| 8 `.ts` files | `import type` / inline `type` | LOW |
| `config/linting/eslint.svelte.js` → flat config | `svelte/configs.recommended` + `svelte-eslint-parser` + `typescript-eslint`, **plus explicit `svelte/valid-compile`** | MED |
| `.github/workflows/ci.yml` | leave `continue-on-error: true` in place; do not add/remove checks | — |
| `scripts/postBuild.js` / `cleanBuilds.js` | unchanged unless Terser aborts; add an output assertion (below) | MED |

### Build-output assertion (new, small, high value)

Add a script (e.g. `scripts/assertBuildOutput.js`) and wire it after `postbuild` so the release path fails loudly instead of shipping an unstyled app:

1. `public/build/` contains exactly one `*.css`, named `bundle.css`, non-empty.
2. `public/build/bundle.js` exists, non-empty.
3. `public/index.html` contains **both** prod literals and both referenced files exist on disk (this is the same contract `postBuild.js:169` and `cleanBuilds.js:40` share — assert it, don't assume it).
4. `bundle.css` contains a selector from a known component — e.g. `.dragger` (defined in `src/frontend/MainOutput.svelte`) — proving real component CSS was extracted, not just an empty stub. This is the guard that a future `assetFileNames`/`cssFileName` regression cannot pass.
5. `build/electron/**` exists (i.e. `npm run build:electron:prod` ran).

Mirror item 3 for `cleanBuilds.js`: after cleanup, `public/index.html` must contain the dev script literal again. This is the "literal string contract" half of criterion 3.

### Ordering trap the plan must respect

`postBuild.js` rewrites `public/index.html` **in place** (`postBuild.js:170-176`) and only `scripts/cleanBuilds.js` (run by `postrelease`) restores it. `vite.config.mjs` serves dev with `root: "public"`. Therefore **after any `npm run build` the dev app is broken until `node scripts/cleanBuilds.js` runs** (it will try to load `./build/bundle.js`, which `preBuild.js` deletes on the next `npm start`). The pixel-diff baseline must be captured in a build-last sequence, or the harness must end by running `cleanBuilds`.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Naming the library-mode CSS file | A `writeBundle`/`closeBundle` plugin that renames files after the fact | `build.lib.cssFileName` | It is the documented mechanism; a rename plugin races `postBuild`'s HTML rewrite and misses the `cleanBuilds` contract |
| Flat-config migration scaffolding | Hand-rolled adapters that convert eslintrc → flat | `eslint-plugin-svelte`'s `configs.recommended` / `configs.base` | Rule semantics (parser, processor, `svelteConfig`) are wired correctly by the plugin |
| Type-only import detection | A custom AST scanner / codemod | `@typescript-eslint/consistent-type-imports` (already enabled for `.ts`; extend to `.svelte` via the flat config) | The 8 violations are one-line fixes; a codemod is more work than the fix |
| Image diffing | A custom pixel loop over `capturePage()` buffers | Playwright `toHaveScreenshot` (baseline generation, diff image, thresholds, per-platform snapshot paths) | Already installed; already used by the same runner; produces reviewable artifacts |
| Legacy/runes interop shims | `svelte/legacy` helpers or `<svelte:options runes={false} />` sprinkled around | Nothing | Legacy mode is the default for every file that does not use runes; adding markers would be a source change this phase explicitly forbids |
| Output-window capture plumbing | A new offscreen/`osr-capture` harness | Playwright `page.screenshot()` on the real output page | CDP capture is independent of window visibility (Playwright's own `CRPage.takeScreenshot` doc-comment: "captures from the rendering buffer, not screen pixels, so it works even when the BrowserWindow is hidden or occluded") |
| Terser-compatibility reasoning | Guessing which syntax breaks `mangle.toplevel` | Run `node scripts/postBuild.js`; if it aborts, skip the dead `build/public` copy | The shipped bundle is not Terser'd; the empirical test is one command |

---

## Common Pitfalls

### Pitfall 1: Inheriting `strict: true` from a bumped `@tsconfig/svelte`
**What goes wrong:** `@tsconfig/svelte@5.0.0` sets `strict: true`. The frontend config comments `strict` out, so the bump turns on `noImplicitAny` + 4 more strict flags across ~2,733 `any` uses. `svelte-check` error count jumps by hundreds/thousands and criterion 4 ("no new errors") is unreachable in this phase.
**Why it happens:** The bump is *mandatory* (Pitfall 2), so it looks like a routine dependency update.
**How to avoid:** Explicitly set `"strict": false` in `src/frontend/tsconfig.json` (and confirm `src/server/tsconfig.json`, which already sets `"strict": true` explicitly). Never rely on the base for `strict`.
**Warning signs:** `svelte-check` error count explodes immediately after the TS bump; errors are dominated by `TS7006`/`TS7031` "implicitly has an 'any' type".

### Pitfall 2: The removed `importsNotUsedAsValues` blocks TS 5.9 entirely
**What goes wrong:** `svelte-check`, `tsc`, and the eslint `parserOptions.project` all read `@tsconfig/svelte@2.0.1`'s `importsNotUsedAsValues`. TS 5.5+ emits `error TS5102 … has been removed` — a *config* error, not a code error. Every check fails at once and looks like "the migration broke everything".
**How to avoid:** Bump the base (or drop the `extends`) **in the same commit** as the TypeScript bump, and pre-empt the two behavioural flips it carries (`strict`, `verbatimModuleSyntax`).
**Warning signs:** `TS5102` mentioning `importsNotUsedAsValues`, with zero source errors.

### Pitfall 3: Vite 6's derived library CSS name breaks the stylesheet silently
**What goes wrong:** `bundle.css` becomes `freeshow.css` the moment `assetFileNames` stops matching (or `assetInfo.name` becomes `undefined` and the hook throws). For the renderer that means an unstyled app in *production only*; for the four server apps it means unstyled remote/stage/controller clients on stage.
**Why it happens:** The existing hook was written for the Vite 4/5 world where lib CSS was always `style.css`; nothing in the repo says "this rename is load-bearing".
**How to avoid:** `cssFileName` on both configs + the name-agnostic hook + the build-output assertion (exactly one CSS, correct name, non-empty, contains a known selector).
**Warning signs:** More than one `.css` in `public/build/`; `postBuild` throwing `"Dev script path changed!"`; `index.html` referencing a file that does not exist; visual unstyled app in a packaged build while dev is fine.

### Pitfall 4: Svelte 5's warning-code rename drops the a11y suppression
**What goes wrong:** `warning.code.startsWith("a11y-")` never matches (`a11y_missing_attribute`, …). Build logs fill with a11y warnings, which contradicts "a11y stays disabled until Phase 6" and trains reviewers to ignore output.
**How to avoid:** Rename to `a11y_` in `vite.config.mjs` and `vite.config.servers.mjs`; note it in the plan so Phase 6 knows the switch is a one-character change.
**Warning signs:** a11y warning codes in the build output; also any *other* code-string comparison against a kebab-case Svelte code (grep for `code ===` / `code.startsWith`).

### Pitfall 5: `svelte/valid-compile` silently disappearing from the Svelte lint job
**What goes wrong:** `eslint-plugin-svelte3`'s real contribution (Svelte compiler diagnostics surfaced as lint problems) is delivered by `svelte/valid-compile` in the new plugin — and v3 **removed it from `recommended`**. A like-for-like swap therefore *removes* a check while reporting "no new errors", which is the exact failure mode criterion 4 forbids.
**How to avoid:** Enable `svelte/valid-compile` explicitly; and prove the job is live with a fixture that has a deliberate violation (see Validation Architecture).
**Warning signs:** `--fix` run reports "0 problems" for every file; the config never names `svelte/valid-compile`.

### Pitfall 6: `svelte-check` reporting a clean baseline because it resolved no tsconfig
**What goes wrong:** `"test:svelte": "svelte-check"` passes no `--tsconfig`, and there is **no `tsconfig.json` or `jsconfig.json` at the repo root** (`ls` verified). svelte-check's documented behaviour without `--tsconfig` is "an upwards traversal looking for the next jsconfig/tsconfig.json" — from the repo root that finds nothing, so the check silently covers less than intended. Under `continue-on-error: true` in CI, nobody notices.
**How to avoid:** Pin it: `svelte-check --tsconfig config/typescript/tsconfig.svelte.json` (the same file ESLint uses for `parserOptions.project`). Do this **in plan 01-01, before any dependency change**, so the baseline and the post-upgrade run use an identical command. Note `--tsconfig` also switches on checking of `.ts`/`.js` files matched by the config's `include`/`exclude` — which is the desired scope.
**Warning signs:** A near-zero error count and a suspiciously low file count in the output.

### Pitfall 7: The baseline capture mutates `public/index.html`
**What goes wrong:** `scripts/postBuild.js` rewrites `public/index.html` in place to the production script/link tags; only `scripts/cleanBuilds.js` restores them. `vite.config.mjs` serves dev from `root: "public"`, so the next `npm start` loads `./build/bundle.js` — which `preBuild.js` just deleted. The dev app goes blank, and it looks like "Svelte 5 broke dev".
**How to avoid:** Make the harness self-closing (always run `node scripts/cleanBuilds.js` after a build-based capture), and `git status --porcelain public/index.html` as a post-step assertion. Longer term, this is the argument for the build-output assertion script owning the whole contract.
**Warning signs:** `public/index.html` shows up as modified in `git status`; `npm start` shows a blank window with a 404 for `bundle.js`.

### Pitfall 8: Treating the pixel gate as a formality
**What goes wrong:** A baseline captured against a blank/transparent output window, or with a generous `maxDiffPixelRatio`, passes after any CSS change — and this gate is the *only* automated protection of the output path for the whole milestone.
**How to avoid:** Assert content is present in the output DOM before capture; assert the PNG is 1920×1080 and non-uniform; start at `maxDiffPixels: 0`; store the diff artifact.
**Warning signs:** The baseline PNG is mostly one colour; the threshold was raised without a documented reason.

### Pitfall 9: Assuming all five server apps are built
**What goes wrong:** Time is spent migrating `cam` (no build path) while the four that *are* built get a partial config change.
**How to avoid:** Treat `config/building/vite.config.servers.mjs:7-12` as the source of truth (4 servers). Decide explicitly whether `cam` is in scope; if the answer is "leave it", say so in the plan so it is not rediscovered as a surprise.

---

## Code Examples

### 1. Renderer build config — the four changes that matter

```js
// vite.config.mjs (production branch only; everything else unchanged)
build: {
    lib: {
        entry: "src/frontend/main.ts",
        name: "freeshow",
        formats: ["iife"],
        fileName: () => "bundle.js",
        cssFileName: "bundle"          // → emits bundle.css (Vite 6+ documented mechanism)
    },
    outDir: "public/build",
    emptyOutDir: false,
    rollupOptions: {
        output: {
            assetFileNames: (assetInfo) => {
                const names = assetInfo.names ?? (assetInfo.name ? [assetInfo.name] : [])   // Rollup 4
                return names.some((n) => n?.endsWith(".css")) ? "bundle.css" : assetInfo.name
            }
        }
    }
}

// plugins: onwarn must match Svelte 5 codes (snake_case, not kebab-case)
onwarn: (warning, handler) => {
    if (warning.code.startsWith("a11y_")) return   // was "a11y-"
    handler(warning)
}
```

### 2. Server build config — the same three edits, `styles.css`

```js
// config/building/vite.config.servers.mjs → getServerViteConfig()
build: {
    lib: {
        entry: resolve(root, `src/server/${serverId}/main.ts`),
        name: serverId,
        formats: ["iife"],
        fileName: () => "client.js",
        cssFileName: "styles"                       // every server index.html links styles.css
    },
    // …unchanged
}
```

### 3. Svelte config — preprocess without `svelte-preprocess`

```js
// svelte.config.mjs
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

export default {
    preprocess: [vitePreprocess()]   // { script: false, style: true } — Svelte 5 strips types natively
}
```

### 4. Entry sites

```ts
// src/frontend/main.ts
import { mount } from "svelte"
const app = mount(App, { target: document.body })
export default app

// src/server/<id>/main.ts
import { mount } from "svelte"
const app = mount(App, { target: document.body, props: {} })
export default app
```

### 5. tsconfig — pin what must not move

```jsonc
// src/frontend/tsconfig.json (excerpt; base is now @tsconfig/svelte@5)
{
    "extends": "@tsconfig/svelte/tsconfig.json",
    "compilerOptions": {
        "strict": false,             // MUST be explicit — the new base sets strict: true
        "verbatimModuleSyntax": true, // inherits from the base; pin for intent + docs
        "module": "ESNext",
        "moduleResolution": "Bundler",
        // …existing options unchanged (strictNullChecks, noUnusedLocals, isolatedModules, …)
    }
}
```

### 6. Flat Svelte lint config — preserving the check that would otherwise vanish

```js
// config/linting/eslint.svelte.flat.mjs  (invoked with ESLINT_USE_FLAT_CONFIG=true)
import svelte from "eslint-plugin-svelte"
import ts from "typescript-eslint"
import svelteConfig from "../../svelte.config.mjs"

export default [
    ...svelte.configs.recommended,
    ...ts.configs.recommended,
    {
        files: ["**/*.svelte"],                 // patterns resolve relative to CWD with --config
        languageOptions: {
            parserOptions: { parser: ts.parser, extraFileExtensions: [".svelte"], svelteConfig }
        },
        rules: {
            "svelte/valid-compile": ["error", { ignoreWarnings: true }], // NOT in v3 `recommended`
            "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports", disallowTypeAnnotations: true }],
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/no-implied-eval": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/naming-convention": "off",
            "@typescript-eslint/restrict-plus-operands": "off",
            "@typescript-eslint/restrict-template-expressions": "off"
            // a11y stays off here until Phase 6, exactly as today
        }
    }
]
```

---

## Validation Architecture

Every command below must be run **twice** — once pre-upgrade to record the baseline, once post-upgrade — with identical arguments. "Failing direction" is the question: *how could this command pass while the criterion is false?* Those are the guards that must be built, not assumed.

| # | Criterion | Command | What it proves | Failing direction / false-pass guard |
|---|---|---|---|---|
| 1a | SC1 source-unchanged | `git diff --stat <baseline>..HEAD -- 'src/**/*.svelte'` | Only config + 6 entry files changed | **False pass:** the diff is empty because the harness forgot `--no-renames`. Guard: assert the *file count* of changed paths (`git diff --name-only`) is ≤ expected set, and that `git diff -U0 -- 'src/**/*.svelte'` matches exactly the 6 known entry paths |
| 1b | SC1 no legacy API left | `grep -rn "new App(" src` → empty; `grep -rln "svelte/internal\|\\$\\$restProps\|\\.\\$set(" src` → empty | The classic-component API is gone | **False pass:** grep matched nothing because the pattern was wrong. Guard: also assert `grep -rc "mount(" src/*/main.ts src/frontend/main.ts` = 6 files |
| 1c | SC1 dev launch | `npm start` → main window renders, output window opens, no renderer exception | The bundle boots on Svelte 5 in dev (root `public`, HMR) | **False pass:** the app boots from a stale `build/` artifact. Guard: `preBuild.js` deletes `build/`+`public/build/` on start — assert those dirs are gone before Vite reports ready |
| 1d | SC1 packaged launch | `npm run build && npm run pack` then a Playwright launch against the built app | Boots from the production path (`public/index.html` → `./build/bundle.js`) | **False pass:** launching with `NODE_ENV=development`, which loads localhost:3000. Guard: the spec already runs with `NODE_ENV: "production"` (`start.test.ts:17`) — keep that, and assert `page.url()` includes `index.html` |
| 2 | SC2 pixel gate | `npm run build && npx playwright test --config config/testing/playwright.config.ts output-render` | An output-branch window at 1920×1080 is pixel-identical (within the declared threshold) to the pre-upgrade baseline | **False pass:** blank/uniform capture, or a threshold raised to hide a real diff. Guards: assert `#output_window` exists **and** contains the expected lyric text; assert PNG dims are exactly 1920×1080; assert the image is not a single colour; start at `maxDiffPixels: 0`; keep the diff image. Re-capture: `--update-snapshots` only on a commit where **no** source/config changed |
| 3a | SC3 single CSS asset | `ls public/build/*.css` → exactly `bundle.css`; `test -s public/build/bundle.css` | One non-empty CSS asset under the expected name | **False pass:** `postBuild` never ran, so `public/build/` is whatever Vite left from a partial run. Guard: run the assertion *inside* the `postbuild` chain, after `setProductionHTML()` |
| 3b | SC3 HTML contract | `node scripts/assertBuildOutput.js` asserting the exact prod literal in `public/index.html` and that both referenced files exist | `postBuild.js`'s string contract holds | **False pass:** the file contains the *dev* literal and the assertion only checks "one of the two strings". Guard: check for the **prod** literal explicitly |
| 3c | SC3 no throw | exit code of `npm run build` (which runs `prebuild`/`build`/`postbuild`) = 0 | No `"Dev script path changed!"`, no Terser `process.abort()` | **False pass:** npm swallows a lifecycle-script failure? It does not, but a `| tail` pipe does. Guard: no pipes; assert `echo $?` |
| 3d | SC3 round trip | `node scripts/cleanBuilds.js` then assert `public/index.html` contains the dev literal again | The mirrored constant in `cleanBuilds.js:40` matches `postBuild.js:168-169` | **False pass:** asserting only that the prod string is *absent*. Guard: assert the dev string is *present* |
| 3e | SC3 CSS is real | `grep -q "\.dragger" public/build/bundle.css` | Component CSS was actually extracted (not an empty stub) | **False pass:** selector renamed by a future refactor. Guard: pick a second, unrelated selector; fail loudly rather than degrade to "file is non-empty" |
| 4a | SC4 svelte-check | `npx svelte-check --tsconfig config/typescript/tsconfig.svelte.json --output machine` → parse `COMPLETED <n> FILES <e> ERRORS <w> WARNINGS` | New error count ≤ baseline, and the check still reads the same config | **False pass:** no tsconfig resolved → near-zero errors (Pitfall 6). Guards: pin `--tsconfig`; assert `FILES` is in a plausible range (hundreds, not a handful) |
| 4b | SC4 ESLint Svelte plugin is *loaded* | Lint a temp fixture `.svelte` with a deliberate violation (e.g. an unclosed tag or `{#if}` without `{/if}`) using the real config; assert ≥1 error | The plugin/parser actually runs | **False pass (the big one):** a config that loads no Svelte rules reports "0 problems" for the whole repo. This fixture is the only way to distinguish "clean" from "inert" |
| 4c | SC4 parity of lint coverage | `npx eslint -c config/linting/eslint.electron.json --ext .js,.ts src/electron` and the frontend equivalent → error counts ≤ baseline | The three eslintrc jobs are untouched | **False pass:** a count drops because a file stopped matching the glob. Guard: record `--format json` file counts too |
| 4d | SC4 Vitest | `npx vitest run --config config/testing/vitest.config.ts --reporter=json` → `numTotalTests`, `numPassedTests`, `numSkippedTests` | No test lost, none silently skipped | **False pass:** tests silently skipped. Guard: assert `numTotalTests` **and** `numSkippedTests` against baseline; also assert `numTotalTestSuites` |
| 4e | SC4 no check dropped / non-blocking | `grep -c "continue-on-error: true" .github/workflows/ci.yml` ≤ 2; assert the four `lint:*` scripts and four `test:*` scripts all still exist in `package.json` | No check quietly removed or made non-blocking | **False pass:** a script renamed so the workflow step "passes" because npm ran nothing. Guard: `npm run <script> --if-present` is *not* used; assert on `npm pkg get scripts.<name>` |
| 4f | SC4 formatting | `npm run test:format` → error count ≤ baseline | prettier-plugin-svelte 4 does not reformat 542 untouched components | **False pass:** prettier silently ignoring `.svelte` files. Guard: assert the reported file count is non-trivial |
| 5a | SC5 cross-OS build | `build.yml` matrix (windows-latest / macos-latest / ubuntu-latest) `npm ci && npm run build` | Packaged artifacts still build on all three | **False pass:** CI is `workflow_dispatch`-only today (`build.yml:3`, `ci.yml:3`, `playwright.yml:3`) — a green badge proves nothing until someone dispatches it. Record the run URL/date in the phase evidence |
| 5b | SC5 native modules load | Playwright: `electronApp.evaluate(() => { require("better-sqlite3"); require("@discordjs/opus"); require("osr-capture"); return true })` | The three named addons load under Electron's ABI on each OS | **False pass:** requiring at all may be lazy; `@discordjs/opus` in particular needs the `renameOpusBuild()` fix (`postBuild.js:151-166`). Guard: assert a real call (e.g. open a DB / construct an encoder) and require it non-empty |
| 5c | SC5 smoke flow | Playwright spec: launch → open Settings → open an output → play the created song → import a file (mock the dialog as `start.test.ts:22-26` does) | The operator path still works end to end on the packaged build | **False pass:** the spec reuses a temp store that already contains state. Guard: fresh `FS_MOCK_STORE_PATH` per run (as today) |
| 5d | SC5 pixel gate per OS | Re-capture the SC2 baseline on each OS and diff a *second* run against it | Cross-OS rendering did not change | **Honesty guard:** do not compare a macOS baseline to a Linux capture — font rasterisation differs. Per-OS baselines only; document that in the phase notes |

**Baseline capture procedure (plan 01-01, pre-upgrade, in this order):**

1. `npm ci` (node_modules is empty — nothing else can run first).
2. `npx svelte-check --tsconfig config/typescript/tsconfig.svelte.json --output machine | tee .planning/phases/01-toolchain-gate/baseline-svelte-check.txt` — record `COMPLETED … FILES … ERRORS … WARNINGS`.
3. `npm run lint:svelte`, `lint:electron`, `lint:frontend`, `lint:styles` with `--format json`, recording file/problem counts.
4. `npx vitest run --config config/testing/vitest.config.ts --reporter=json` → totals/skips.
5. `npm run test:format` → error count.
6. `npm run build && npm run pack`, then capture the SC2 baseline PNG with `--update-snapshots`, then `node scripts/cleanBuilds.js` and assert `public/index.html` is back to the dev literal.
7. Write the five numbers + the baseline PNG into the phase directory. Every later plan compares against these files, not against memory.

**Phase-specific ordering constraint:** steps 2–6 must complete **before the first `package.json` edit**. The CONTEXT.md hard constraint ("the safety net exists before the first dependency change") is not stylistic here: with `continue-on-error: true` in CI and only 12 unit test files, the baseline files *are* the safety net.

---

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|---|---|---|---|
| Svelte 4 instantiation: `new App({ target })` | `mount(App, { target })`; `compatibility.componentApi: 4` only as a temporary aid | Svelte 5.0 | 6 lines |
| `importsNotUsedAsValues: "error"` | `verbatimModuleSyntax: true` | deprecation TS 5.0, **removal TS 5.5** | forces the `@tsconfig/svelte` bump |
| `@tsconfig/svelte@2` (`strict: false`, `moduleResolution: node`) | `@tsconfig/svelte@5` (`strict: true`, `module: esnext`, `moduleResolution: bundler`) | v3/v4/v5 | must pin `strict` explicitly |
| `svelte-preprocess` | `vitePreprocess()` (Svelte 5 strips types natively) | vite-plugin-svelte 3/4 | drop the dependency |
| `eslint-plugin-svelte3` (eslintrc, Svelte 3) | `eslint-plugin-svelte@3` (**flat config only**, Svelte 5) | v3.0.0 | one config file must move to flat |
| `eslint-plugin-svelte@2` — no Svelte 5 rule support | v3 rules gate on Svelte 5 | v3.0.0 | a v2 pin is not a viable fallback |
| Kebab-case compiler warning codes | snake_case | Svelte 5 | 2 config lines |
| Lib-mode CSS always `style.css` | derived from `cssFileName` / `fileName` / package name | Vite 6 | 2 config files + an assertion |
| `build.target: 'modules'` | `'baseline-widely-available'` (Chrome 107+ in v7) | Vite 7 | none (Electron 37 = Chromium 138) |
| ESLint 9 EOL 2026-08-06; eslintrc removed in ESLint 10 | flat config everywhere | ongoing | kept ESLint 8.57.1 deliberately; full flat migration is deferred work |
| Rollup 3 (Vite 4) | Rollup 4 (Vite 5+) — `PreRenderedAsset.name` deprecated in favour of `names` | Vite 5 | one hook line |

---

## Open Questions

1. **Does `assetFileNames` still override the lib-mode CSS name in Vite 7 in every case?** — **Confidence: MEDIUM.** The resolver `resolveLibCssFilename` names the emitted asset, and Rollup's `output.assetFileNames` (which the repo sets) should then rename it; verified by reading both sides of Vite's source, not by running a build. *Recommendation:* set `cssFileName` so the answer stops mattering, and let the SC3 assertion decide empirically.
2. **Rollup 4's exact `assetInfo.name` removal point.** Deprecation confirmed; removal version not pinned. *Recommendation:* the `names ?? [name]` fallback above costs nothing.
3. **Does `page.setViewportSize({ width: 1920, height: 1080 })` work on an Electron page in Playwright 1.56?** — **Confidence: LOW/MEDIUM.** Playwright's Chromium emulation supports it, and Electron pages are Chromium pages; I could not verify that the Electron integration applies the metrics override rather than no-op'ing. *Recommendation:* try it in a 15-minute spike; fall back to `BrowserWindow.setContentSize` (and then require `xvfb-run --server-args="-screen 0 1920x1080x24"` for the Linux gate, since `enableLargerThanScreen` is macOS-only).
4. **Does `vite-plugin-svelte` discover `svelte.config.mjs` when `root` is `public/` (dev)?** — **Confidence: MEDIUM.** Docs describe discovery relative to the Vite root; dev root is `public`. *Recommendation:* keep the inline `preprocess` in `vite.config.mjs` (already correct) and verify by breaking `svelte.config.mjs` deliberately and confirming dev still compiles.
5. **Is `build/public/**` load-bearing anywhere?** — **Confidence: MEDIUM-HIGH** that it is dead (not in electron-builder `files`; only referenced as `icon:`/`background:` asset sources). *Recommendation:* do not delete it in this phase; just make its Terser pass non-fatal if it becomes a problem.
6. **The actual baseline error counts.** Unknown — `node_modules` is empty. This is plan 01-01's deliverable, not a research gap.
7. **Does the Electron dev flow still use `svelte.config.mjs`'s preprocess at all today?** The `tsconfigFile` option (`svelte.config.mjs:8`) has no `vitePreprocess` equivalent, so after this phase the per-mode `tsconfig.svelte{,.prod}.json` are consumed only by ESLint and svelte-check. Confirm nothing else depends on that option before deleting it.

---

## Sources

### Primary (HIGH confidence)

- **Vite official docs & source** — `v7.vite.dev/guide/migration` (Vite 6→7: Node 20.19+/22.12+, `baseline-widely-available`, removed `splitVendorChunkPlugin`, `transformIndexHtml` hook-level options, Sass legacy API); `v6.vite.dev/guide/migration` ("Customize CSS output file name in library mode" — the `cssFileName` introduction and the `style.css`→package-name change); `v5.vite.dev/guide/migration` (CJS Node API deprecation, Rollup 4, `moduleResolution: bundler` guidance); `v7.vite.dev/guide/build#library-mode` + `#css-support`; `v7.vite.dev/config/build-options` (`build.lib`, `fileName`, `cssFileName`, `cssCodeSplit` defaults); Vite source `packages/vite/src/node/plugins/css.ts` (`resolveLibCssFilename`) and `packages/vite/src/node/build.ts` (`assetFileNames: libOptions ? '[name].[ext]' : …`, `LibraryOptions`, `resolveLibFilename`).
- **Svelte official docs** — `svelte.dev/docs/svelte/legacy-overview` (legacy vs runes auto-selection); `svelte.dev/docs/svelte/v5-migration-guide` (`compatibility.componentApi: 4` is a temporary aid; "Compiler error and warning codes have been updated to use underscores instead of dashes"); `svelte.dev/docs/svelte/svelte-options` (`runes` per-component only); `svelte.dev/docs/svelte/typescript` (native type-only support; `enum`/`using`/accessors/decorators need a preprocessor).
- **`@sveltejs/vite-plugin-svelte` docs & changelog** — `docs/preprocess.md` (`vitePreprocess` defaults `{script:false, style:true}`, "TypeScript is no longer preprocessed by default as Svelte 5 understands most syntax natively", `svelte-preprocess` guidance); `docs/config.md` (config-file discovery paths and root-relative resolution, `onwarn`, `dynamicCompileOptions`, `hot` deprecation); CHANGELOG v7.0.0 (Vite 8 + Svelte 5.46.4 peers, `vitePlugin.hot` removal); package.json peers.
- **`eslint-plugin-svelte` docs** — `docs/migration.md` ("**ESLint Flat Config Only** — `.eslintrc.js` and `.eslintrc.json` are no longer supported", "`svelte/valid-compile` has been **removed** from `recommended`", Node/ESLint minima); `docs/user-guide.md` (flat-config setup for TS projects, required parser wiring).
- **TypeScript** — `typescriptlang.org/tsconfig/verbatimModuleSyntax`; TypeScript 5.5 beta announcement ("Disabling Features Deprecated in TypeScript 5.0 … In TypeScript 5.5, these options no longer have any effect"); the `TS5102` baseline diff (5.5.4 → 5.6.2) showing `importsNotUsedAsValues`/`preserveValueImports` being hard errors; `importsNotUsedAsValues` reference page.
- **ESLint** — migration guide ("To use flat config with ESLint v8 … set the `ESLINT_USE_FLAT_CONFIG` environment variable to `true`"; flat-config CLI flag changes incl. `--ext` unsupported; alternate `--config` patterns resolve relative to CWD); eslint/eslint#18212 (maintainer confirms `ESLINT_USE_FLAT_CONFIG=true` + `--config`); flat-config rollout plans (eslintrc removed in v10).
- **Playwright** — Electron API docs (`electronApp.windows()`, `electronApp.evaluate`, `page.screenshot`); Playwright server source `packages/playwright-core/src/server/chromium/crPage.ts` (`takeScreenshot` uses `Page.captureScreenshot` — "captures from the rendering buffer, not screen pixels, so it works even when the BrowserWindow is hidden or occluded"; `_metricsOverride` for viewport overrides) and `.../server/electron/electron.ts`.
- **npm registry / package contents (fetched 2026-10-18)** — `@tsconfig/svelte@2.0.1` and `@tsconfig/svelte` (5.0.0) `tsconfig.json`, verbatim.
- **Local repo verification (direct inspection, 2026-10-18)** — `package.json` (scripts, deps, `postinstall`); `vite.config.mjs` (lines 9, 15, 20-48); `config/building/vite.config.servers.mjs` (lines 7-12 `servers` map, 79 `onwarn`, 90-108 `build.lib`/`assetFileNames`/`minify`); `svelte.config.mjs`; `config/typescript/tsconfig.*.json` → `src/{frontend,server,electron}/tsconfig.json`; `config/linting/eslint.svelte.js`; `scripts/postBuild.js` (4, 78-106, 151-176, 180-189); `scripts/cleanBuilds.js` (38-47); `scripts/preBuild.js`; `scripts/start.js`; `scripts/vite/createServerFiles.js`; `config/building/electron-builder.yaml` (10-13 `files`, 33/63/76/107 `build/public` asset refs); `config/building/rollup.config.mjs:33` (cam commented out); `public/index.html`; `.gitignore`; `.github/workflows/{build,ci,playwright,release}.yml`; `config/testing/{playwright.config.ts,start.test.ts,vitest.config.ts}`; `src/frontend/main.ts:23`; `src/server/*/main.ts`; `src/frontend/App.svelte` (47, 81); `src/frontend/MainOutput.svelte` (`#output_window`); `src/frontend/utils/startup.ts:32-55`; `src/electron/index.ts:265-279`; `src/electron/utils/windowOptions.ts:42-71`; `src/electron/output/helpers/OutputLifecycle.ts:80-194,216-230`; `src/types/Channels.ts`; `src/types/Output.ts`; all five `src/server/*/index.html`. Corpus scans: 1013 `.ts`/`.svelte` files under `src`; 8 ambiguous type imports; 0 type-only re-exports; 0 `enum`/`using`/decorators/parameter-properties in `.svelte`; 0 `<style lang=…>`; 547 `.svelte` files (464 frontend / 83 server); 542 `<script lang="ts">`; svelte subpath imports (`svelte` 251, `svelte/store` 152, `svelte/transition` 29, `svelte/easing` 4, `svelte/motion` 2).
- **Lockfile** — `node_modules/terser@5.43.1` (dev, via `@rollup/plugin-terser@1.0.0`).

### Secondary (MEDIUM confidence — single authoritative source, inference, or unexecuted)

- Rollup 4 `assetInfo.name` → `names` deprecation timing (inferred from Vite's own `output.assetFileNames` spread and community config examples; exact Rollup minor not pinned).
- `vite-plugin-svelte`'s config-file search root interacting with `root: "public"` in dev.
- Vite 7 vs Vite 8 minifier defaults (`esbuild` vs `oxc`/`lightningcss`) — read from Vite's `main`-branch type docs, which describe Vite 8; not re-verified against the v7 config reference. Do not rely on it for a decision; it only supports staying on Vite 7.
- Playwright `setViewportSize` behaviour on Electron pages.

### Tertiary (LOW confidence — flagged, not relied upon)

- Third-party write-ups on lib-mode CSS naming and `assetFileNames` (Stack Overflow, issue threads) — used only to corroborate *that* the Vite 6 change was breaking, never as the source of the mechanism itself.

---

## Metadata

**Confidence breakdown**

| Area | Level | Reason |
|---|---|---|
| Standard stack / versions | HIGH | Carried from STACK.md (npm-registry verified 2026-10-17); `@tsconfig/svelte` contents re-fetched and confirmed |
| Config surgery (Vite `cssFileName`, `names`, `a11y_`) | HIGH | Vite/Svelte source and official migration guides; every repo citation is line-accurate |
| TypeScript / tsconfig | HIGH | TS release notes + verbatim package contents + a repo-wide scan of all 1013 files |
| eslint-plugin-svelte migration | HIGH on the constraint (flat-config only), MEDIUM on the chosen bridge (ESLint 8.57 + `ESLINT_USE_FLAT_CONFIG`) |
| Terser × Svelte 5 | HIGH on the file-flow (shipped vs dead copies), MEDIUM on Terser's actual parse result (not executable until `npm ci`) |
| Pixel-diff harness | MEDIUM-HIGH | Playwright mechanics verified from source; the `TYPE=output` trigger and viewport control need a spike |
| Cross-OS/packaging | MEDIUM | Workflows and builder config read directly; nothing executed (no node_modules, and 3-OS runs are manual `workflow_dispatch`) |
| Baseline numbers | UNKNOWN (by design) | Nothing installed; plan 01-01 measures them |

**Research date:** 2026-10-18
**Valid until:** ~2026-11-17 (30 days) for the config/architecture findings; **re-verify the version matrix and the Vite `cssFileName` behaviour on the day the install runs** — this stack moves weekly (ESLint 9 EOL, ESLint 10.13 current, TS 7 native port shipping, Vite 8/Rolldown shipping).
