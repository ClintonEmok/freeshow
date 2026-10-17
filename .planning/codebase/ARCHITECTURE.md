# Architecture

**Analysis Date:** 2026-10-17

## Pattern Overview

**Overall:** Electron multi-process desktop application with a Svelte SPA renderer, a Node.js/TypeScript main process, and four additional standalone Svelte "server" apps (remote, stage, controller, output_stream) served over HTTP + Socket.IO.

FreeShow is a church/venue presentation app. It shows lyrics, media, scripture and overlays, drives external displays (output windows), streams to NDI/OMT/RTMP/WebRTC, and exposes web-based remote control surfaces. The codebase splits cleanly along Electron's process boundary, with a strongly-typed IPC contract as the single channel between them.

**Key Characteristics:**
- Four build targets from one repo: renderer SPA (Vite), main process (tsc), four server apps (Vite), plus a shared `src/types` tree with zero runtime.
- Renderer owns all presentation state in Svelte writable stores; the main process owns persistence, file/media IO, output windows, capturing, streaming and native integrations.
- Typed request/response IPC over a single `MAIN` channel plus fire-and-forget notification channels.
- Every "output" (second display / projector) is a separate `BrowserWindow` running the same renderer bundle, rendered by `src/frontend/components/output/Output.svelte`.
- Web clients (phones/tablets) connect to embedded Socket.IO servers and receive filtered show state.

## Layers

**Shared Types (`src/types/`):**
- Purpose: Type contracts shared across renderer, main and servers. No runtime code except channel constants and enums.
- Location: `src/types/`
- Contains: Domain models (`Show.ts`, `Audio.ts`, `Scripture.ts`, `Settings.ts`, `Projects.ts`, `Stage.ts`), IPC protocol (`IPC/Main.ts`, `IPC/ToMain.ts`), channel names (`Channels.ts`), `ai/`.
- Depends on: nothing (leaf).
- Used by: everything.

**Renderer / Frontend (`src/frontend/`):**
- Purpose: The main UI and the output-display UI. One Svelte 3 SPA bundle, loaded both in the main window and in each output window (branches on `currentWindow`).
- Location: `src/frontend/`
- Contains: `App.svelte`, `MainLayout.svelte`, `MainOutput.svelte`, `stores.ts` (all global state), `components/` (577 files), `utils/`, `converters/` (importers), `audio/`, `ai/`, `show/`, `media/`, `IPC/`.
- Depends on: `src/types/`, Electron via `window.api` (contextBridge), the Web Audio API, DOM.
- Used by: the main `BrowserWindow` and each output `BrowserWindow`.

**Preload / IPC Boundary (`src/electron/preload.ts`):**
- Purpose: Exposes a minimal `window.api` (`send`, `receive`, `removeListener`, `getListeners`, `showFilePath`) over `contextBridge`; also forwards `MessagePort`s for stream/audio.
- Location: `src/electron/preload.ts`
- Contains: Logging/filtering of IPC messages in dev, receiver bookkeeping by listener id.
- Depends on: `electron` (`contextBridge`, `ipcRenderer`, `webUtils`), `src/types/Channels.ts`.
- Used by: every renderer-side send/receive.

**Electron Main (`src/electron/`):**
- Purpose: App lifecycle, persistence, file/media IO, window management (outputs), capture, native integrations, cloud sync, streaming, AI setup.
- Location: `src/electron/`
- Entry: `src/electron/index.ts`; `src/electron/preload.ts`.
- Contains: `IPC/` (request handlers), `data/` (electron-store + files + import/export/backup/zip/thumbnails), `output/` (output window management), `capture/`, `ndi/`, `omt/`, `blackmagic/`, `streaming/`, `audio/`, `cloud/`, `contentProviders/`, `ai/`, `timecode/`, `utils/`, `servers.ts`.
- Depends on: `electron`, Node APIs, native modules, `src/types/`.
- Used by: the renderer via IPC; entirely own process.

**Embedded Servers (`src/server/`):**
- Purpose: Standalone Svelte web apps + shared utilities. Served by express/http on fixed ports and talked to via Socket.IO.
- Location: `src/server/` (`common/`, `remote/`, `stage/`, `controller/`, `output_stream/`, `cam/`)
- Contains: Each app has its own `main.ts`, `App.svelte`, `index.html`, `manifest.json`; `common/` holds shared utils + components.
- Depends on: `src/types/`, Socket.IO client.
- Used by: phones/tablets and OBS/streaming clients.

