# Codebase Structure

**Analysis Date:** 2026-10-17

## Directory Layout

```
freeshow/
├── src/
│   ├── electron/        # Node.js/Electron main process (TypeScript → build/)
│   ├── frontend/        # Svelte 3 renderer SPA (main UI + output windows)
│   ├── server/          # Standalone web apps: remote, stage, controller, output_stream
│   └── types/           # Shared type contracts + IPC enums/constants (no runtime logic)
├── config/              # All tool configuration, grouped by purpose
│   ├── building/        # electron-builder + server build configs
│   ├── formatting/      # Prettier
│   ├── linting/         # ESLint (electron/frontend/svelte) + Stylelint
│   ├── testing/         # Vitest + Playwright
│   └── typescript/      # tsconfig files (electron, svelte, server)
├── public/              # Static assets served by the app (index.html, global.css, fonts, lang, proto)
├── scripts/             # Build/dev/release orchestration (Node + shell)
├── .github/             # CI workflows + issue templates
├── package.json         # Scripts, deps, engines (Node >=22.12), main entry
├── vite.config.mjs      # Renderer build (dev server :3000, prod IIFE bundle)
└── svelte.config.mjs    # Svelte preprocess (TypeScript)
```

## Directory Purposes

**`src/electron/`:**
- Purpose: Electron main process — everything that needs Node/native access.
- Contains: 150 files. IPC handlers, persistence, file/media IO, output windows, capture, streaming, native integrations, cloud sync, AI setup.
- Key subdirectories:
  - `IPC/` — `main.ts` (send/receive + `requestToMain`), `responsesMain.ts` (all `Main.*` handlers).
  - `data/` — `store.ts` (electron-store file definitions), `save.ts`, `import.ts`, `export.ts`, `backup.ts`, `zip.ts`, `thumbnails.ts`, `media.ts`, `downloadMedia.ts`, `protected.ts`, `contentProviders.ts`, `bonjour.ts`, `bibleDetecter.ts`.
  - `output/` — `OutputHelper.ts` (facade), `Output.ts` (per-window model), `helpers/` (Lifecycle/Bounds/Send/Values/Visibility/Identify/AlwaysOnTop), `ppt/`.
  - `capture/` — `CaptureHelper.ts`, `CaptureOptions.ts`, `SenderCapture.ts`, `StreamReceiverHost.ts`, `streamFrames.ts`, `senderWorker.ts`.
  - `streaming/` — `RtmpStreamer.ts`, `WebRtcHost.ts`, `encoderDetection.ts`, `encoderProfiles.ts`, `ffmpegManager.ts`.
  - `ndi/`, `omt/`, `blackmagic/` — senders/receivers per output protocol.
  - `audio/` — `audio.ts`, `receiveAudio.ts`, `processAudio.ts`, `IcecastSender.ts`, `nowPlaying.ts`.
  - `cloud/` — `syncManager.ts`, `syncLedger.ts`, `ChurchAppsSyncManager.ts`, `drive.ts`, `cloud.ts`.
  - `contentProviders/` — `ContentProviderRegistry.ts`, `base/`, `planningCenter/`, `churchApps/`, `canva/`, `onStage/`, `amazingLife/`.
  - `ai/` — `llm/`, `setup/`, `stt/`.
  - `timecode/` — `LTC.ts`, `MTC.ts`, `timecode.ts`.
  - `utils/` — `files.ts`, `requests.ts`, `api.ts`, `menuTemplate.ts`, `spellcheck.ts`, `midi.ts`, `oscPatch.ts`, `spotify.ts`, `updater.ts`, `keys.ts`, `gpu.ts`, `close.ts`, `init.ts`, `shows.ts`, `helpers.ts`.
  - Root files: `index.ts` (entry), `preload.ts`, `servers.ts`, `declare.d.ts`.

