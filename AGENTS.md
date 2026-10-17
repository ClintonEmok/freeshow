<!-- GSD:project-start source:PROJECT.md -->

## Project

**FreeShow**

FreeShow is a free, open-source desktop presentation app for churches and venues. It displays song lyrics, scripture, media, and overlays on projector/second-screen outputs, and exposes browser-based remote, stage, and controller surfaces over the local network. It is built with Electron (main process) and Svelte 3 (renderer + server apps).

**Core Value:** The show must not fail: during a live service the operator must be able to get lyrics, scripture, and media onto the output displays reliably and instantly, with no visible interruption.

The interface around that — settings, editors, control surfaces — must never compromise it.

### Constraints

- **Tech stack:** Svelte 3.59.2, Electron ^37.10.3, Vite ^4.5.14, TypeScript 4.9.5 — the Svelte version is the gating constraint for shadcn.
- **Compatibility:** Must keep live-presentation reliability. The renderer bundle is shared by the main window and every output window, so bundle size and render performance directly affect output quality.
- **Cross-platform:** Windows, macOS (x64 + arm64, notarized), Linux (x64/arm64, snap). UI changes must hold on all three.
- **Native modules:** Many compiled native addons (`better-sqlite3`, `macadam`, `openmediatransport`, `sherpa-onnx-node`, `libltc-wrapper`, `@discordjs/opus`, `osr-capture`). Build-tooling changes can ripple into native rebuilds.
- **Incremental delivery:** shadcn adoption spans multiple milestones; each milestone must leave the app shippable and the output path untouched.
- **Node:** >=22.12.0; npm with `package-lock.json`.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 4.9.5 - Entire application (Electron main process, Svelte frontend logic, web server clients, shared types)
- Svelte 3.59.2 - All UI components (`.svelte` files under `src/frontend` and `src/server`)
- JavaScript (CommonJS/ESM) - Build scripts and configs under `scripts/` and `config/` (e.g. `scripts/start.js`, `config/building/electron-replace-lnxarm.js`)
- SCSS / CSS - Component styles and global styles (linted via stylelint)
- C/C++ compiled bindings - Native Node addons (`better-sqlite3`, `macadam`, `openmediatransport`, `sherpa-onnx-node`, `libltc-wrapper`, `@discordjs/opus`)

## Runtime

- Node.js >=22.12.0 (declared in `package.json` `engines`; CI uses Node 22 in `.github/workflows/build.yml`)
- Electron ^37.10.3 - desktop application shell (main process `src/electron/index.ts`, preload `src/electron/preload.ts`)
- npm (npm-run-all2 ^9.0.1 used for script orchestration)
- Lockfile: `package-lock.json` (present)

## Frameworks

- Electron ^37.10.3 - Desktop runtime; main process in `src/electron/`, renderer in `src/frontend/`
- Svelte 3.59.2 - Renderer UI framework (`svelte.config.mjs`, `@sveltejs/vite-plugin-svelte` ^2.5.3)
- Express ^4.21.2 - Local HTTP servers for remote/stage/controller/output_stream clients (`src/electron/servers.ts`)
- Socket.IO ^4.8.1 / socket.io-client ^4.8.1 - Real-time IPC between app and browser clients (`src/electron/servers.ts`, `src/server/*/main.ts`)
- Vitest ^2.1.9 - Unit tests (`config/testing/vitest.config.ts`, `src/**/*.test.ts`)
- Playwright ^1.56.1 / @playwright/test ^1.56.1 - Electron e2e tests (`config/testing/playwright.config.ts`, `config/testing/start.test.ts`)
- svelte-check ^2.10.3 - Svelte type checking
- Actually enforced in `npm test` (see `package.json` scripts)
- Vite ^4.5.14 - Frontend bundle (`vite.config.mjs`) and server clients (`config/building/vite.config.servers.mjs`)
- TypeScript compiler (`tsc`) - Electron main build via `config/typescript/tsconfig.electron.json` / `tsconfig.electron.prod.json`
- Rollup ^4.46.2 - Legacy build config, now deprecated for servers (`config/building/rollup.config.mjs`)
- electron-builder ^26.16.1 - Packaging/installers (`config/building/electron-builder.yaml`)
- Prettier ^3.6.2 (config `config/formatting/.prettierrc.yaml`) and prettier-plugin-svelte ^3.4.0
- ESLint ^8.57.1 with `@typescript-eslint` ^5.62.0, eslint-plugin-jsdoc, eslint-plugin-svelte3 (configs under `config/linting/`)
- stylelint ^16.23.1 (config `config/linting/.stylelintrc.json`)
- postinstall: `electron-builder install-app-deps`; native rebuilds via `electron-rebuild` (`rebuild-opus`, `rebuild-osr` scripts)