## IPC Contract

There are two directions on one channel (`MAIN`), plus specialized channels in `src/types/Channels.ts` (`STARTUP`, `OUTPUT`, `EXPORT`, `REMOTE`, `STAGE`, `CONTROLLER`, `OUTPUT_STREAM`, `CLOUD`, `NDI`, `OMT`, `BLACKMAGIC`, `AUDIO`).

**Renderer → Main (request/response):**
- Enum `Main` in `src/types/IPC/Main.ts` lists every command (e.g. `Main.SETTINGS`, `Main.SAVE`, `Main.IMPORT`, `Main.MEDIA`). `MainSendPayloads` / `MainReturnPayloads` type the payloads.
- Renderer calls `requestMain(id, value, callback, timeout)` in `src/frontend/IPC/main.ts`. It attaches a unique `listenerId`, sends via `window.api.send(MAIN, { channel, data }, listenerId)`, and resolves on timeout (default 15000ms) or reply.
- Main registers `ipcMain.on(MAIN, receiveMain)` in `src/electron/index.ts`. `receiveMain` (`src/electron/IPC/main.ts`) validates the enum and dispatches to `mainResponses[id]` in `src/electron/IPC/responsesMain.ts`, replying via `e.reply(MAIN, { channel, data }, listenerId)`.
- `requestMainMultiple` sends a batch; `window.api.receive` is the low-level listener used directly in ~50 sites.

**Main → Renderer (notifications + request/response):**
- Enum `ToMain` in `src/types/IPC/ToMain.ts` (e.g. `ToMain.ALERT`, `ToMain.TOAST`, `ToMain.MENU`, `ToMain.API`, `ToMain.RTMP_STATUS`, `ToMain.AI_STATUS`).
- Main pushes with `sendMain(id, value)` / `sendToMain(id, value)` (`src/electron/IPC/main.ts`) → `mainWindow.webContents.send(MAIN, {channel,data}, listenerId)`.
- Main can also *request* from the renderer via `requestToMain(id, value, callback)` using a single shared `MAIN` listener dispatcher keyed by `listenerId` (used for things the renderer must compute, e.g. show/save/api triggers).

**Other channels:** handled by dedicated `ipcMain.on` registrations in `src/electron/index.ts` → `OutputHelper.receiveOutput` (OUTPUT), `startExport` (EXPORT), `cloudConnect` (CLOUD), `receiveNDI`/`receiveOMT`/`receiveBM`/`receiveAudio`. Server IPC bridging is wired in `src/electron/servers.ts`.

## Data Flow

**App startup:**

1. `src/electron/index.ts` runs before `app.ready`: applies command-line switches (`utils/commandLineSwitches.ts`), graphics device selection (`utils/gpu.ts`), parses args (`utils/init.ts`), reads `electron-store` config (`data/store.ts`), registers the privileged `freeshow-protected` scheme, sets the app menu (`utils/menuTemplate.ts`).
2. On `ready`: `setupStores()` loads/creates store files, `registerProtectedProtocol()`, servers boot asynchronously (`require("./servers")`), then `createMain()` opens the `BrowserWindow`; a separate loading window (`public/loading.html`) shows until loaded.
3. Renderer loads `public/index.html` (prod) or `http://localhost:3000` (dev) → `src/frontend/main.ts` instantiates `App.svelte`.
4. Renderer sends `STARTUP` `READY`; main replies with `TYPE` (`null` = main window, `"output"` = output window). `src/frontend/utils/startup.ts` then pulls all stores from main via `requestMain`.

**Opening a show / rendering to output:**

1. User picks content; renderer mutates `showsCache` / `outputs` stores (`src/frontend/stores.ts`).
2. Output windows are created via `send(OUTPUT, ["CREATE"], outputData)` → `OutputHelper.Lifecycle.createOutput` (`src/electron/output/OutputHelper.ts`) spawns a `BrowserWindow` at the right display/bounds.
3. Each output window loads the same renderer bundle, shows `MainOutput.svelte` → `Output.svelte` (`src/frontend/components/output/Output.svelte`), which composites layers (`layers/SlideContent.svelte`, `Background.svelte`, `Overlay.svelte`, `SceneMedia.svelte`) and effects (`effects/EffectOutput.svelte`, `effects/effectRenderer.ts`).
4. Output state is pushed from main window to output windows via `OUTPUT` channel; `OutputHelper.Send.sendToOutputWindow` routes messages.
5. Capture/streaming: `src/electron/capture/CaptureHelper.ts` grabs frames (`capturePage` polling or OSR via `Output.osr`), then fans out to NDI (`ndi/NdiSender.ts`), OMT (`omt/OmtSender.ts`), Blackmagic (`blackmagic/BlackmagicSender.ts`), RTMP (`streaming/RtmpStreamer.ts`), or WebRTC (`streaming/WebRtcHost.ts`).

