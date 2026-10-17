# Phase 1: Toolchain Gate - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning
**Mode:** Auto-generated (pure infrastructure phase — smart discuss skipped the grey-area tables)

<domain>
## Phase Boundary

Move the build platform with **zero component-syntax rewrites**: Svelte 3.59.2 → 5.x (legacy mode), Vite 4.5.14 → 7.x, `@sveltejs/vite-plugin-svelte` 2.x → 6.x, TypeScript 4.9.5 → 5.9.x, plus `svelte-check`, the Svelte ESLint plugin (replacing the Svelte-3-only `eslint-plugin-svelte3`), and Vitest moving together.

Delivers **no user-visible capability**. The acceptance test is "nothing changed": the app launches, and a projector output window renders pixel-identically to the pre-upgrade baseline.

Explicitly NOT in this phase: Tailwind, design tokens, any CSS or component change, the shadcn primitive layer. All of that is Phase 2+.

</domain>

<decisions>
## Implementation Decisions

### the agent's Discretion
All implementation choices are at the agent's discretion — pure infrastructure phase. Use the ROADMAP phase goal, its five success criteria, and the codebase conventions to guide decisions. The research files below carry hard constraints that must be honoured.

### Hard Constraints (from Phase 1 research — treat as decided)
- **Svelte 5 in legacy mode only.** Existing `export let` (317 files), `$:` (419), `on:` (404), `<slot>` (37), `createEventDispatcher` (77), `bind:` (170) all keep working untouched. The repo contains **zero** uses of `svelte/internal`, `svelte/compiler`, `SvelteComponentTyped`, `$$restProps`, `<svelte:options>`, or `.$set`, so no component rewrite is required.
- **Vite target is 7.x, not 8.x.** Vite 8 replaces Rollup with Rolldown (`rolldown@1.0.0-rc.x`, `lightningcss`, `@oxc-project/runtime`). The renderer builds as a single IIFE `build.lib` bundle shared by the main window and every output window — exactly the shape a bundler swap breaks. Vite 7 keeps Rollup 4, matching the repo's server builds.
- **`@sveltejs/vite-plugin-svelte` must be the 6.x line.** 7.x peers `vite: ^8.0.0`; 6.x peers `vite: ^6.3.0 || ^7.0.0`. Selecting Vite 7 forces plugin 6.x.
- **TypeScript target is 5.9.x.** TS 7.0.2 is the native Go port and is excluded by both peers: `svelte-check@4.7.7` accepts `typescript ^5 || ^6`, `@typescript-eslint/parser` accepts `>=4.8.4 <6.1.0`. (TS 6.0.3 is the technical ceiling if 5.9 causes trouble; 5.9.3 is the conservative pick.)
- **`svelte-preprocess` → `vitePreprocess()`.** `svelte.config.mjs` currently uses `svelte-preprocess` with a per-mode tsconfig; `vite.config.mjs` already uses `vitePreprocess()`. Both must end coherent.
- **Do not let the Svelte 4 legacy shadcn path substitute for this phase.** That line is frozen (Tailwind 3, `bits-ui@0.22`) and would defer, not avoid, this work.
- **The safety net exists before the first dependency change.** The output-window pixel-diff baseline and the release smoke checklist are plan 01-01, not a later addition.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.planning/research/STACK.md` — versioned stack recommendation, A-vs-B cost comparison, compatibility matrix, four verified integration constraints.
- `.planning/research/PITFALLS.md` — 7 critical pitfalls with a pitfall→phase mapping; Electron/multi-window and build/packaging hazards are HIGH confidence (verified in `index.ts`, `windowOptions.ts`, `startup.ts`, `vite.config.mjs`, `postBuild.js`, `cleanBuilds.js`).
- `.planning/codebase/` — 7 codebase documents (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS).
- `config/testing/playwright.config.ts` + `config/testing/start.test.ts` — existing Playwright Electron harness to extend for the output-window gate.
- `FS_MOCK_STORE_PATH` env var (`src/electron/data/store.ts`) — already provided for throwaway-store Playwright runs.

### Established Patterns
- Renderer bundle: `vite.config.mjs` library mode, `formats: ["iife"]`, `fileName: () => "bundle.js"`, `outDir: "public/build"`, `emptyOutDir: false`, and an `assetFileNames` hook that renames the emitted CSS to `bundle.css`.
- Dev vs prod root differ: `root: production ? "." : "public"`, `publicDir: false`, dev-only alias `/src → ../src`, `resolve.dedupe: ["svelte"]`.
- Build scripts are bespoke and brittle: `scripts/postBuild.js` does literal string replacement on `index.html` and throws `"Dev script path changed!"` on mismatch; `scripts/cleanBuilds.js` holds a mirrored constant; `scripts/preBuild.js` runs first.
- Workaround for noisy optional deps already documented at `.gitignore:1-3` — relevant when Tailwind's native engine arrives in Phase 2.
- CommonJS `require` is allowed in `src/electron` (ESLint `no-var-requires` off there, error in frontend).
- CI format and type checks are currently non-blocking (`continue-on-error: true`), so a silent Svelte 5 type backlog can grow unseen.
- `no-console` is an error in `src/`; use `console.info`/`warn`/`error`.

### Integration Points
- `vite.config.mjs` — renderer build (single IIFE bundle, `bundle.css` renaming).
- `config/building/vite.config.servers.mjs` — the five server apps (remote, stage, controller, output_stream, cam); shares the Svelte plugin and must move with it.
- `svelte.config.mjs` — preprocess config consumed by `svelte-check` and tooling.
- `config/typescript/tsconfig.electron.json`, `tsconfig.electron.prod.json`, `tsconfig.server.json`, `tsconfig.svelte.json`, `tsconfig.svelte.prod.json`.
- **6 mount sites total** (verified): `src/frontend/main.ts:23` (`new App({ target: document.body })`) plus `src/server/{remote,stage,controller,output_stream,cam}/main.ts` — each `const app = new App({ ... })`.
- `config/linting/eslint.svelte.js` — `eslint-plugin-svelte3` config to replace; note it also disables a11y warnings at line 42, which Phase 6 re-enables.
- `.github/workflows/` — CI workflow(s) currently using Node 22; two checks pinned non-blocking.
- `package.json` scripts: `test:*`, `lint:*`, `build:*`, `start` → `scripts/start.js`.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Follow the five ROADMAP success criteria exactly; they are the contract:

1. App launches in dev and packaged, all 464 components source-unchanged (six `mount()` sites + config only).
2. Output-window render gate — projector output pixel-identical at 1920×1080 vs. a pre-upgrade baseline captured with `TYPE=output`.
3. Production build emits exactly one `bundle.css`, `index.html` references non-empty `bundle.js`/`bundle.css`, and the `postBuild.js`/`cleanBuilds.js` string contracts hold.
4. `svelte-check` + Svelte ESLint + Vitest report no new errors/failures vs. the pre-upgrade baseline; no check dropped or silently made non-blocking.
5. Release smoke checklist green on packaged Windows/macOS/Linux: launch, open Settings, open an output, play a song, import a file — with `better-sqlite3`, `@discordjs/opus`, `osr-capture` loading on each platform.

</specifics>

<deferred>
## Deferred Ideas

- Vite 8 / Rolldown + `@sveltejs/vite-plugin-svelte` 7 — a separate, testable change *after* Phase 1's regression net exists.
- TypeScript 6.x — optional bump once 5.9 is proven; 6.0.3 is the peer-allowed ceiling.
- Frontend TypeScript `strict` burn-down (~2,733 `any`) — its own future effort, explicitly out of scope.
- Making the two non-blocking CI checks blocking — PITFALLS recommends flipping them for touched paths; confirm with the user before changing CI behaviour.

</deferred>