**`src/frontend/`:**
- Purpose: The Svelte SPA used by both the main window and output windows.
- Contains: 720 files. `App.svelte` (root), `MainLayout.svelte` (editor), `MainOutput.svelte` (output), `stores.ts` (all global state), `global.d.ts`.
- Key subdirectories:
  - `components/` — 577 files, the bulk of the UI, organised by domain (see below).
  - `utils/` — 38 files: `common.ts` (core helpers), `request.ts`/`sendData.ts` (IPC + client data), `startup.ts`, `save.ts`, `createData.ts`, `shortcuts.ts`, `history`, `remoteTalk.ts`/`stageTalk.ts`/`controllerTalk.ts`, `socketHelper.ts`, `cloudSync.ts`, `drive.ts`, `rss.ts`, `weather.ts`, `templates.ts`, `transitions.ts`, `search.ts`/`searchFast.ts`, `analytics.ts`, `profile.ts`, `listeners.ts`, `receivers.ts`.
  - `converters/` — 29 files, one importer per external format; `powerpoint/` subdir; `importHelpers.ts`.
  - `audio/` — 25 files: `audioPlayer.ts`, `audioMicrophone.ts`, `audioMultichannel.ts`, `audioSender.ts`, `audioWaveform.ts`, `spectrumAnalyzer.ts`, `audioAnalyser.ts`, `audioFading.ts`, `audioSidechain.ts`, `audioPlaylist.ts`, `audioChannelRecorder.ts`, `dBUtils.ts`, plus `effects/` and `routing/` (Web Audio graph).
  - `ai/` — 32 files: `manager/` (`AiManager.ts`, `ChatAction.ts`), `llm/` (`llmManager.ts`, `llmSession.ts`, `prompts.ts`), `scripture/`, `stt/`, `components/`.
  - `show/` — `slides.ts` (slide generation).
  - `media/` — `cameraManager.ts`.
  - `classes/` — `Show.ts`.
  - `IPC/` — `main.ts` (`requestMain`), `responsesMain.ts`.
  - `values/` — `autosave.ts`, `icons.ts`, `keys.ts`, `tabs.ts`, `extensions.ts`, `customIcons.ts`, `empty.ts`.

**`src/frontend/components/` (domain groups):**
- `show/` — project/show listing, editor text, slides list, project content, show tools, effect/focus/folder/media/overlay/pdf/ppt sub-areas.
- `slide/` — slide rendering primitives (`Slide.svelte`, `SlideItems.svelte`, `Textbox.svelte`, `TextboxLines.svelte`, `Zoomed.svelte`, `views/`).
- `output/` — `Output.svelte` (output-display composition), `layers/` (Background, Media, Overlay(s), SceneMedia, SlideContent, PdfOutput), `effects/`, `transitions/`, `preview/`, `tools/`, `animation.ts`, `clear.ts`.
- `draw/` — drawing/annotation editor.
- `edit/` — editor panels, `editbox/`, `editors/`, `scripts/`, `tools/`, `values/`.
- `drawer/` — side drawer tabs: `bible/`, `media/`, `audio/`, `calendar/`, `effects/`, `live/`, `player/`, `timers/`, `info/`, `navigation/`, `pages/`.
- `main/` — app chrome: `Top.svelte`, `MenuBar.svelte`, `Popup.svelte`, `Tabs.svelte`, `Toast.svelte`, `Tooltip*.svelte`, `Loader.svelte`, `popups/`.
- `settings/` — settings shell + `tabs/` (General, Outputs, AudioRouting, Profiles, Styles, Theme, Connection, Files, Other).
- `stage/` — stage-display layouts and items.
- `timeline/` — Timeline UI + `timeline.ts`, `ShowTimeline.ts`, `SlideTimeline.ts`, `TimelinePlayback.ts`, easing.
- `media/` — `Image.svelte`, `Video.svelte`, `video/` (video player).
- `actions/` — triggers/emitters (MIDI/OSC/REST/API); `specific/`.
- `context/` — right-click context menus (`contextMenus.ts`, `menuClick.ts`).
- `system/` — reusable widgets (`Center.svelte`, `Resizeable.svelte`, `Clock.svelte`, `Player.svelte`, `DropArea.svelte`, …).
- `inputs/` — form controls, `Material*` prefixed variants.
- `helpers/` — shared logic + small components (`output.ts`, `shows.ts`, `dropActions.ts`, `clipboard.ts`, `history*.ts`, `Icon.svelte`, `T.svelte`, `LazyLoad.svelte`).
- `quicksearch/`, `export/`, `guide/`, `input/`.

**`src/server/`:**
- Purpose: Four standalone Svelte web apps plus shared utilities.
- Contains: 138 files.
- `common/` — `util/` (scripture, style, media, show, icons, stores, autosize, audioStream, …) and `components/` (Button, Dropdown, Tabs, TextInput, Icon, …).
- `remote/` — remote control app (`components/pages/`, `components/show/`, `components/tablet/`, `util/`).
- `stage/` — stage-display app (`components/`, `items/`, `helpers/`, `html/`, `util/`).
- `controller/` — simple controller app.
- `output_stream/` — streamed-output app.
- `cam/` — camera app (present in tree; not in the built server list in `config/building/vite.config.servers.mjs`).
- Root: `sw.js` (service worker), `icon.png`.