## Key Dependencies

- `better-sqlite3` ^12.4.6 - Local synchronous SQLite database
- `electron-store` ^8.2.0 - JSON-based persisted config/data stores (`src/electron/data/store.ts`)
- `@googleapis/drive` ^8.16.0 - Google Drive cloud sync (`src/electron/cloud/drive.ts`)
- `axios` ^1.12.2 - HTTP client for API/LLM integration calls
- `@sentry/electron` ^7.3.0 - Error reporting (main `src/electron/IPC/responsesMain.ts`, renderer `src/frontend/main.ts`)
- `electron-updater` ^6.6.7 - Auto-update (`src/electron/utils/updater.ts`)
- `json-bible` ^1.1.9 - Bible data model/import (`src/types/Save.ts`, `src/frontend/converters/bible.ts`)
- `bonjour-service` ^1.3.0 - mDNS/Bonjour service publishing for local servers
- `express` ^4.21.2 + `socket.io` ^4.8.1 - Local network servers (ports 5510–5513)
- `ffmpeg` (downloaded at runtime) - RTMP streaming/encoding (`src/electron/streaming/ffmpegManager.ts`; source `eugeneware/ffmpeg-static` b6.1.1)
- `yauzl` ^3.2.0 / `yazl` ^3.3.1 - ZIP import/export (`src/electron/data/zip.ts`)
- `websocket` via native `WebSocket` - ChurchApps messaging socket (`src/frontend/utils/SocketHelper.ts`)
- `pusher-js` ^8.5.0 (dev) - Planning Center Live real-time updates
- `firebase` ^12.15.0 (dev) - Remote controller realtime DB (`src/frontend/utils/remoteController.ts`)
- `grandiose` (ChurchApps fork) - NDI send/receive (`src/electron/ndi/`)
- `macadam` (vassbo fork) - Blackmagic DeckLink capture/playback (`src/electron/blackmagic/`)
- `openmediatransport` (meros-co fork) - OMT video transport (`src/electron/omt/`)
- `libltc-wrapper` (bitfocus fork) - LTC timecode (`src/electron/timecode/`)
- `osr-capture` (meros-co fork) - Offscreen render capture (`src/electron/capture/`)
- `slideshow` (vassbo fork) - Slide rendering
- `jzz` ^1.9.5 - MIDI in/out (`src/electron/utils/midi.ts`)
- `osc-js` ^2.4.1 - OSC control protocol (`src/electron/utils/oscPatch.ts`)
- `music-metadata` ^7.14.0 - Audio metadata / now-playing (`src/electron/audio/nowPlaying.ts`)
- `@discordjs/opus` ^0.10.0 - Opus encoding for Icecast audio streaming (`src/electron/audio/IcecastSender.ts`)
- `mdb-reader`, `word-extractor`, `protobufjs`, `exif`, `ebml`, `mp4box`, `fast-xml-parser`, `xml2js` - Import/format parsers (`src/electron/data/import.ts`)
- `genius-lyrics` ^4.4.7 - Lyric search (`src/electron/utils/LyricSearch.ts`)
- Optional: `sherpa-onnx-node` ^1.13.7 (local speech-to-text), `libspotifyctl` ^0.3.4 (Spotify bridge, Windows)
- `pdfjs-dist` ^5.4.296, `@vimeo/player` ^2.29.3, `youtube-player` ^5.6.0, `dayjs` ^1.11.13, `chord-transposer` ^3.0.9, `qrcode-generator` ^1.5.2, `@soundtouchjs/audio-worklet` ^1.0.10, `@tanstack/pacer` ^0.14.0

