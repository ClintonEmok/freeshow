# Coding Conventions

**Analysis Date:** 2026-10-17

## Overview

FreeShow is an Electron + Svelte 3 + TypeScript app (GPL-3.0). It has three runtime surfaces under `src/`: `src/electron/` (main process, CommonJS, Node), `src/frontend/` (renderer, Svelte + ESM), and `src/server/` (small standalone Svelte web apps). A shared `src/types/` directory holds the domain models and IPC contracts.

Convention enforcement lives in `config/` (`config/formatting/`, `config/linting/`, `config/typescript/`), driven by npm scripts in `package.json`.

## Formatting (Prettier)

**Config:** `config/formatting/.prettierrc.yaml`

| Option | Value |
|--------|-------|
| `printWidth` | `500` (effectively unlimited — do not wrap long lines) |
| `tabWidth` | `4` (4 spaces, no tabs) |
| `semi` | `false` (no semicolons) |
| `singleQuote` | `false` (double quotes) |
| `trailingComma` | `"none"` |
| plugin | `prettier-plugin-svelte` |

**Rules to follow when writing code:**
- No semicolons at end of statements.
- Always double quotes for strings and imports.
- 4-space indentation (also set in `.vscode/settings.json` as `editor.tabSize: 4`, `editor.defaultFormatter: esbenp.prettier-vscode`, `editor.formatOnSave: true`).
- Do not manually wrap long lines — `printWidth: 500` means long single-line objects/imports are the norm (see the import block in `src/frontend/components/drawer/Drawer.svelte`).
- Blank line between logical statements is common; keeping related lines together is preferred.

**Commands:**
```bash
npx prettier --config config/formatting/.prettierrc.yaml --write src scripts   # format
npm run test:format                                                          # check only
```

## Linting (ESLint + Stylelint)

Three ESLint configs, each targeted by an npm script:
- `config/linting/eslint.electron.json` — `src/electron` (`lint:electron`)
- `config/linting/eslint.frontend.json` — `src/frontend` (`lint:frontend`)
- `config/linting/eslint.svelte.js` — `src/frontend` `.svelte` files (`lint:svelte`)
- `config/linting/.stylelintrc.json` — CSS/SCSS/Svelte styles (`lint:styles`)

**Shared TS rules enforced (both electron + frontend):**
- `@typescript-eslint/consistent-type-imports`: prefer `import type` and no type annotations in value imports. Use `import { type Writable, writable } from "svelte/store"` style (see `src/frontend/stores.ts`).
- `@typescript-eslint/ban-types`: never use `Object`, `Function`, `Boolean`, `Number`, `String`, `Symbol` as types — use `object`, `() => void`, `boolean`, `number`, `string`, `symbol`.
- `@typescript-eslint/array-type`: `"array"` form (`T[]`, not `Array<T>`).
- `@typescript-eslint/no-explicit-any`: **off** — `any` is used widely (e.g. `src/types/Main.ts` payloads).
- `@typescript-eslint/no-unsafe-*` rules: **off** — unsafe assignments/calls/returns are permitted.
- `@typescript-eslint/no-non-null-assertion`: **off** — `!` assertions are used (`gainNode!.gain.value = 0`).
- `max-classes-per-file`: `1`.
- `prefer-const`, `no-var`, `object-shorthand`, `one-var: never`, `eqeqeq: ["error", "smart"]`, `radix`.
- `no-console`: errors. Allowed methods differ per target:
  - Electron (`eslint.electron.json`): `error`, `warn`, `info`, `time`, `timeEnd`.
  - Frontend (`eslint.frontend.json`): `error`, `warn`, `info`, `assert`, `time`, `timeEnd`.
  - `console.log` is **not allowed** in linted code — use `console.info`/`console.warn`/`console.error`, or the toast/error helpers (below).
- `no-underscore-dangle` is error in electron, off in frontend.
- `@typescript-eslint/no-var-requires`: off in electron (CommonJS `require` allowed), error in frontend.
- `@typescript-eslint/no-unused-vars`: `^_`-prefixed names are ignored (`varsIgnorePattern`/`argsIgnorePattern: "^_"`).