**`src/types/`:**
- Purpose: Shared types + IPC constants. No domain logic.
- Contains: 23 files — `Show.ts`, `Audio.ts`, `AudioRouting.ts`, `Bible.ts`, `Calendar.ts`, `Draw.ts`, `Effects.ts`, `History.ts`, `Input.ts`, `Main.ts`, `Output.ts`, `Projects.ts`, `Save.ts`, `Scripture.ts`, `Settings.ts`, `Socket.ts`, `Stage.ts`, `Tabs.ts`, `Channels.ts`, `IPC/Main.ts`, `IPC/ToMain.ts`, `ai/Ai.ts`, `ai/AiSettings.ts`.

**`config/`:**
- `building/` — `electron-builder.yaml` (+ lnxarm), `vite.config.servers.mjs`, `rollup.config.mjs`, snapcraft.
- `linting/` — `eslint.electron.json`, `eslint.frontend.json`, `eslint.svelte.js`, `.stylelintrc.json`.
- `testing/` — `vitest.config.ts`, `playwright.config.ts`, `start.test.ts`.
- `typescript/` — `tsconfig.electron.json` (+ `.prod`), `tsconfig.svelte.json` (+ `.prod`), `tsconfig.server.json`.
- `formatting/` — `.prettierrc.yaml`.

**`public/`:**
- `index.html` (renderer HTML + CSP), `global.css`, `loading.html`, `lang/`, `fonts/`, `assets/` (bin/, effects/, worklets, pdf worker), `proto/` (protobuf schemas for Blackmagic), `import-logos/`.

**`scripts/`:**
- `start.js` (dev), `preBuild.js` / `postBuild.js`, `cleanBuilds.js`, `electronDevPostBuild.js`, `vite/` (`createServerFiles.js`, `watchServers.js`, `testServer.js`), `macos/`, `snap/`, `aero-peek-helper/`.

## Key File Locations

**Entry Points:**
- `src/electron/index.ts`: Electron main entry (app lifecycle, window creation, IPC registration).
- `src/electron/preload.ts`: contextBridge `window.api`.
- `src/frontend/main.ts`: renderer bootstrap.
- `src/frontend/App.svelte`: root component; branches main/output/pdf.
- `src/electron/servers.ts`: hosts the four Socket.IO servers.
- `src/server/{remote,stage,controller,output_stream}/main.ts`: server-app entries.

**Configuration:**
- `package.json`: scripts (`start`, `build`, `test`, `lint`), `main: build/electron/index.js`.
- `vite.config.mjs`: renderer build (dev root `public`, port 3000; prod IIFE `public/build/bundle.js`).
- `config/typescript/tsconfig.*.json`: per-area TS config.
- `config/linting/`, `config/formatting/`: lint/format rules.
- `config/building/electron-builder.yaml`: packaging (appId `app.freeshow`, NSIS/dmg/zip targets).
- `svelte.config.mjs`: Svelte preprocess.

**Core Logic:**
- `src/frontend/stores.ts`: all global renderer state.
- `src/frontend/components/helpers/shows.ts`: `_show` accessor.
- `src/frontend/components/helpers/output.ts`, `showActions.ts`, `dropActions.ts`, `clipboard.ts`: central editing logic.
- `src/frontend/utils/sendData.ts`: state distribution to web clients.
- `src/electron/output/OutputHelper.ts`: output-window management.
- `src/electron/IPC/responsesMain.ts`: all main-process command handlers.
- `src/electron/data/store.ts`: persistence definitions.

**IPC Contract:**
- `src/types/Channels.ts`: channel constants.
- `src/types/IPC/Main.ts`: `Main` enum + payload maps (renderer → main).
- `src/types/IPC/ToMain.ts`: `ToMain` enum + payload maps (main → renderer).

**Testing:**
- `src/frontend/utils/search.test.ts`, `src/frontend/ai/scripture/references.test.ts`, `numbers.test.ts`
- `src/electron/utils/requests.test.ts`, `src/electron/data/zip.test.ts`, `backup.test.ts`, `src/electron/cloud/syncManager.test.ts`, `syncLedger.test.ts`, `src/electron/streaming/RtmpStreamer.integration.test.ts`, `encoderProfiles.test.ts`, `src/electron/ai/stt/sttHelper.test.ts`, `src/electron/contentProviders/onStage/songBuilder.test.ts`
- `config/testing/`: Vitest + Playwright configs.

## Naming Conventions