## Configuration

- No `.env` file; runtime config is via `electron-store` (`src/electron/data/store.ts`) with store files (e.g. `ACCESS`, `SETTINGS`, `PROJECTS`)
- Environment variables read at runtime (all optional, in `src/`, grep `process.env.`):
- API keys are compiled into the app, obfuscated (not env-based): `src/electron/utils/keys.ts` (e.g. `pco_id`, `churchApps_id`, `churchApps_secret`, `amazinglife_id`) and `src/frontend/values/keys.ts` (`bibleapi`, `pixabay`, `unsplash`). AI provider keys are entered by the user and stored in the `ACCESS` store (`src/electron/ai/setup/aiKeys.ts`).
- `vite.config.mjs` - Frontend bundle (root `public/` in dev, output `public/build/bundle.js` in prod)
- `config/building/vite.config.servers.mjs` - Builds remote/stage/controller/output_stream clients to `build/electron/<id>/`
- `config/typescript/tsconfig.electron.json`, `config/typescript/tsconfig.electron.prod.json`, `config/typescript/tsconfig.server.json`, `config/typescript/tsconfig.svelte.json`
- `config/building/electron-builder.yaml`, `config/building/electron-builder-lnxarm.yaml`, `config/building/snapcraft.yaml`, `makesnap`
- `svelte.config.mjs` - Svelte preprocess (TypeScript)

## Platform Requirements

- Node.js >=22.12.0, Python 3.12 + `setuptools` (native addon builds, per `README.md`)
- Windows: Visual Studio "Desktop development with C++" + Windows 10 SDK; Linux: `libfontconfig1-dev` (also `uuid-dev`, `libltc-dev` on CI)
- Dev startup: `npm start` → `scripts/start.js` (spawns Vite, server watcher, Electron + tsc watch)
- Cross-platform desktop app packaged by electron-builder:
- Distribution via GitHub Releases; updates via `electron-updater`

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Overview

## Formatting (Prettier)

| Option | Value |
|--------|-------|
| `printWidth` | `500` (effectively unlimited — do not wrap long lines) |
| `tabWidth` | `4` (4 spaces, no tabs) |
| `semi` | `false` (no semicolons) |
| `singleQuote` | `false` (double quotes) |
| `trailingComma` | `"none"` |
| plugin | `prettier-plugin-svelte` |

- No semicolons at end of statements.
- Always double quotes for strings and imports.
- 4-space indentation (also set in `.vscode/settings.json` as `editor.tabSize: 4`, `editor.defaultFormatter: esbenp.prettier-vscode`, `editor.formatOnSave: true`).
- Do not manually wrap long lines — `printWidth: 500` means long single-line objects/imports are the norm (see the import block in `src/frontend/components/drawer/Drawer.svelte`).
- Blank line between logical statements is common; keeping related lines together is preferred.

## Linting (ESLint + Stylelint)

