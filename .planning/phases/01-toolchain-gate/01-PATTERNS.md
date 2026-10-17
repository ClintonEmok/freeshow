# Phase 1: Toolchain Gate - Pattern Map

**Mapped:** 2026-10-18
**Files analyzed:** 25 (22 modified, 3 new)
**Analogs found:** 24 / 25 (1 file — the flat Svelte lint config — has no in-repo analog)

**What this phase is:** a build-platform swap with **zero component rewrites**. The patterns below are therefore **config-file surgery**, not feature code. For most files the correct "analog" is *the file's own current content* (the "before" state that must change) plus the **upstream `svelte5` branch's version** (the validated "after" recipe). Both are given with line numbers. Where main's tree is already ahead of upstream, that is flagged explicitly — **do not re-apply what main already has**.

> **Analog paths are all git-tracked** (verified with `git ls-files -- <path>`): `vite.config.mjs`, `svelte.config.mjs`, `package.json`, `config/building/vite.config.servers.mjs`, `config/linting/eslint.svelte.js`, `config/testing/playwright.config.ts`, `config/testing/start.test.ts`, `scripts/{preBuild,postBuild,cleanBuilds}.js`, `src/frontend/main.ts`, `src/server/cam/main.ts`. The upstream ref `refs/remotes/upstream/svelte5` is a local git ref (`644e6b1efd22e00f881e3cea9de0ee1a0ba45b93`) — read it with `git show refs/remotes/upstream/svelte5:<path>`, never merge it.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `vite.config.mjs` | config | build/transform | its own current content + `git show refs/remotes/upstream/svelte5:vite.config.mjs` | exact |
| `config/building/vite.config.servers.mjs` | config | build/transform | its own current content (upstream is a **stale** pre-refactor fork) | exact (self) |
| `svelte.config.mjs` | config | transform | `git show refs/remotes/upstream/svelte5:svelte.config.mjs` | exact |
| `src/frontend/tsconfig.json` | config | static | `git show refs/remotes/upstream/svelte5:src/frontend/tsconfig.json` + local `src/server/tsconfig.json` | exact |
| `src/server/tsconfig.json` | config | static | local `src/frontend/tsconfig.json` (sibling) | role-match |
| `package.json` | config (manifest) | n/a | its own current content (scripts block) | exact (self) |
| `config/linting/eslint.svelte.flat.mjs` (**NEW**) | config (lint) | static | `config/linting/eslint.frontend.json` (rule parity) — **no flat-config analog exists** | partial |
| `config/linting/eslint.svelte.js` (delete) | config (lint) | static | — (replaced by the above) | n/a |
| `src/frontend/main.ts` | entry point | request-response (boot) | other 5 mount sites (self) | exact |
| `src/server/{remote,stage,controller,output_stream,cam}/main.ts` | entry point | request-response (boot) | `src/frontend/main.ts` (self) | exact |
| 8 `.ts` files (type imports) | utility / store | transform | `src/frontend/utils/cloudSync.ts:1`, `src/server/remote/util/stores.ts:2-8` | exact |
| `config/testing/playwright.config.ts` | config (test) | n/a | its own current content (**already newer than upstream**) | exact (self) |
| `config/testing/start.test.ts` | test | request-response | its own current content (**already contains upstream's repairs**) | exact (self) |
| `config/testing/output-render.test.ts` (**NEW**) | test | file-I/O (pixel capture) | `config/testing/start.test.ts` | role-match |
| `scripts/assertBuildOutput.js` (**NEW**) | script (guard) | file-I/O | `scripts/cleanBuilds.js` + `scripts/postBuild.js:168-176` | role-match |
| `scripts/postBuild.js` | script | file-I/O | its own current content (conditional change only) | exact (self) |

---

## Pattern Assignments

### 1. `vite.config.mjs` (config, build/transform)

**Analog:** its own current content (below = the "before") + upstream `svelte5` (the "after").

**Current state — the three defects, verbatim** (`vite.config.mjs:13-18`, `:34-39`):

```js
            onwarn: (warning, handler) => {
                // disable A11y warnings
                if (warning.code.startsWith("a11y-")) return      // ← line 15: Svelte 5 renamed codes to a11y_*
                handler(warning)
            }
```

```js
                      assetFileNames: (assetInfo) => {
                          if (assetInfo.name.endsWith(".css")) {   // ← line 35: Rollup 4 deprecates .name; undefined → TypeError
                              return "bundle.css"
                          }
                          return assetInfo.name                     // ← line 38: same
                      }
```

```js
              lib: {
                  entry: "src/frontend/main.ts",
                  name: "freeshow",
                  formats: ["iife"],
                  fileName: () => "bundle.js"                        // ← line 28: a FUNCTION, so Vite 6+ falls back to package.json "name" → freeshow.css
              },
```

**Upstream's fix, verbatim** (`git show refs/remotes/upstream/svelte5:vite.config.mjs`):

```js
            onwarn: (warning, handler) => {
                // disable A11y warnings (Svelte 5 renamed the codes to a11y_*)
                if (warning.code.startsWith("a11y_")) return
                handler(warning)
            }
```

```js
                      assetFileNames: (assetInfo) => {
                          // Vite 8 / Rollup 4: asset name comes from names[]
                          const name = assetInfo.names?.[0] ?? ""
                          if (name.endsWith(".css")) {
                              return "bundle.css"
                          }
                          return name
                      }
```

**Where we must go further than upstream (belt-and-braces `cssFileName`):** upstream did **not** set `cssFileName`. The plan must add `cssFileName: "bundle"` inside `lib` (renderer) so the name is deterministic even if the hook is bypassed. Per RESEARCH.md Q1, this is the documented Vite 6+ mechanism; the hook then becomes redundant-but-harmless.

**Error handling / guard pattern:** none in this file. Keep the existing shape — `export default defineConfig({...})`, no semicolons, 4-space indent, double quotes.

**Do NOT change:** `preprocess: vitePreprocess()` (line 9) — it must stay inline; `root: production ? "." : "public"` (line 20) means dev's plugin search root is `public/`, where `svelte.config.mjs` does not exist (RESEARCH Q6 / Open Question 4); `resolve.dedupe: ["svelte"]`; the dev branch (`outDir: "../dist"`).

---

### 2. `config/building/vite.config.servers.mjs` (config, build/transform)

**Analog:** **itself.** Upstream's copy of this file is a *pre-refactor fork* — no `getServerViteConfig()` export, no `servers` export, uses single quotes and 2-space indent, exports a bare `defineConfig` and has an extra `htmlTransformPlugin`. **Do not adopt upstream's structure.** Only its `a11y_` one-liner is transferable.

**Current state — the three defects, verbatim** (`:77-81`, `:90-104`):

```js
                onwarn: (warning, handler) => {
                    // disable A11y warnings
                    if (warning.code.startsWith("a11y-")) return      // ← line 79
                    handler(warning)
                }
```

```js
            lib: {
                entry: resolve(root, `src/server/${serverId}/main.ts`),
                name: serverId,
                formats: ["iife"],
                fileName: () => "client.js"                            // ← line 94: same Vite 6 derivation trap → freeshow.css
            },
            rollupOptions: {
                output: {
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name.endsWith(".css")) {          // ← line 99
                            return "styles.css"
                        }
                        return assetInfo.name                          // ← line 102
                    }
                }
            },
```

**Required:** all three edits as in the renderer, plus `cssFileName: "styles"` (each server `index.html` links `styles.css` by name — `src/server/remote/index.html:9` ` <link href="styles.css" rel="stylesheet" />`, `:15` `<script src="client.js"></script>`).

**The four built servers** (`:7-12` — the source of truth; `cam` is *not* in this map):

```js
export const servers = {
    remote: { typescript: true },
    stage: { typescript: true },
    controller: { typescript: true },
    output_stream: { typescript: true }
}
```

**Why `configFile: false` matters here** — `scripts/vite/createServerFiles.js:13-17`:

```js
                await build({
                    ...config,
                    configFile: false,
                    logLevel: "warn"
                })
```

So `svelte.config.mjs` is **never** loaded for server builds → the inline `preprocess: vitePreprocess()` at `:73` must stay. (Identical reasoning to the renderer's dev-root trap.)

**Local plugin template (usable if the plan adds an assertion plugin):** `copyServerFilesPlugin()` at `:52-60` is the in-repo pattern for a tiny Rollup plugin object in this codebase:

```js
function copyServerFilesPlugin(serverId) {
    return {
        name: "copy-server-files",
        writeBundle() {
            copyServerFiles(serverId)
        }
    }
}
```

---

### 3. `svelte.config.mjs` (config, transform)

**Current state, verbatim (all 11 lines):**

```js
import sveltePreprocess from "svelte-preprocess"

const production = process.env.NODE_ENV === "production"

export default {
    preprocess: sveltePreprocess({
        typescript: {
            tsconfigFile: `./config/typescript/tsconfig.svelte${production ? ".prod" : ""}.json`
        }
    })
}
```

**Upstream's replacement, verbatim:**

```js
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

export default {
    preprocess: vitePreprocess()
}
```

**Two things to preserve/verify (upstream did not):**
1. RESEARCH Q6 recommends `preprocess: [vitePreprocess()]` (array form) — either is accepted; the array form matches `vite.config.mjs`'s style of a plain call.
2. The `tsconfigFile` option has **no `vitePreprocess` equivalent** (RESEARCH Open Question 7). `config/typescript/tsconfig.svelte{,.prod}.json` survive only as consumers of **ESLint** (`config/linting/eslint.svelte.js:17` `parserOptions.project`) and the pinned **`svelte-check --tsconfig`**. Confirm nothing else reads that option before deleting it. (`tsconfig.svelte.prod.json` is generated at build time by `preBuild.js` — see §13.)

---

### 4. `src/frontend/tsconfig.json` (config, static)

**Current state, verbatim (`:1-12`, `:22`):**

```json
{
    "extends": "@tsconfig/svelte/tsconfig.json",
    "compilerOptions": {
        "types": ["node", "svelte", "vite/client"],
        "sourceMap": true,
        "target": "ESNext",
        "stripInternal": true,
        // "strict": true,
        // "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "noImplicitThis": true,
        "noUnusedLocals": true,
        ...
        "isolatedModules": true
    },
```

**Upstream's version, verbatim (the change is 3 lines):**

```json
        "types": ["node", "svelte"],
        "sourceMap": true,
        "target": "ESNext",
        "stripInternal": true,
        // @tsconfig/svelte v5 enables "strict" (incl. noImplicitAny); the project intentionally opts into only the flags below, so disable the umbrella and keep the explicit opt-ins
        "strict": false,
        // "noImplicitAny": true,
```

- The `"strict": false` line **is mandatory** (Pitfall 1: `@tsconfig/svelte@5` sets `strict: true`; inheriting it turns on `noImplicitAny` + 4 flags across ~2,733 `any` uses and destroys criterion 4). Comment it as upstream did — the *why* comment style matches CONVENTIONS.md ("comments explain why").
- **Divergence note:** upstream dropped `"vite/client"` from `types`. RESEARCH does not ask for that; it is unrelated to the Svelte 5 migration and this phase says "nothing else changed". Recommend **keeping** `"vite/client"` unless the plan has a specific reason (it types `import.meta.env`, used at `src/frontend/main.ts:11`).
- RESEARCH Q4 additionally wants `"module": "ESNext"` and `"moduleResolution": "Bundler"` **pinned explicitly** on top of the bumped base (upstream did not pin them; the base supplies both). Pinning is the safer choice — it makes a future base bump a no-op.

**JSONC gotcha (hard constraint):** `scripts/preBuild.js:34-35` does

```js
        const rawConfig = readFileSync(baseConfigPath, "utf8")
        const parsedConfig = JSON.parse(rawConfig || "{}")
```

over **`config/typescript/tsconfig.{svelte,electron,server}.json`** — a strict `JSON.parse`, not a JSONC parser. Comments are safe in `src/frontend/tsconfig.json` / `src/server/tsconfig.json` (they are only `extends`ed, never parsed by preBuild), but **adding any comment to `config/typescript/tsconfig.*.json` will throw during `npm run prebuild`**.

---

### 5. `src/server/tsconfig.json` (config, static)

**Mostly already correct** — it already sets `strict: true` and `noImplicitAny: true` explicitly (`:8-9`), so the base bump's `strict` flip is a no-op here. Required work is only: (a) it inherits the removed `importsNotUsedAsValues` from `@tsconfig/svelte@2.0.1` and therefore **cannot be read by TS 5.9** until the base is bumped (both configs extend the same base → the bump is shared), (b) pin `module`/`moduleResolution` if the plan follows RESEARCH Q4.

Reminder from RESEARCH Q6: `config/typescript/tsconfig.server.json` is the parent of this file (`{"extends": "../../src/server/tsconfig.json"}`) and is generated into a `.prod` twin by preBuild.

---

### 6. `package.json` (config, manifest)

**Current state — the scripts the phase touches (`:54-64`):**

```json
        "test": "npm-run-all -s test:unit test:playwright test:format test:svelte",
        "test:unit": "vitest run --config config/testing/vitest.config.ts",
        "test:playwright": "npx playwright test --config config/testing/playwright.config.ts",
        "test:format": "npx prettier --config config/formatting/.prettierrc.yaml --check src scripts",
        "test:svelte": "svelte-check",
        "format:prettier": "npx prettier --config config/formatting/.prettierrc.yaml --write src scripts",
        "lint": "npm-run-all -s lint:electron lint:frontend lint:svelte lint:styles",
        "lint:electron": "eslint -c config/linting/eslint.electron.json --ext .js,.ts src/electron --fix",
        "lint:frontend": "eslint -c config/linting/eslint.frontend.json --ext .js,.ts src/frontend --fix",
        "lint:svelte": "eslint -c config/linting/eslint.svelte.js --ext .svelte src/frontend --fix",
        "lint:styles": "npx stylelint 'src/frontend/**/*.{css,scss,svelte}' --config config/linting/.stylelintrc.json"
```

**Two required edits:**
- `test:svelte`: `"svelte-check"` → `"svelte-check --tsconfig config/typescript/tsconfig.svelte.json"`. Today it passes **no `--tsconfig`** and there is **no root `tsconfig.json`/`jsconfig.json`** (verified absent), so svelte-check's upward traversal finds nothing → a near-clean baseline (Pitfall 6). Under `continue-on-error: true` nobody notices.
- `lint:svelte`: `"eslint -c config/linting/eslint.svelte.js --ext .svelte src/frontend --fix"` → `"npx cross-env ESLINT_USE_FLAT_CONFIG=true eslint -c config/linting/eslint.svelte.flat.mjs src/frontend --fix"` (drop `--ext`: unsupported in flat mode; move the `.svelte` glob into the config's `files:`). `cross-env` is already a devDependency and `npx cross-env` is the established idiom in this file (`:24`, `:33-39`).

**⚠️ Where we intentionally diverge from upstream — DO NOT COPY:**

| Upstream did | We must do | Why |
|---|---|---|
| `"lint": "npm-run-all -s lint:electron lint:frontend lint:styles"` (dropped `lint:svelte`) | **Keep `lint:svelte` in the chain** | TOOL-03 "no existing check was dropped"; criterion 4 |
| deleted `config/linting/eslint.svelte.js` (−45 lines) and removed `eslint-plugin-svelte3` with no replacement | **Migrate** to `eslint-plugin-svelte@3` flat config | Same. This is the single largest deliberate divergence in the phase |
| kept `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` at `^5.62.0` while shipping `typescript@^5.9.3` | Move to **`typescript-eslint@8.71.2`** | v5's peer range caps below TS 5.9 (RESEARCH Standard Stack) |

**Already-current in main — do not "bump" these again:** `@rollup/plugin-terser` is **already `^1.0.0`** (`:72`) and `npm-run-all2` is **already `^9.0.1`** (`:102`). CONTEXT.md's list ("`@rollup/plugin-terser` 0.4.4 → 1.0.0") describes upstream's *older* tree; those two changes are already in main.

**Genuinely stale in main, needs adding:** `terser` is **not** in `devDependencies`, yet `scripts/postBuild.js:4` does `const Terser = require("terser")` and `vite.config.servers.mjs:106` sets `minify: "terser"`. It resolves only via npm hoisting (`node_modules/terser@5.43.1`, pulled in by `@rollup/plugin-terser`). Declare it explicitly (RESEARCH "Declare explicitly").

**Empty `node_modules`:** RESEARCH records `ls node_modules | wc -l` → 0. So the plan's first action is `npm ci` before any baseline command.

---

### 7. `config/linting/eslint.svelte.flat.mjs` (**NEW**) — the one file with no in-repo analog

**Analogs:** rule-for-rule parity source is `config/linting/eslint.frontend.json` (same `@typescript-eslint/*` rule set, same `parserOptions.project: "config/typescript/tsconfig.svelte.json"`). The **flat-config shape** comes from RESEARCH.md Code Example 6 — there is no flat config in this repo to copy.

**Current config being replaced — verbatim, all 45 lines of `config/linting/eslint.svelte.js`:**

```js
module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    plugins: ["svelte3", "@typescript-eslint", "jsdoc", "prefer-arrow"],
    overrides: [
        {
            files: ["*.svelte"],
            processor: "svelte3/svelte3",
        },
    ],
    extends: ["plugin:@typescript-eslint/recommended", "plugin:@typescript-eslint/recommended-requiring-type-checking", "prettier"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "config/typescript/tsconfig.svelte.json",
        ecmaVersion: 2021,
        sourceType: "module",
        extraFileExtensions: [".svelte"],
    },
    settings: {
        "svelte3/typescript": () => require("typescript"),
    },
    rules: {
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/no-misused-promises": "off",
        "@typescript-eslint/no-implied-eval": "off",
        "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
        "--TEMPORARILY-DISABLED": "off",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/naming-convention": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        // disable a11y warnings (not working)
        // "svelte3/valid-compile": ["error", { ignoreWarnings: true }],
    },
}; // always check js config files before executing!!
```

**Critical behavioural notes for whoever writes the replacement:**
- The last rule line is **commented out and the file's own comment says "(not working)"**. So today the job's *real* contribution is `eslint-plugin-svelte3`'s processor surfacing **Svelte compiler diagnostics as lint problems** — the equivalent of `svelte/valid-compile` in the new plugin. In `eslint-plugin-svelte@3`, `svelte/valid-compile` was **removed from `recommended`** → it must be enabled by hand or the check vanishes while still reporting "0 problems" (Pitfall 5). That is the exact failure criterion 4 forbids.
- The 15 `@typescript-eslint/*` overrides above must be re-applied **verbatim** in the flat config. They almost exactly match `eslint.frontend.json`, with **one delta to carry over from the svelte file**: `"@typescript-eslint/no-implied-eval": "off"` exists only here (it is not in `eslint.frontend.json`). The remaining values are duplicated in `eslint.frontend.json` at `:85-98` (`no-unused-vars` with the `^_` patterns is on both, at `eslint.frontend.json:87`) and `no-explicit-any` at `:70`.
- `--ext .svelte` must become a `files: ["**/*.svelte"]` entry (flat mode has no `--ext`); `env: { browser: true, ... }` has no flat equivalent and becomes `languageOptions.globals`.
- Per RESEARCH Q4, **add** `"@typescript-eslint/consistent-type-imports"` to this config (it is already on for `.ts` in `eslint.frontend.json:49`) so `.svelte` files cannot import a type as a value under `verbatimModuleSyntax`.
- Keep a11y muted (Phase 6 re-enables it) — `svelte/valid-compile` with `ignoreWarnings: true` preserves today's intent.
- **Formatting note:** `test:format` = `prettier --check src scripts` — `config/**` is **not** prettier-gated. The existing `config/linting/*.js|json` files use 4-space indent with **semicolons and trailing commas**, inconsistent with the repo's Prettier config. Follow the *sibling* lint config's style for the new file (semicolons are fine here), not Prettier's.

**Fallback if ESLint 8.57 flat mode misbehaves:** Option B in RESEARCH Q3 (bump ESLint to `^9` and migrate all four configs) also forces `eslint-plugin-jsdoc@39` and `eslint-plugin-prefer-arrow@1.2.3` bumps. Decide with the 30-minute spike named in RESEARCH Q3 — do not silently drop to "no Svelte lint".

---

### 8-13. The six `mount()` entry sites (entry point, request-response boot)

**Analog:** each other. Five server files are byte-identical; the frontend differs (Sentry + a vestigial `import "svelte"`).

**`src/frontend/main.ts` — current, verbatim (`:1-7`, `:23-25`):**

```ts
// ----- FreeShow -----
// Svelte app entry point

import * as Sentry from "@sentry/electron/renderer"
import "svelte"
import App from "./App.svelte"
import { ERROR_FILTER } from "./utils/common"
```

```ts
const app = new App({ target: document.body })

export default app
```

**Upstream's diff (exactly this, 2 changed lines):**

```diff
 import * as Sentry from "@sentry/electron/renderer"
-import "svelte"
+import { mount } from "svelte"
 import App from "./App.svelte"
-const app = new App({ target: document.body })
+const app = mount(App, { target: document.body })
```

**`src/server/<id>/main.ts` — current, verbatim (all five identical, 8 lines):**

```ts
import App from "./App.svelte"

const app = new App({
    target: document.body,
    props: {}
})

export default app
```

**Upstream's diff for each server:**

```diff
+import { mount } from "svelte"
 import App from "./App.svelte"

-const app = new App({
+const app = mount(App, {
     target: document.body,
     props: {}
 })
```

**Constraints:**
- Keep `export default app` — the IIFE `build.lib` assigns the default export to the global (RESEARCH Q5).
- Keep `import "svelte"` in `src/frontend/main.ts:5` — vestigial in Svelte 5 but harmless; removing it enlarges the source diff (RESEARCH Q5 explicitly says leave it).
- **Do not** set `compilerOptions.compatibility.componentApi: 4` — the whole point of these six edits is that it is unnecessary.
- `src/server/cam/main.ts` is the **5th server entry** and has **no build path** (`config/building/vite.config.servers.mjs:7-12` lists only four; `scripts/vite/createServerFiles.js` iterates that map). It still must be updated for grep-cleanliness (criterion 1b: `grep -rn "new App(" src` → empty), but it gets **no test/build coverage**. Say so in the plan so it is not rediscovered (Pitfall 9).

---

### 14-21. The eight `verbatimModuleSyntax` type-import fixes (utility/store, transform)

**Analog (the in-repo style being copied):** two conventions already coexist in the codebase and both are correct.

**Convention A — whole-line `import type`** (`src/server/remote/util/stores.ts:2-8`, already correct today):

```ts
import type { AudioChannelData } from "../../../types/Audio"
import type { AudioRoutingConfig } from "../../../types/AudioRouting"
import type { Bible } from "../../../types/Bible"
```

**Convention B — inline `type` modifier** (`src/frontend/utils/cloudSync.ts:1`, already correct today — the lint rule at `eslint.frontend.json:49` is `consistent-type-imports` with `prefer: "type-imports"`, which accepts **either**):

```ts
import { get, type Unsubscriber } from "svelte/store"
```

**The eight violations, with the exact line, the offending names, and upstream's fix:**

| File | Current line | Upstream's fix (verbatim from `git diff e12355a1..refs/remotes/upstream/svelte5`) |
|---|---|---|
| `src/frontend/utils/searchFast.ts:2` | `import { ShowList } from "../../types/Show"` | `import type { ShowList } from "../../types/Show"` |
| `src/server/stage/util/stores.ts:1` | `import { get, Writable, writable } from "svelte/store"` | `import { get, type Writable, writable } from "svelte/store"` |
| `src/server/stage/util/stores.ts:6` | `import { __update, DeepKey, DeepNested, Inferred, Nested } from "../../common/util/stores"` | `import { __update, type DeepKey, type DeepNested, type Inferred, type Nested } from "../../common/util/stores"` |
| `src/server/remote/util/stores.ts:1` | `import { get, Writable, writable } from "svelte/store"` | same inline-`type` treatment |
| `src/server/remote/util/stores.ts:10` | `import { __update, DeepKey, DeepNested, Inferred, Nested } from ...` | same inline-`type` treatment |
| `src/server/remote/util/socket.ts:3` | `import { receiver, ReceiverKey } from "./receiver"` | inline `type ReceiverKey` |
| `src/server/stage/util/itemHelpers.ts:4` | `import { StageItem, StageLayout } from "../../../types/Stage"` | inline/whole-line `type` |
| `src/frontend/audio/audioAnalyser.ts:5,7` | `import { AudioMultichannel, MultichannelInfo } from "./audioMultichannel"` / `import { AudioProcessor, PitchShiftNode } from "./audioProcessor"` | inline `type` on the type names |
| `src/frontend/components/export/projectLink.ts:7` | `import { LinkGenericItem, LinkOverlayItem, … ProjectLink } from "./ProjectLinkTypes"` (11 names on one line) | inline `type` on each (all 11 are `export interface`/`export type` — `ProjectLinkTypes.ts:8-65`) |
| `src/frontend/components/timeline/TimelinePlayback.ts:1` | `import { get, Unsubscriber } from "svelte/store"` | `import { get, type Unsubscriber } from "svelte/store"` |

Notes: RESEARCH's own count was **8 files** (the two `audioAnalyser.ts` lines and the two `stores.ts` pairs collapse into the same file). Zero violations inside `.svelte` files — do **not** go looking for them, and do not "fix" `.svelte` imports as part of this phase (that would violate "zero component rewrites" for no benefit).

---

### 22. `config/testing/playwright.config.ts` (config, test)

**⚠️ Upstream's version is OLDER than main's — do not copy it.** Upstream's whole file is 10 lines (`timeout: 90_000` + `reporter`); main's has `testDir`, `testMatch`, `expect.timeout`, `fullyParallel: false`, `workers: 1`, `retries`, and `use.trace/screenshot` on top. Main's file is the superset.

**Current state, verbatim (all 26 lines):**

```ts
import { defineConfig } from "@playwright/test"

export default defineConfig({
    testDir: ".",
    testMatch: "**/*.test.ts",

    // Electron startup is slow, especially on CI.
    timeout: 120_000,
    expect: { timeout: 10_000 },

    // Run a single Electron instance to avoid port/store conflicts.
    fullyParallel: false,
    workers: 1,

    // Retry only on CI to reduce transient failures.
    retries: process.env.CI ? 2 : 0,

    // HTML report on CI, line reporter locally.
    reporter: [[process.env.CI ? "html" : "line", { outputFolder: "test-output/playwright-report" }]],

    use: {
        // Collect diagnostics for CI failures.
        trace: "on-first-retry",
        screenshot: "only-on-failure"
    }
})
```

**What actually needs to change (for the pixel gate):** because `testMatch: "**/*.test.ts"` and `testDir: "."` (= `config/testing/`), a **new spec dropped into `config/testing/` is picked up automatically** — no config change is strictly required. The plan should still consider:
- `snapshotPathTemplate` / `expect.toHaveScreenshot` defaults: Playwright writes snapshots to `<spec>-snapshots/<name>-<platform>.png` next to the spec. That directory is **not** gitignored (`test-output/` and `test-results/` are — `.gitignore:16-17`), which is exactly where the committed baseline must live.
- `expect.timeout: 10_000` is too short for a first-frame render on CI; per-call timeouts in the new spec (as `start.test.ts` does with `timeout: 10 * timeoutMs`) are the established idiom.
- Adding a **project/`grep` tag** (e.g. `output-render`) is what SC2's command in RESEARCH Validation Architecture assumes (`npx playwright test ... output-render`); `testMatch` alone would also work.

**Upstream's only real contribution here** (`git diff`): `+ timeout: 90_000` and a two-line comment — main's `120_000` already exceeds it. **Nothing to adopt.**

---

### 23. `config/testing/start.test.ts` (test, request-response)

**Analog:** itself. **The upstream repairs listed in CONTEXT.md are ALREADY IN MAIN.** Verify before planning them as work — `git diff e12355a1..refs/remotes/upstream/svelte5 -- config/testing/start.test.ts` is 71 lines of upstream catching *up* to main, not the reverse.

**Already present in main (do not re-add):**
- Splash-window-safe selection + 20×500 ms poll — `:42-49`:

```ts
    // The app opens a small loading/splash window first, then the main window.
    // firstWindow() can return the splash, so explicitly pick the main window (it loads index.html).
    let window = electronApp.windows().find((w) => w.url().includes("index.html"))
    for (let i = 0; i < 20 && !window; i++) {
        await delay(500)
        window = electronApp.windows().find((w) => w.url().includes("index.html"))
    }
    if (!window) window = await electronApp.firstWindow()
```

- Conditional first-run setup guard — `:66-86` (`if ((await setupStart.count()) > 0) { … didSetup = true }`).

**Main is ahead of upstream here (keep main's version):** `args: [".", "--no-sandbox"]` (`:16`), `dialog.showOpenDialog` async mock (`:22-26`, upstream still uses the sync variant), the try/catch failure screenshot (`:132-136`), and the racy-shutdown guard (`:141-147`).

**Patterns to COPY into the new output-render spec** (all from this file):

```ts
// 1. Launch with a throwaway store + production mode  (:13-18)
const tmpSettingFolder = tmp.dirSync({ unsafeCleanup: true })
const electronApp = await electron.launch({
    // --no-sandbox is required for Electron to launch reliably on Linux CI.
    args: [".", "--no-sandbox"],
    env: { ...process.env, NODE_ENV: "production", FS_MOCK_STORE_PATH: tmpSettingFolder.name }
})
```

```ts
// 2. Main-process evaluate() — the escape hatch the output-window trigger needs  (:22-26)
await electronApp.evaluate(async ({ dialog }, tmpDataFolderName) => {
    dialog.showOpenDialog = async (): Promise<any> => {
        return { canceled: false, filePaths: [tmpDataFolderName] }
    }
}, tmpDataFolder.name)
```

```ts
// 3. The seeded show the pixel gate should render — "test line 1..4"  (:107-114)
await window.getByText("Quick Lyrics").click({ timeout: timeoutMs })
let lyricsBox = window.getByPlaceholder("[Verse]")
await lyricsBox.focus()
await lyricsBox.fill(`[Verse]\ntest line 1\ntest line 2\n\n[Chorus]\ntest line 3\ntest line 4`, { timeout: timeoutMs })
await window.getByTestId("create.show.popup.new.show").click({ timeout: timeoutMs })
```

```ts
// 4. Cleanup idiom — never leave a hung Electron process  (:139-152)
const electronProcess = electronApp.process()
await Promise.race([electronApp.close(), delay(5_000)]).catch(() => {})
try {
    if (electronProcess?.pid && !electronProcess.killed) electronProcess.kill("SIGKILL")
} catch {
    // already exited
}
await delay(1_000)
tmpDataFolder.removeCallback()
tmpSettingFolder.removeCallback()
```

**The output trigger — the mechanism that does NOT exist yet.** There is **no `TYPE=output` launch flag/env/CLI arg** anywhere. `TYPE` is an IPC *message*: the main process replies `{ channel: "TYPE", data: "output" }` to a window's `READY` message, and the renderer branches on it.

- Main-process side — `src/electron/index.ts:265-279` (verbatim):

```ts
export async function loadWindowContent(window: BrowserWindow, type: null | "output" = null) {
    const mainOutput = type === null

    if (isProd) window.loadFile("public/index.html").catch(loadingFailed)
    else {
        // load development environment
        if (mainOutput) openDevTools(window)
        window.loadURL("http://localhost:3000").catch(loadingFailed)
    }

    window.webContents.ipc.on(STARTUP, (_event, msg) => {
        if (msg?.channel === "READY") {
            window.webContents.send(STARTUP, { channel: "TYPE", data: type, autoProfile })
        }
    })
```

- Renderer side — `src/frontend/utils/startup.ts:32-50`: `currentWindow.set(type)` → `if (type === "output") { startupOutput(); return }`.
- UI branch — `src/frontend/App.svelte:81-82` `{#if $currentWindow === "output"} <MainOutput /> {/if}`.

**Stable DOM hook for the output page:** `src/frontend/MainOutput.svelte:45` → `class="fill context #output_window"`. The main window never has it (the branch above guarantees it). Use `#output_window` to *find* the page; never `windows()[2]`.

**Known selector usable for the "CSS is real" assertion:** `.dragger` — declared at `src/frontend/MainOutput.svelte:78` (and matched in a click handler at `:30`). RESEARCH's SC3 assertion greps `public/build/bundle.css` for it.

---

### 24. `scripts/assertBuildOutput.js` (**NEW**) (script, file-I/O guard)

**Analogs:** `scripts/cleanBuilds.js` (the closest structural twin: same CJS header, same `join(__dirname, "..")` idiom, same literal-string contract) and `scripts/postBuild.js:168-176` (the contract itself + the throw style).

**Header / require pattern to copy verbatim from `scripts/cleanBuilds.js:1-6`:**

```js
const { existsSync, readdirSync, lstatSync, unlinkSync, rmdirSync, readFileSync, writeFileSync } = require("fs")
const { join } = require("path")

// app build file paths
const buildSveltePath = join(__dirname, "..", "public", "build")
const buildElectronPath = join(__dirname, "..", "build") // this includes server files
```

**The literal-string contract, verbatim (`scripts/postBuild.js:168-176`):**

```js
const devScriptPath = '<script type="module" src="/src/frontend/main.ts"></script>'
const prodHTMLPaths = '<script type="module" crossorigin src="./build/bundle.js"></script><link rel="stylesheet" href="./build/bundle.css">'
function setProductionHTML() {
    const sourceIndexPath = join(__dirname, "..", "public", "index.html")
    let htmlContent = readFileSync(sourceIndexPath, "utf8")
    if (!htmlContent.includes(devScriptPath) && !htmlContent.includes(prodHTMLPaths)) throw new Error("Dev script path changed!")
    htmlContent = htmlContent.replace(devScriptPath, prodHTMLPaths)
    writeFileSync(sourceIndexPath, htmlContent)
}
```

**The mirror of that contract (`scripts/cleanBuilds.js:38-47`)** — the assertion script should own both directions:

```js
function restoreDevelopmentHTML() {
    const devScriptPath = '<script type="module" src="/src/frontend/main.ts"></script>'
    const prodHTMLPaths = '<script type="module" crossorigin src="./build/bundle.js"></script><link rel="stylesheet" href="./build/bundle.css">'
    const sourceIndexPath = join(__dirname, "..", "public", "index.html")
    let htmlContent = readFileSync(sourceIndexPath, "utf8")
    if (!htmlContent.includes(prodHTMLPaths)) return

    htmlContent = htmlContent.replace(prodHTMLPaths, devScriptPath)
    writeFileSync(sourceIndexPath, htmlContent)
}
```

**Error-handling pattern to copy (`postBuild.js:173`):** a guard clause that throws `new Error(...)` for a broken build contract, with a short user-facing message — `no-throw-literal` is enforced repo-wide (CONVENTIONS.md), so `throw new Error(...)`, never a string.

**Logging:** `console.warn` / `console.error` only in scripts (`postBuild.js:103` `process.emitWarning(err)`); `console.log` is used in `postBuild.js:2`-adjacent files but `scripts/vite/createServerFiles.js:2` uses `console.log` freely — scripts/ is outside the `no-console` rule's `src/` scope.

**Prettier applies here.** `test:format` checks `src scripts` with `printWidth: 500`, `tabWidth: 4`, `semi: false`, `singleQuote: false`, `trailingComma: none`. Existing `scripts/*.js` comply. (Note `scripts/postBuild.js:180` opens an IIFE with a leading `;(async () => {` — the accepted way to keep ASI-safe code with `semi: false`.)

**Wire it into `package.json`:** the natural place is the end of the `postbuild` chain (after `setProductionHTML()`), so SC3 fails inside the release path rather than in a separate command nobody runs (RESEARCH Validation Architecture 3a).

---

### 25. `scripts/postBuild.js` (script, file-I/O) — conditional

**Analog:** itself. **Change only if Terser actually aborts**; RESEARCH Q2's verdict is that the shipped bundle is never Terser'd (the dead `build/public/**` copy is), so the failure mode is `process.abort()` killing `npm run postbuild`, not a broken artifact.

**The abort site, verbatim (`:95-106`):**

```js
async function minifyJS(filePath, newPath = "") {
    const unminified = readFileSync(filePath, "utf8")

    try {
        const minified = await Terser.minify(unminified, minifyJSOptions)
        if (!minified?.code) return
        writeFileSync(newPath || filePath, minified.code)
    } catch (err) {
        process.emitWarning(err)
        process.abort()
    }
}
```

**Fallback ladder (RESEARCH Q2, in preference order):** (a) skip `.js` under the copied `public/build/` in `copyPublicFolderAndMinify` (`:53` `if (/\.js$/.exec(curPath)) return await minifyJS(curPath, newPath)` — one condition); (b) delete the provably-dead `build/public/**` copy (`:183`); (c) set `minify: "terser"` on the renderer build. Verify empirically with `node scripts/postBuild.js; echo $?` — do not reason about `mangle.toplevel` safety.

**Ordering trap the plan must respect:** `setProductionHTML()` rewrites `public/index.html` **in place** (`:170-176`) and only `cleanBuilds.js` restores it. `vite.config.mjs:20` serves dev from `root: "public"`. ⇒ **after any `npm run build` the dev app is broken until `node scripts/cleanBuilds.js` runs.** The pixel baseline must be captured build-last, or the harness must close with `cleanBuilds` + `git status --porcelain public/index.html` (Pitfall 7).

---

## Shared Patterns

### A. Build-script guard clauses (`throw new Error` on a broken contract)
**Source:** `scripts/postBuild.js:173`, `scripts/cleanBuilds.js:43`
**Apply to:** `scripts/assertBuildOutput.js`, any new build guard
```js
if (!htmlContent.includes(devScriptPath) && !htmlContent.includes(prodHTMLPaths)) throw new Error("Dev script path changed!")
```
The repo's `no-throw-literal` rule means `Error` instances only. Note `cleanBuilds.js:43` uses `return` (idempotent, no error) for the same check — the *restore* direction is tolerant, the *build* direction is strict. Preserve that asymmetry.

### B. `deleteFolderRecursive` — the repo's one recursive-FS helper, triplicated
**Source:** `scripts/preBuild.js:12-25`, `scripts/postBuild.js:23-36`, `scripts/cleanBuilds.js:15-28` (identical bodies)
**Apply to:** any new script that manages `public/build` or `build/`
Copy it; do not invent a new one or import across scripts (they are standalone CJS entry points, no shared module exists).

### C. `join(__dirname, "..", …)` for repo-relative paths in scripts
**Source:** `scripts/preBuild.js:5-6`, `scripts/cleanBuilds.js:5-6`, `scripts/postBuild.js:181-183`
**Apply to:** `scripts/assertBuildOutput.js`
Scripts are invoked from the repo root by npm, but always resolve from `__dirname`, never `process.cwd()`. (Contrast: `config/building/vite.config.servers.mjs` deliberately uses `process.cwd()` — `:16`, `:68` — because Vite may be run from anywhere. Do not cross the two conventions.)

### D. The asset/CSS name contract (exactly one CSS, correct name, non-empty)
**Source:** `vite.config.mjs:28-39` (renderer → `bundle.css`), `config/building/vite.config.servers.mjs:90-103` (servers → `styles.css`), consumed by `scripts/postBuild.js:168-169` / `scripts/cleanBuilds.js:39-40`
**Apply to:** both Vite configs + the assertion script
```
renderer:  public/build/bundle.css   ← referenced by public/index.html prod literals
servers:   build/electron/<id>/styles.css ← referenced by each src/server/<id>/index.html
```
This is load-bearing in three places and documented in none of them. `cssFileName` + the `names`-aware hook + the assertion script are the three legs.

### E. `cross-env` for env-dependent npm scripts
**Source:** `package.json:24,33-39,45-46`
**Apply to:** the new `lint:svelte` flat-config invocation
```json
"lint:svelte": "npx cross-env ESLINT_USE_FLAT_CONFIG=true eslint -c config/linting/eslint.svelte.flat.mjs src/frontend --fix"
```

### F. `console.info` / `console.warn` / `console.error` — never `console.log` — inside `src/`
**Source:** CONVENTIONS.md + `no-console` error rule (`eslint.frontend.json:120`, `eslint.electron.json:126` allow `error, warn, info, assert, time, timeEnd`)
**Apply to:** any `src/` change (the 8 type-import files — they should need zero logging changes)
`scripts/**` and `config/**` are outside this rule; `scripts/vite/createServerFiles.js:2` uses `console.log` and that is fine.

### G. Type-only imports (`verbatimModuleSyntax` guard)
**Source:** `eslint.frontend.json:49-52` (already on for `.ts`), RESEARCH Q4
**Apply to:** all 8 fixed files + the new flat Svelte config
```json
"@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports", "disallowTypeAnnotations": true }]
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `config/linting/eslint.svelte.flat.mjs` | config (lint) | static | **No flat-config file exists anywhere in the repo.** All four lint configs are eslintrc-format (`eslint.electron.json`, `eslint.frontend.json`, `eslint.svelte.js`, `.stylelintrc.json`). Build the shape from RESEARCH.md Code Example 6; take rule values from `config/linting/eslint.frontend.json`; take `files:` scaffolding from `eslint-plugin-svelte`'s own `configs.recommended`. |

Everything else has a usable analog (usually itself + upstream).

---

## Corrections to the Upstream/Research Record (read before planning)

These are places where CONTEXT.md / RESEARCH.md describe upstream's tree rather than **main's current tree**, or where the two documents disagree. The planner should not spend tasks on work that is already done.

1. **Vite 7 vs Vite 8 — CONTEXT.md and RESEARCH.md disagree, and CONTEXT.md is the later decision.**
   - `01-RESEARCH.md:41` recommends `vite@7.3.7` + `@sveltejs/vite-plugin-svelte@6.2.4` and says (line 84) "**Do not** add `@sveltejs/vite-plugin-svelte@7`, `vite@8` … in this phase".
   - `01-CONTEXT.md:26` says the Vite target is **8.x with plugin 7.x**, explicitly "REVISED by upstream evidence", citing upstream's `vite ^8.0.16` + plugin `^7.1.2`.
   - **CONTEXT.md is the user-decision document and is later** (its revision was committed as `2199277a docs(01): record upstream svelte5 branch as prior art; revise Vite target to 8`). Whatever the plan picks, it must be **one** pairing — plugin 7 peers `vite ^8.0.0`, plugin 6 peers `^6.3.0 || ^7.0.0`; a mismatch fails `npm ci`'s peer resolution. Flag this to the user rather than silently choosing.
2. **The Playwright harness repairs are already in main.** `config/testing/start.test.ts:42-49` (splash poll) and `:66-86` (conditional setup) already match upstream; main's `args: [".", "--no-sandbox"]`, async dialog mock and shutdown guard are **ahead** of upstream. `playwright.config.ts` already has `timeout: 120_000` (upstream's "fix" was `90_000`). Upstream's `git diff` for these two files is 71 lines of *catching up* to main.
3. **`@rollup/plugin-terser` is already `^1.0.0`** (`package.json:72`) and **`npm-run-all2` is already `^9.0.1`** (`:102`). The "0.4.4 → 1.0.0" bump in CONTEXT.md's adopt-list and the `npm-run-all` → `npm-run-all2` change in upstream's diff are already applied in main. Also already present: `engines.node >= 22.12.0`, `overrides.tmp`.
4. **`terser` is still undeclared** — genuinely required work (`scripts/postBuild.js:4`, `vite.config.servers.mjs:106`).
5. **`config/building/rollup.config.mjs` is dead.** `grep` across `package.json`, `scripts/`, `config/`, `.github/workflows/` finds **no reference** — only `AGENTS.md:55` mentions it as "legacy, now deprecated". Its `a11y-` at `:188` therefore needs no change; record the "left as-is because unreferenced" decision in the plan rather than editing dead code (or delete it as deliberate cleanup — either way, decide explicitly).
6. **Four servers are built, five `mount()` sites exist.** `cam` has no build path (`vite.config.servers.mjs:7-12`); still update `src/server/cam/main.ts` for the `new App(` grep gate.
7. **Upstream's deliberate drop of Svelte linting must NOT be replicated** — see §6 and §7. This is the single divergence that costs a real check.
8. **Upstream also edited 100+ `.svelte` files and `src/electron/**`** (107 files total in `git diff --stat e12355a1..refs/remotes/upstream/svelte5`). None of that is in scope for this phase: main's tree is 35 commits ahead and the phase contract is "464 components source-unchanged".
9. **`node_modules/` is empty.** Every command in the baseline procedure needs `npm ci` first; nothing else can run (RESEARCH "Repo state at research time").

---

## Metadata

**Analog search scope:** repo root config files (`vite.config.mjs`, `svelte.config.mjs`, `package.json`, `.gitignore`), `config/{building,typescript,testing,formatting,linting}/`, `scripts/**`, `src/frontend/` (entry + 8 type-import files + `App.svelte`, `MainOutput.svelte`, `utils/startup.ts`), `src/server/**` (6 entries + 3 `index.html`), `src/electron/index.ts`, `.github/workflows/*.yml`; plus the upstream ref `refs/remotes/upstream/svelte5` @ `644e6b1e` (its merge base `e12355a1` for the diff).
**Files scanned:** ~45 on disk + 8 upstream ref reads + 3 upstream diffs.
**Tracked-source gate:** all 12 main-tree analog paths verified with `git ls-files --` (non-empty). No gitignored mirror paths (`.gsd/capabilities/**`) were used or emitted.
**Repo state:** `main` @ `2199277a`; `node_modules/` empty; no root `tsconfig.json`/`jsconfig.json`; no Playwright snapshot directory exists yet (`test-output/` and `test-results/` are gitignored, `.gitignore:16-17`).
**Pattern extraction date:** 2026-10-18