**Files:**
- Svelte components: `PascalCase.svelte` (e.g. `SlideContent.svelte`, `MaterialTextInput.svelte`). Backing logic for a component lives in a sibling `camelCase.ts` (e.g. `Output.svelte` + `animation.ts`; `Timeline.svelte` + `timeline.ts`).
- TypeScript modules: `camelCase.ts` (e.g. `sendData.ts`, `syncManager.ts`, `nowPlaying.ts`). Classes are often `PascalCase.ts` (`OutputHelper.ts`, `CaptureHelper.ts`, `RtmpStreamer.ts`), but not consistently (`syncManager.ts`, `encoderDetection.ts` are lowercase).
- Tests: `*.test.ts` co-located next to the source (e.g. `src/electron/data/backup.test.ts`); Playwright specs use `*.spec.ts`.
- Types: `PascalCase.ts` matching the domain (`Show.ts`, `Settings.ts`); IPC protocol lives under `IPC/`.

**Directories:**
- Domain-grouped, lowercase, singular or plural as natural (`components/output/`, `components/drawer/`, `electron/contentProviders/`).
- Feature subdirectories nest by concern (`components/settings/tabs/`, `components/output/layers/`).

**Code identifiers:**
- Store variables: `camelCase`, often short (`shows`, `outputs`, `themes`), consumed via `$store`.
- Types/interfaces: `PascalCase` (`Show`, `Slide`, `Media`, `LayoutRef`).
- Enums: `PascalCase` name with `SCREAMING_SNAKE_CASE` members (`Main.SETTINGS`, `ToMain.ALERT`).
- Constants: `SCREAMING_SNAKE_CASE` (`serverPorts`, `DEFAULT_WIDTH`, channel constants).
- Functions: `camelCase`, verbs for actions (`sendData`, `createOutput`, `triggerFunction`).
- Helper widgets/accessors prefixed with `_` when internal (`_show`).

## Where to Add New Code

**New UI feature/panel:**
- Primary code: a new domain folder under `src/frontend/components/<domain>/` with a `PascalCase.svelte` component; put logic in a sibling `camelCase.ts`.
- Global state: add exports to `src/frontend/stores.ts` (keep the `writable(...)` pattern).
- Tests: co-locate `*.test.ts` next to pure-logic modules.

**New renderer→main command:**
- Add the id to the `Main` enum and payload maps in `src/types/IPC/Main.ts`.
- Implement the handler in `src/electron/IPC/responsesMain.ts` (`mainResponses[id]`).
- Call it from the renderer with `requestMain(...)` in `src/frontend/IPC/main.ts` pattern.

**New main→renderer notification:**
- Add to `ToMain` in `src/types/IPC/ToMain.ts`; push with `sendToMain`/`sendMain`; handle in the renderer's `receive(...)` (see `src/frontend/utils/listeners.ts` / `receivers.ts`).

**New external format importer:**
- Add `src/frontend/converters/<format>.ts`, wire it into `src/frontend/converters/importHelpers.ts`.

**New content provider:**
- Add a folder under `src/electron/contentProviders/<name>/`, implement the `base/` interface, register in `ContentProviderRegistry.ts`.

**New output protocol (NDI/OMT/BM/RTMP-like):**
- Add a folder under `src/electron/<protocol>/`; register its channel + `ipcMain.on` in `src/electron/index.ts`/`servers.ts`; add a channel constant in `src/types/Channels.ts`.

**New server app:**
- Add `src/server/<name>/` with `main.ts`, `App.svelte`, `index.html`, `manifest.json`; register it in `config/building/vite.config.servers.mjs` (`servers`) and add it to the port map in `src/electron/servers.ts`.

**Shared utilities:**
- Renderer-wide helpers: `src/frontend/utils/common.ts` (or a new `camelCase.ts` in `utils/`).
- Main-process helpers: `src/electron/utils/`.
- Cross-process logic repeated in one place: put the shared module under `src/server/common/util/` (servers) or `src/types` (types only — never runtime logic there for servers).

## Special Directories

**`build/` (generated, not committed):**
- Purpose: tsc output for the Electron main process (`build/electron/index.js` is `main`). Produced by `build:electron:*` scripts.

**`public/build/` (generated, not committed):**
- Purpose: production renderer bundle (`bundle.js`, `bundle.css`) built by Vite into `public/build`.

**`node_modules/` (generated, not committed):**
- Purpose: dependencies; native modules rebuilt via `postinstall` (`electron-builder install-app-deps`).

**`.planning/codebase/` (committed analysis artifacts):**
- Purpose: these codebase analysis documents consumed by GSD planning commands.

---

*Structure analysis: 2026-10-17*