- `config/linting/eslint.electron.json` — `src/electron` (`lint:electron`)
- `config/linting/eslint.frontend.json` — `src/frontend` (`lint:frontend`)
- `config/linting/eslint.svelte.js` — `src/frontend` `.svelte` files (`lint:svelte`)
- `config/linting/.stylelintrc.json` — CSS/SCSS/Svelte styles (`lint:styles`)
- `@typescript-eslint/consistent-type-imports`: prefer `import type` and no type annotations in value imports. Use `import { type Writable, writable } from "svelte/store"` style (see `src/frontend/stores.ts`).
- `@typescript-eslint/ban-types`: never use `Object`, `Function`, `Boolean`, `Number`, `String`, `Symbol` as types — use `object`, `() => void`, `boolean`, `number`, `string`, `symbol`.
- `@typescript-eslint/array-type`: `"array"` form (`T[]`, not `Array<T>`).
- `@typescript-eslint/no-explicit-any`: **off** — `any` is used widely (e.g. `src/types/Main.ts` payloads).
- `@typescript-eslint/no-unsafe-*` rules: **off** — unsafe assignments/calls/returns are permitted.
- `@typescript-eslint/no-non-null-assertion`: **off** — `!` assertions are used (`gainNode!.gain.value = 0`).
- `max-classes-per-file`: `1`.
- `prefer-const`, `no-var`, `object-shorthand`, `one-var: never`, `eqeqeq: ["error", "smart"]`, `radix`.
- `no-console`: errors. Allowed methods differ per target:
- `no-underscore-dangle` is error in electron, off in frontend.
- `@typescript-eslint/no-var-requires`: off in electron (CommonJS `require` allowed), error in frontend.
- `@typescript-eslint/no-unused-vars`: `^_`-prefixed names are ignored (`varsIgnorePattern`/`argsIgnorePattern: "^_"`).

## Version Control / Formatting Notes

- `.gitattributes` marks `package-lock.json` as `linguist-generated=true`.
- `.gitignore` excludes `test-output/`, `test-results/`, build dirs, and `*.env`.
- CI format + type checks are currently non-blocking (`continue-on-error: true` in `.github/workflows/ci.yml`) because of a pre-existing backlog. Write formatted code anyway; the build is the blocking gate.

## Naming Patterns

- Svelte components: `PascalCase.svelte` — `src/frontend/components/drawer/Drawer.svelte`, `src/frontend/components/main/Popup.svelte`, `src/frontend/components/inputs/Button.svelte`.
- Some components use very short acronym names: `src/frontend/components/helpers/T.svelte` (translation), `Icon.svelte`, `LazyLoad.svelte`.
- TypeScript modules: `camelCase.ts` for utilities/helpers — `src/frontend/utils/common.ts`, `src/frontend/components/helpers/array.ts`.
- Class files: `PascalCase.ts` — `src/frontend/classes/Show.ts` (`ShowObj`), `src/electron/cloud/syncLedger.ts` (`SyncLedger`).
- Types: `PascalCase.ts` in `src/types/` grouped by domain — `src/types/Show.ts`, `src/types/Audio.ts`, `src/types/Settings.ts`.
- Tests: `<subject>.test.ts` co-located next to the subject (see TESTING.md). Integration variants use `<subject>.integration.test.ts`.
- `lowercase` for feature directories: `src/frontend/components/drawer/bible/`, `src/electron/contentProviders/onStage/`.
- Feature-grouped component folders mirror the UI: `components/main`, `components/drawer`, `components/edit`, `components/stage`, `components/output`, `components/show`.
- `camelCase` for functions and variables: `getDataFolderPath`, `sendToMain`, `newToast`, `hardwareAccelerationDisabled`.
- Booleans read as predicates: `isMainWindow()`, `isProd`, `isWindows`, `hasPeriod`.
- Constants use `UPPER_SNAKE_CASE` and are declared at module top: `DEFAULT_WIDTH`, `MAX_REPEAT_OCCURRENCES` (`src/electron/contentProviders/onStage/songBuilder.ts`), `ERROR_FILTER` (`src/electron/IPC/responsesMain.ts`).
- `PascalCase`. Interfaces are more common than type aliases (258 `export interface` vs 188 `export type`).
- IPC send/response payload maps are typed generically and keyed by a channel enum — see `src/types/IPC/Main.ts`, `src/types/IPC/ToMain.ts`.
- Only 3 enums exist in the codebase, all in shared type files and IPC/provider contracts: `Main` (`src/types/IPC/Main.ts`), `ToMain` (`src/types/IPC/ToMain.ts`), `ContentProviderErrorType` (`src/electron/contentProviders/base/types.ts`). Prefer string-literal union types elsewhere; use enums only for IPC channels and provider error codes.