**Web client (remote/stage/controller):**

1. `src/electron/servers.ts` creates four express + Socket.IO servers: REMOTE `5510`, STAGE `5511`, CONTROLLER `5512`, OUTPUT_STREAM `5513`.
2. Renderer sends to clients via `src/frontend/utils/sendData.ts` (`sendData`, `sendRemote`, …) which filter show/slide state per client type.
3. Client messages arrive through `ipcMain.on(id, …)` in `servers.ts`, forwarded to the renderer via `toApp`; renderer handles them in `remoteTalk.ts` / `stageTalk.ts` / `controllerTalk.ts`.
4. STAGE clients can subscribe to pushed output frames with a heartbeat-renewed TTL (`stageStreamSubscribers` in `servers.ts`).

**Media/audio:**

1. Audio graph is built in the renderer: `src/frontend/audio/audioPlayer.ts`, routing/effects under `audio/routing/` and `audio/effects/`, analysers (`audioAnalyser.ts`, `spectrumAnalyzer.ts`) feed visualisations.
2. `audioSender.ts` hands mixed audio to the main process (`AUDIO` channel → `electron/audio/receiveAudio.ts`) for output devices, Icecast (`audio/IcecastSender.ts`) and now-playing metadata.

**Cloud sync:**

1. `electron/cloud/syncManager.ts` + `syncLedger.ts` reconcile local stores with ChurchApps; `ChurchAppsSyncManager.ts` and `getSyncTeams`/`syncData` handlers in `IPC/responsesMain.ts`. Google Drive handled by `cloud/drive.ts` + `@googleapis/drive`.

## Key Abstractions

**Svelte stores (`src/frontend/stores.ts`):**
- Purpose: Single source of truth for all renderer state (530 lines of `writable(...)` exports).
- Examples: `showsCache`, `shows`, `outputs`, `allOutputs`, `styles`, `themes`, `activeShow`, `selected`, `audio`, `drawSettings`, `ai`.
- Pattern: Components read `$store` and write with `store.set` / `store.update`. No Redux-style reducers; mutations are direct.

**`_show` accessor (`src/frontend/components/helpers/shows.ts`):**
- Purpose: Dependency-tracked read/write of nested show data without full re-renders.
- Pattern: `_show(id).get(key)` / `_show(id).set({key,value})` / `_show(id).slides([...]).get(...)`; `touchShowModified` timestamps edits.
- Examples: `src/frontend/show/slides.ts`, `src/frontend/components/helpers/showActions.ts`.

**OutputHelper (`src/electron/output/OutputHelper.ts`):**
- Purpose: Facade over output-window management, split into single-responsibility helpers.
- Examples: `output/helpers/OutputLifecycle.ts` (create/remove/focus), `OutputBounds.ts`, `OutputVisibility.ts`, `OutputSend.ts`, `OutputValues.ts`, `OutputIdentify.ts`, `OutputAlwaysOnTop.ts`.
- Pattern: static-method class namespace; `receiveOutput` maps channel names to helper calls.

**Converters (`src/frontend/converters/`):**
- Purpose: Import external presentation/song formats into FreeShow shows.
- Examples: `powerpoint/PowerPointHelper.ts`, `propresenter.ts`, `easyworship.ts`, `openlp.ts`, `opensong.ts`, `chordpro.ts`, `csv.ts`, `bible.ts`; `importHelpers.ts` orchestrates.
- Pattern: one module per source app, exporting a parse function.

**Content providers (`src/electron/contentProviders/`):**
- Purpose: Pluggable external content libraries.
- Examples: `ContentProviderRegistry.ts`, `base/`, `planningCenter/`, `churchApps/`, `canva/`, `onStage/`, `amazingLife/`.
- Pattern: registry of provider implementations with typed callbacks over `ToMain.PROVIDER_*`.