**Svelte config** (`config/linting/eslint.svelte.js`) disables many rules for `.svelte` files (a11y warnings are also disabled in `vite.config.mjs`'s `onwarn`).

**Stylelint** (`config/linting/.stylelintrc.json`) extends `stylelint-config-html` and enables `csstools/use-logical` via `stylelint-use-logical`: prefer CSS logical properties (`margin-inline-start` over `margin-left`, `inset-inline` over `left`). A allow-list of physical properties is exempted (width/height/top/bottom/left/margins on the block axis, etc.).

**Commands:**
```bash
npm run lint           # lint:electron + lint:frontend + lint:svelte + lint:styles (all use --fix where supported)
npm run lint:frontend
npm run lint:svelte
npm run lint:styles
```

## Version Control / Formatting Notes

- `.gitattributes` marks `package-lock.json` as `linguist-generated=true`.
- `.gitignore` excludes `test-output/`, `test-results/`, build dirs, and `*.env`.
- CI format + type checks are currently non-blocking (`continue-on-error: true` in `.github/workflows/ci.yml`) because of a pre-existing backlog. Write formatted code anyway; the build is the blocking gate.

## Naming Patterns

**Files:**
- Svelte components: `PascalCase.svelte` — `src/frontend/components/drawer/Drawer.svelte`, `src/frontend/components/main/Popup.svelte`, `src/frontend/components/inputs/Button.svelte`.
- Some components use very short acronym names: `src/frontend/components/helpers/T.svelte` (translation), `Icon.svelte`, `LazyLoad.svelte`.
- TypeScript modules: `camelCase.ts` for utilities/helpers — `src/frontend/utils/common.ts`, `src/frontend/components/helpers/array.ts`.
- Class files: `PascalCase.ts` — `src/frontend/classes/Show.ts` (`ShowObj`), `src/electron/cloud/syncLedger.ts` (`SyncLedger`).
- Types: `PascalCase.ts` in `src/types/` grouped by domain — `src/types/Show.ts`, `src/types/Audio.ts`, `src/types/Settings.ts`.
- Tests: `<subject>.test.ts` co-located next to the subject (see TESTING.md). Integration variants use `<subject>.integration.test.ts`.

**Directories:**
- `lowercase` for feature directories: `src/frontend/components/drawer/bible/`, `src/electron/contentProviders/onStage/`.
- Feature-grouped component folders mirror the UI: `components/main`, `components/drawer`, `components/edit`, `components/stage`, `components/output`, `components/show`.

**Functions / variables:**
- `camelCase` for functions and variables: `getDataFolderPath`, `sendToMain`, `newToast`, `hardwareAccelerationDisabled`.
- Booleans read as predicates: `isMainWindow()`, `isProd`, `isWindows`, `hasPeriod`.
- Constants use `UPPER_SNAKE_CASE` and are declared at module top: `DEFAULT_WIDTH`, `MAX_REPEAT_OCCURRENCES` (`src/electron/contentProviders/onStage/songBuilder.ts`), `ERROR_FILTER` (`src/electron/IPC/responsesMain.ts`).

**Types / interfaces:**
- `PascalCase`. Interfaces are more common than type aliases (258 `export interface` vs 188 `export type`).
- IPC send/response payload maps are typed generically and keyed by a channel enum — see `src/types/IPC/Main.ts`, `src/types/IPC/ToMain.ts`.

**Enums:**
- Only 3 enums exist in the codebase, all in shared type files and IPC/provider contracts: `Main` (`src/types/IPC/Main.ts`), `ToMain` (`src/types/IPC/ToMain.ts`), `ContentProviderErrorType` (`src/electron/contentProviders/base/types.ts`). Prefer string-literal union types elsewhere; use enums only for IPC channels and provider error codes.

## Code Style

**Module exports:**
- **Named exports are the strong default** (1084 `export function` vs 12 `export default`).
- `export default` appears only for app entry points and singleton objects: `src/frontend/main.ts` (`export default app`), `src/server/*/main.ts`, `src/frontend/values/icons.ts` (`export default icons`).
- Do not use barrel/index re-export files — imports point directly at the source module path.

**Function declarations:**
- Prefer `export function name() {}` declarations over `const name = () => {}` (only ~38 arrow-function consts vs ~1084 function declarations).
- Arrow functions are used for callbacks, one-liners, and store mutations (`.map((f) => f.name)`, `sortByTime` internals).

**Imports:**
- Type-only imports are separated: `import type { Show } from "../../types/Show"` and inline `import { type Writable, writable } from "svelte/store"`.
- Import ordering is broadly: (1) external npm packages, (2) shared `types/`, (3) local modules/stores/components — with a blank line commonly separating the external block from internal imports. See the head of `src/frontend/components/drawer/Drawer.svelte` and `src/electron/index.ts`.
- Relative paths only (no path aliases configured in `tsconfig`); `vite.config.mjs` aliases `/src` to `../src` only in dev.
- Imports are frequently kept on one long line (printWidth 500).

**Svelte files:**
- `<script lang="ts">` is standard (540 of 545 `.svelte` files). The 5 without `lang="ts"` are trivial.
- Reactive statements use `$:` (`$: height = $drawer.height`).
- Store access uses the `$store` auto-subscription syntax throughout.
- Props are declared with `export let name` and typed/defaulted inline: `export let size = 1`, `export let replace: string[] = []` (`src/frontend/components/helpers/T.svelte`).
- Svelte module context (`context="module"`) is used sparingly for shared component state (`src/frontend/components/slide/Zoomed.svelte`).
- Styles live in the component `<style>` block; global theme values are CSS custom properties (`var(--primary-lighter)`).
- Container components colocate a sibling `.ts` helper when logic is non-trivial (`src/frontend/components/show/tools/*.ts`).

## Comments

**File header:**
- Entry-point and many core modules begin with a banner: `// ----- FreeShow -----` followed by a short purpose line. 13 `.ts` files use it, including `src/frontend/main.ts`, `src/frontend/stores.ts`, `src/electron/index.ts`, `src/electron/preload.ts`.

**Section separators:**
- Large files are divided with `// ----- SECTION NAME -----` separators (45 occurrences). Examples: `src/frontend/stores.ts` (`// ----- TEMPORARY VARIABLES -----`, `// ----- SAVED VARIABLES -----`, `// ----- STORES LIST -----`), `src/electron/index.ts` (`// ----- STARTUP -----`), `src/electron/IPC/responsesMain.ts` (`// ERROR LOGGER`).

**When to comment:**
- Comments explain **why**, especially workarounds, platform quirks, and non-obvious ordering. Examples: the `UV_THREADPOOL_SIZE` rationale in `src/electron/index.ts`, the timeout/destroy explanation in `src/electron/utils/requests.ts`, the "authoritative last-edit time" note in `src/electron/cloud/syncLedger.ts`.
- Inline references to issues/PRs by number are common (`// (#3335)` in `src/electron/cloud/syncLedger.test.ts`; `// see backup.ts`).
- Commented-out code is left in place in some spots (e.g. `Loader.svelte` keyframe variants) — do not copy this habit.

**JSDoc/TSDoc:**
- Used for exported helpers and non-obvious signatures (~311 `/** ... */` blocks across `.ts`). One-line form for simple helpers: `/** Selects the text inside a text node when the node is focused */` (`src/frontend/components/helpers/inputActions.ts`). Multi-line blocks for complex ones: `src/frontend/utils/searchFast.ts`, `src/frontend/components/helpers/rtmpDestinations.ts`.
- The `eslint-plugin-jsdoc` rules `check-alignment`, `check-indentation`, `newline-after-description` are enabled.

## Error Handling

**Elevated pattern in the Electron main process:**
- Uncaught exceptions are caught centrally by `catchErrors()` and routed to `logError(createLog(err), "main")` in `src/electron/IPC/responsesMain.ts`.
- `logError()` keeps a bounded ring buffer (max 250 entries) in the `ERROR_LOG` store, keyed by `"main" | "renderer" | "request"`.
- Known non-critical errors are filtered by `ERROR_FILTER` (ENOENT, Chromium crash reports, `ERR_INTERNET_DISCONNECTED`, mp4box DataView issue) — check this list before logging noisy errors.
- In production, Sentry is initialized (`autoErrorReport()`, `src/electron/IPC/responsesMain.ts`; renderer in `src/frontend/main.ts`) with the same `ERROR_FILTER` via `beforeSend`.

**try/catch:**
- Dominant pattern is `try { ... } catch (err) { ... }` — `catch (err)` (206) far outnumbers `catch (error)` (36) and `catch (e)` (31). **Use `catch (err)`** unless a more descriptive name clarifies intent (a few use `stopErr`, `scheduleErr`, etc.).
- Errors are surfaced to the user through the toast/alert layer, not thrown to the UI: `newToast(msg)` and `alertMessage.set(...)` in `src/frontend/utils/common.ts`.

**Throwing:**
- Guard clauses throw `new Error(...)` for programmer errors and invalid states (53 `throw new Error`). Example: `throw new Error(\`Invalid channel: ${id}\`)` in `src/electron/IPC/main.ts`.
- `no-throw-literal` is enforced — throw `Error` instances, never raw strings.

**Promises:**
- `@typescript-eslint/no-floating-promises` and `no-misused-promises` are **off**; `.catch(...)` is used where errors must not escape (79 occurrences). Awaiting is preferred over `.then` chains.

## Logging

**Framework:** No logging library. `console.*` plus Sentry.
- Main process: `console.info` for lifecycle messages (`console.info("Starting FreeShow...")` in `src/electron/index.ts`), `console.error` for failures. IPC message traffic is logged in dev only, gated by `LOG_MESSAGES` in `src/electron/preload.ts`.
- `no-console` lint rule means `console.log` will fail linting in `src/` — reserve it for scripts.

**Patterns:**
- Use `console.info` for informational/startup, `console.warn` for recoverable issues, `console.error` for failures.
- User-facing errors go through `newToast()` / `alertMessage` / `sendToMain(ToMain.ALERT, ...)`, not the console.

## Function Design

**Size:** No enforced limit (`complexity` and `max-len` are off). Large functions exist, but they are internally sectioned with comments. Prefer extracting pure helpers into sibling modules (e.g. `src/electron/cloud/syncLedger.ts` was extracted from `syncManager` explicitly to be unit-testable — see its header comment).

**Parameters:** Default parameter values are common (`size = 1`, `timeoutMs = 30000`). Options objects are used for wide signatures (`{ type, textQuery, defaultFontSize, ... }: Options = {}` in `autosize.ts`). Long parameter lists on the existing `httpsRequest` are the exception, not the model.

**Return values:** Return early on guard conditions (`if (!Array.isArray(array)) return false`). Async functions return `Promise`; a mix of `async/await` and explicit `Promise` construction is present.

## Module Design

**Exports:** Named exports only (except entry points). No `index.ts` barrels — import the concrete file path.

**Class design:** One class per file (`max-classes-per-file: 1`). Classes implement a shared interface where a typed contract exists (`export class ShowObj implements Show` in `src/frontend/classes/Show.ts`). Private members use the `private` keyword (and TS private fields) rather than `#` / underscore prefixes.

**Stores:** Svelte writable stores are declared and exported from `src/frontend/stores.ts` with an explicit type annotation on every store: `export const deviceId: Writable<string> = writable("")`. Follow this pattern for new global stores; put feature-local stores in `src/frontend/values/*.ts` or the feature folder.

## IPC Contracts

- Channels are string constants in `src/types/Channels.ts`; the `ValidChannels` union is the type used by the preload bridge.
- Main↔renderer messages are typed by the `Main` and `ToMain` enums (`src/types/IPC/Main.ts`, `src/types/IPC/ToMain.ts`) with generic send-value/response maps; `sendToMain`/`sendMain` validate the channel at runtime and throw on an invalid one.
- Renderer send helpers live in `src/frontend/utils/request.ts` (`send`, `receive`, `destroy`); the Electron side registers handlers in `src/electron/IPC/responsesMain.ts` (`mainResponses` keyed by channel).

## Where to Add New Code

- **New utility (renderer):** `src/frontend/utils/<name>.ts` (cross-cutting) or `src/frontend/components/helpers/<name>.ts` (UI helpers).
- **New Svelte component:** feature folder under `src/frontend/components/<area>/`, `PascalCase.svelte`, with a colocated `PascalCase.ts` if logic warrants it.
- **New main-process module:** `src/electron/<area>/<name>.ts`, CommonJS-compatible, explicit `private` members on classes.
- **New shared type:** `src/types/<Domain>.ts`; IPC contracts in `src/types/IPC/`.
- **New translation string:** via the `T.svelte` helper / dictionary categories, using `id` strings like `"example.default"`.

---

*Convention analysis: 2026-10-17*