## Code Style

- **Named exports are the strong default** (1084 `export function` vs 12 `export default`).
- `export default` appears only for app entry points and singleton objects: `src/frontend/main.ts` (`export default app`), `src/server/*/main.ts`, `src/frontend/values/icons.ts` (`export default icons`).
- Do not use barrel/index re-export files — imports point directly at the source module path.
- Prefer `export function name() {}` declarations over `const name = () => {}` (only ~38 arrow-function consts vs ~1084 function declarations).
- Arrow functions are used for callbacks, one-liners, and store mutations (`.map((f) => f.name)`, `sortByTime` internals).
- Type-only imports are separated: `import type { Show } from "../../types/Show"` and inline `import { type Writable, writable } from "svelte/store"`.
- Import ordering is broadly: (1) external npm packages, (2) shared `types/`, (3) local modules/stores/components — with a blank line commonly separating the external block from internal imports. See the head of `src/frontend/components/drawer/Drawer.svelte` and `src/electron/index.ts`.
- Relative paths only (no path aliases configured in `tsconfig`); `vite.config.mjs` aliases `/src` to `../src` only in dev.
- Imports are frequently kept on one long line (printWidth 500).
- `<script lang="ts">` is standard (540 of 545 `.svelte` files). The 5 without `lang="ts"` are trivial.
- Reactive statements use `$:` (`$: height = $drawer.height`).
- Store access uses the `$store` auto-subscription syntax throughout.
- Props are declared with `export let name` and typed/defaulted inline: `export let size = 1`, `export let replace: string[] = []` (`src/frontend/components/helpers/T.svelte`).
- Svelte module context (`context="module"`) is used sparingly for shared component state (`src/frontend/components/slide/Zoomed.svelte`).
- Styles live in the component `<style>` block; global theme values are CSS custom properties (`var(--primary-lighter)`).
- Container components colocate a sibling `.ts` helper when logic is non-trivial (`src/frontend/components/show/tools/*.ts`).

## Comments

- Entry-point and many core modules begin with a banner: `// ----- FreeShow -----` followed by a short purpose line. 13 `.ts` files use it, including `src/frontend/main.ts`, `src/frontend/stores.ts`, `src/electron/index.ts`, `src/electron/preload.ts`.
- Large files are divided with `// ----- SECTION NAME -----` separators (45 occurrences). Examples: `src/frontend/stores.ts` (`// ----- TEMPORARY VARIABLES -----`, `// ----- SAVED VARIABLES -----`, `// ----- STORES LIST -----`), `src/electron/index.ts` (`// ----- STARTUP -----`), `src/electron/IPC/responsesMain.ts` (`// ERROR LOGGER`).
- Comments explain **why**, especially workarounds, platform quirks, and non-obvious ordering. Examples: the `UV_THREADPOOL_SIZE` rationale in `src/electron/index.ts`, the timeout/destroy explanation in `src/electron/utils/requests.ts`, the "authoritative last-edit time" note in `src/electron/cloud/syncLedger.ts`.
- Inline references to issues/PRs by number are common (`// (#3335)` in `src/electron/cloud/syncLedger.test.ts`; `// see backup.ts`).
- Commented-out code is left in place in some spots (e.g. `Loader.svelte` keyframe variants) — do not copy this habit.
- Used for exported helpers and non-obvious signatures (~311 `/** ... */` blocks across `.ts`). One-line form for simple helpers: `/** Selects the text inside a text node when the node is focused */` (`src/frontend/components/helpers/inputActions.ts`). Multi-line blocks for complex ones: `src/frontend/utils/searchFast.ts`, `src/frontend/components/helpers/rtmpDestinations.ts`.
- The `eslint-plugin-jsdoc` rules `check-alignment`, `check-indentation`, `newline-after-description` are enabled.

## Error Handling