**Actions / emitters (`src/frontend/components/actions/`):**
- Purpose: User-configurable triggers (MIDI, OSC, REST, HTTP API, custom).
- Examples: `actions.ts`, `midi.ts`, `rest.ts`, `api.ts`, `apiOSC.ts`, `emitters.ts`.
- Pattern: named action ids dispatched through `triggerFunction` (`src/frontend/utils/common.ts`).

## Entry Points

**Electron main:**
- Location: `src/electron/index.ts`
- Triggers: `electron .` (`package.json` `main: build/electron/index.js`)
- Responsibilities: Pre-ready setup, app menu, hardware-acceleration/graphics config, create main/loading windows, register all `ipcMain` listeners, window lifecycle, quit cleanup.

**Renderer bootstrap:**
- Location: `src/frontend/main.ts` → `src/frontend/App.svelte`
- Triggers: `public/index.html` script tag (`/src/frontend/main.ts` dev; `bundle.js` prod)
- Responsibilities: Sentry init, instantiate `App.svelte`. `App.svelte` mounts `MainOutput` when `$currentWindow === "output"`, `Pdf` when `"pdf"`, else `MainLayout` (the editor UI); runs `startup()`, keydown/click handlers, timers.

**Preload bridge:**
- Location: `src/electron/preload.ts`
- Triggers: each `BrowserWindow` webPreferences preload.
- Responsibilities: expose `window.api`, forward stream/audio `MessagePort`s.

**Servers:**
- Location: `src/electron/servers.ts` (main-process host) with apps under `src/server/{remote,stage,controller,output_stream}/main.ts`
- Triggers: `require("./servers")` in `startApp()`
- Responsibilities: express static hosting + Socket.IO per app; ports REMOTE 5510 / STAGE 5511 / CONTROLLER 5512 / OUTPUT_STREAM 5513.

**Build scripts:**
- `scripts/start.js` (dev orchestrator), `scripts/vite/createServerFiles.js` (build server apps), `scripts/preBuild.js` / `postBuild.js`.

## Error Handling

**Strategy:** Defensive `try/catch` with `console.warn`/`console.error`; non-fatal paths continue. Crash reporting via Sentry, server-side and renderer-side.

**Patterns:**
- Sentry in renderer: `src/frontend/main.ts` (prod only, with `ERROR_FILTER` skip-list from `src/frontend/utils/common.ts`).
- Sentry in main: `src/electron/IPC/responsesMain.ts` (`autoErrorReport`), called in `index.ts`.
- IPC handlers wrapped so a thrown handler error does not crash; timeouts resolve `undefined` and log (`requestMain` in `src/frontend/IPC/main.ts`; `requestToMain` in `src/electron/IPC/main.ts`).
- Invalid channel ids throw only in dev (`isProd` gated) — see `sendToMain`/`sendMain`.
- Window-level handlers: `App.svelte` binds `on:error`/`on:unhandledrejection` to `logerror`.

## Cross-Cutting Concerns

**Logging:** `console.*` throughout; dev IPC logging with channel/data filters in `src/electron/preload.ts` (`filteredChannels`, `filteredChannelsData`). GPU status diagnostics gated behind `FS_CAP_STATS`/Linux (`src/electron/index.ts`). Never use raw `console.log` for user-facing messages — use the `ToMain.ALERT`/`ToMain.TOAST` notifications and the renderer's `newToast` (`src/frontend/utils/common.ts`).

**Validation:** TypeScript across all three areas; `strictNullChecks` everywhere, and `strict: true` additionally for `src/server` (`src/server/tsconfig.json`). IPC boundary validates enum membership at runtime (`Object.values(Main).includes(id)`).

**Authentication / secrets:** Provider tokens and secrets live in the electron-store `ACCESS` file (`contentProviders`, `secrets`) in `src/electron/data/store.ts`. Google Drive uses a bundled API key (`DRIVE_API_KEY` store). ChurchApps pairing handled by `electron/cloud/` and content-provider request modules.

**Persistence:** `electron-store` files defined as `storeFilesData` in `src/electron/data/store.ts` (SETTINGS, SYNCED_SETTINGS, THEMES, PROJECTS, STAGE, OVERLAYS, TEMPLATES, EVENTS, HISTORY, MEDIA, CACHE, USAGE, ERROR_LOG, ACCESS). Portable vs non-portable flagged per file; autosave (`src/frontend/values/autosave.ts`) drives renderer→main saves.

**i18n:** Dictionaries loaded into the `dictionary` store; language data in `src/frontend/utils/language.ts` / `languageData.ts` and `public/lang`.

---

*Architecture analysis: 2026-10-17*