- Uncaught exceptions are caught centrally by `catchErrors()` and routed to `logError(createLog(err), "main")` in `src/electron/IPC/responsesMain.ts`.
- `logError()` keeps a bounded ring buffer (max 250 entries) in the `ERROR_LOG` store, keyed by `"main" | "renderer" | "request"`.
- Known non-critical errors are filtered by `ERROR_FILTER` (ENOENT, Chromium crash reports, `ERR_INTERNET_DISCONNECTED`, mp4box DataView issue) — check this list before logging noisy errors.
- In production, Sentry is initialized (`autoErrorReport()`, `src/electron/IPC/responsesMain.ts`; renderer in `src/frontend/main.ts`) with the same `ERROR_FILTER` via `beforeSend`.
- Dominant pattern is `try { ... } catch (err) { ... }` — `catch (err)` (206) far outnumbers `catch (error)` (36) and `catch (e)` (31). **Use `catch (err)`** unless a more descriptive name clarifies intent (a few use `stopErr`, `scheduleErr`, etc.).
- Errors are surfaced to the user through the toast/alert layer, not thrown to the UI: `newToast(msg)` and `alertMessage.set(...)` in `src/frontend/utils/common.ts`.
- Guard clauses throw `new Error(...)` for programmer errors and invalid states (53 `throw new Error`). Example: `throw new Error(\`Invalid channel: ${id}\`)` in `src/electron/IPC/main.ts`.
- `no-throw-literal` is enforced — throw `Error` instances, never raw strings.
- `@typescript-eslint/no-floating-promises` and `no-misused-promises` are **off**; `.catch(...)` is used where errors must not escape (79 occurrences). Awaiting is preferred over `.then` chains.

## Logging

- Main process: `console.info` for lifecycle messages (`console.info("Starting FreeShow...")` in `src/electron/index.ts`), `console.error` for failures. IPC message traffic is logged in dev only, gated by `LOG_MESSAGES` in `src/electron/preload.ts`.
- `no-console` lint rule means `console.log` will fail linting in `src/` — reserve it for scripts.
- Use `console.info` for informational/startup, `console.warn` for recoverable issues, `console.error` for failures.
- User-facing errors go through `newToast()` / `alertMessage` / `sendToMain(ToMain.ALERT, ...)`, not the console.

## Function Design

## Module Design

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

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## Pattern Overview

- Four build targets from one repo: renderer SPA (Vite), main process (tsc), four server apps (Vite), plus a shared `src/types` tree with zero runtime.
- Renderer owns all presentation state in Svelte writable stores; the main process owns persistence, file/media IO, output windows, capturing, streaming and native integrations.
- Typed request/response IPC over a single `MAIN` channel plus fire-and-forget notification channels.
- Every "output" (second display / projector) is a separate `BrowserWindow` running the same renderer bundle, rendered by `src/frontend/components/output/Output.svelte`.
- Web clients (phones/tablets) connect to embedded Socket.IO servers and receive filtered show state.

## Layers

- Purpose: Type contracts shared across renderer, main and servers. No runtime code except channel constants and enums.
- Location: `src/types/`
- Contains: Domain models (`Show.ts`, `Audio.ts`, `Scripture.ts`, `Settings.ts`, `Projects.ts`, `Stage.ts`), IPC protocol (`IPC/Main.ts`, `IPC/ToMain.ts`), channel names (`Channels.ts`), `ai/`.
- Depends on: nothing (leaf).
- Used by: everything.
- Purpose: The main UI and the output-display UI. One Svelte 3 SPA bundle, loaded both in the main window and in each output window (branches on `currentWindow`).
- Location: `src/frontend/`
- Contains: `App.svelte`, `MainLayout.svelte`, `MainOutput.svelte`, `stores.ts` (all global state), `components/` (577 files), `utils/`, `converters/` (importers), `audio/`, `ai/`, `show/`, `media/`, `IPC/`.
- Depends on: `src/types/`, Electron via `window.api` (contextBridge), the Web Audio API, DOM.
- Used by: the main `BrowserWindow` and each output `BrowserWindow`.
- Purpose: Exposes a minimal `window.api` (`send`, `receive`, `removeListener`, `getListeners`, `showFilePath`) over `contextBridge`; also forwards `MessagePort`s for stream/audio.
- Location: `src/electron/preload.ts`
- Contains: Logging/filtering of IPC messages in dev, receiver bookkeeping by listener id.
- Depends on: `electron` (`contextBridge`, `ipcRenderer`, `webUtils`), `src/types/Channels.ts`.
- Used by: every renderer-side send/receive.
- Purpose: App lifecycle, persistence, file/media IO, window management (outputs), capture, native integrations, cloud sync, streaming, AI setup.
- Location: `src/electron/`
- Entry: `src/electron/index.ts`; `src/electron/preload.ts`.
- Contains: `IPC/` (request handlers), `data/` (electron-store + files + import/export/backup/zip/thumbnails), `output/` (output window management), `capture/`, `ndi/`, `omt/`, `blackmagic/`, `streaming/`, `audio/`, `cloud/`, `contentProviders/`, `ai/`, `timecode/`, `utils/`, `servers.ts`.
- Depends on: `electron`, Node APIs, native modules, `src/types/`.
- Used by: the renderer via IPC; entirely own process.
- Purpose: Standalone Svelte web apps + shared utilities. Served by express/http on fixed ports and talked to via Socket.IO.
- Location: `src/server/` (`common/`, `remote/`, `stage/`, `controller/`, `output_stream/`, `cam/`)
- Contains: Each app has its own `main.ts`, `App.svelte`, `index.html`, `manifest.json`; `common/` holds shared utils + components.
- Depends on: `src/types/`, Socket.IO client.
- Used by: phones/tablets and OBS/streaming clients.

## IPC Contract

- Enum `Main` in `src/types/IPC/Main.ts` lists every command (e.g. `Main.SETTINGS`, `Main.SAVE`, `Main.IMPORT`, `Main.MEDIA`). `MainSendPayloads` / `MainReturnPayloads` type the payloads.
- Renderer calls `requestMain(id, value, callback, timeout)` in `src/frontend/IPC/main.ts`. It attaches a unique `listenerId`, sends via `window.api.send(MAIN, { channel, data }, listenerId)`, and resolves on timeout (default 15000ms) or reply.
- Main registers `ipcMain.on(MAIN, receiveMain)` in `src/electron/index.ts`. `receiveMain` (`src/electron/IPC/main.ts`) validates the enum and dispatches to `mainResponses[id]` in `src/electron/IPC/responsesMain.ts`, replying via `e.reply(MAIN, { channel, data }, listenerId)`.
- `requestMainMultiple` sends a batch; `window.api.receive` is the low-level listener used directly in ~50 sites.
- Enum `ToMain` in `src/types/IPC/ToMain.ts` (e.g. `ToMain.ALERT`, `ToMain.TOAST`, `ToMain.MENU`, `ToMain.API`, `ToMain.RTMP_STATUS`, `ToMain.AI_STATUS`).
- Main pushes with `sendMain(id, value)` / `sendToMain(id, value)` (`src/electron/IPC/main.ts`) → `mainWindow.webContents.send(MAIN, {channel,data}, listenerId)`.
- Main can also *request* from the renderer via `requestToMain(id, value, callback)` using a single shared `MAIN` listener dispatcher keyed by `listenerId` (used for things the renderer must compute, e.g. show/save/api triggers).

## Data Flow

## Key Abstractions

- Purpose: Single source of truth for all renderer state (530 lines of `writable(...)` exports).
- Examples: `showsCache`, `shows`, `outputs`, `allOutputs`, `styles`, `themes`, `activeShow`, `selected`, `audio`, `drawSettings`, `ai`.
- Pattern: Components read `$store` and write with `store.set` / `store.update`. No Redux-style reducers; mutations are direct.
- Purpose: Dependency-tracked read/write of nested show data without full re-renders.
- Pattern: `_show(id).get(key)` / `_show(id).set({key,value})` / `_show(id).slides([...]).get(...)`; `touchShowModified` timestamps edits.
- Examples: `src/frontend/show/slides.ts`, `src/frontend/components/helpers/showActions.ts`.
- Purpose: Facade over output-window management, split into single-responsibility helpers.
- Examples: `output/helpers/OutputLifecycle.ts` (create/remove/focus), `OutputBounds.ts`, `OutputVisibility.ts`, `OutputSend.ts`, `OutputValues.ts`, `OutputIdentify.ts`, `OutputAlwaysOnTop.ts`.
- Pattern: static-method class namespace; `receiveOutput` maps channel names to helper calls.
- Purpose: Import external presentation/song formats into FreeShow shows.
- Examples: `powerpoint/PowerPointHelper.ts`, `propresenter.ts`, `easyworship.ts`, `openlp.ts`, `opensong.ts`, `chordpro.ts`, `csv.ts`, `bible.ts`; `importHelpers.ts` orchestrates.
- Pattern: one module per source app, exporting a parse function.
- Purpose: Pluggable external content libraries.
- Examples: `ContentProviderRegistry.ts`, `base/`, `planningCenter/`, `churchApps/`, `canva/`, `onStage/`, `amazingLife/`.
- Pattern: registry of provider implementations with typed callbacks over `ToMain.PROVIDER_*`.
- Purpose: User-configurable triggers (MIDI, OSC, REST, HTTP API, custom).
- Examples: `actions.ts`, `midi.ts`, `rest.ts`, `api.ts`, `apiOSC.ts`, `emitters.ts`.
- Pattern: named action ids dispatched through `triggerFunction` (`src/frontend/utils/common.ts`).

## Entry Points

- Location: `src/electron/index.ts`
- Triggers: `electron .` (`package.json` `main: build/electron/index.js`)
- Responsibilities: Pre-ready setup, app menu, hardware-acceleration/graphics config, create main/loading windows, register all `ipcMain` listeners, window lifecycle, quit cleanup.
- Location: `src/frontend/main.ts` → `src/frontend/App.svelte`
- Triggers: `public/index.html` script tag (`/src/frontend/main.ts` dev; `bundle.js` prod)
- Responsibilities: Sentry init, instantiate `App.svelte`. `App.svelte` mounts `MainOutput` when `$currentWindow === "output"`, `Pdf` when `"pdf"`, else `MainLayout` (the editor UI); runs `startup()`, keydown/click handlers, timers.
- Location: `src/electron/preload.ts`
- Triggers: each `BrowserWindow` webPreferences preload.
- Responsibilities: expose `window.api`, forward stream/audio `MessagePort`s.
- Location: `src/electron/servers.ts` (main-process host) with apps under `src/server/{remote,stage,controller,output_stream}/main.ts`
- Triggers: `require("./servers")` in `startApp()`
- Responsibilities: express static hosting + Socket.IO per app; ports REMOTE 5510 / STAGE 5511 / CONTROLLER 5512 / OUTPUT_STREAM 5513.
- `scripts/start.js` (dev orchestrator), `scripts/vite/createServerFiles.js` (build server apps), `scripts/preBuild.js` / `postBuild.js`.

## Error Handling

- Sentry in renderer: `src/frontend/main.ts` (prod only, with `ERROR_FILTER` skip-list from `src/frontend/utils/common.ts`).
- Sentry in main: `src/electron/IPC/responsesMain.ts` (`autoErrorReport`), called in `index.ts`.
- IPC handlers wrapped so a thrown handler error does not crash; timeouts resolve `undefined` and log (`requestMain` in `src/frontend/IPC/main.ts`; `requestToMain` in `src/electron/IPC/main.ts`).
- Invalid channel ids throw only in dev (`isProd` gated) — see `sendToMain`/`sendMain`.
- Window-level handlers: `App.svelte` binds `on:error`/`on:unhandledrejection` to `logerror`.

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
