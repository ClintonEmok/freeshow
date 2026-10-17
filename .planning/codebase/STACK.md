# Technology Stack

**Analysis Date:** 2026-10-17
<!-- refreshed: 2026-10-17 -->

## Languages

**Primary:**
- TypeScript 4.9.5 - Entire application (Electron main process, Svelte frontend logic, web server clients, shared types)
- Svelte 3.59.2 - All UI components (`.svelte` files under `src/frontend` and `src/server`)
- JavaScript (CommonJS/ESM) - Build scripts and configs under `scripts/` and `config/` (e.g. `scripts/start.js`, `config/building/electron-replace-lnxarm.js`)

**Secondary:**
- SCSS / CSS - Component styles and global styles (linted via stylelint)
- C/C++ compiled bindings - Native Node addons (`better-sqlite3`, `macadam`, `openmediatransport`, `sherpa-onnx-node`, `libltc-wrapper`, `@discordjs/opus`)

## Runtime

**Environment:**
- Node.js >=22.12.0 (declared in `package.json` `engines`; CI uses Node 22 in `.github/workflows/build.yml`)
- Electron ^37.10.3 - desktop application shell (main process `src/electron/index.ts`, preload `src/electron/preload.ts`)

**Package Manager:**
- npm (npm-run-all2 ^9.0.1 used for script orchestration)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Electron ^37.10.3 - Desktop runtime; main process in `src/electron/`, renderer in `src/frontend/`
- Svelte 3.59.2 - Renderer UI framework (`svelte.config.mjs`, `@sveltejs/vite-plugin-svelte` ^2.5.3)
- Express ^4.21.2 - Local HTTP servers for remote/stage/controller/output_stream clients (`src/electron/servers.ts`)
- Socket.IO ^4.8.1 / socket.io-client ^4.8.1 - Real-time IPC between app and browser clients (`src/electron/servers.ts`, `src/server/*/main.ts`)

**Testing:**
- Vitest ^2.1.9 - Unit tests (`config/testing/vitest.config.ts`, `src/**/*.test.ts`)
- Playwright ^1.56.1 / @playwright/test ^1.56.1 - Electron e2e tests (`config/testing/playwright.config.ts`, `config/testing/start.test.ts`)
- svelte-check ^2.10.3 - Svelte type checking
- Actually enforced in `npm test` (see `package.json` scripts)

**Build/Dev:**
- Vite ^4.5.14 - Frontend bundle (`vite.config.mjs`) and server clients (`config/building/vite.config.servers.mjs`)
- TypeScript compiler (`tsc`) - Electron main build via `config/typescript/tsconfig.electron.json` / `tsconfig.electron.prod.json`
- Rollup ^4.46.2 - Legacy build config, now deprecated for servers (`config/building/rollup.config.mjs`)
- electron-builder ^26.16.1 - Packaging/installers (`config/building/electron-builder.yaml`)
- Prettier ^3.6.2 (config `config/formatting/.prettierrc.yaml`) and prettier-plugin-svelte ^3.4.0
- ESLint ^8.57.1 with `@typescript-eslint` ^5.62.0, eslint-plugin-jsdoc, eslint-plugin-svelte3 (configs under `config/linting/`)
- stylelint ^16.23.1 (config `config/linting/.stylelintrc.json`)
- postinstall: `electron-builder install-app-deps`; native rebuilds via `electron-rebuild` (`rebuild-opus`, `rebuild-osr` scripts)

## Key Dependencies

**Critical:**
- `better-sqlite3` ^12.4.6 - Local synchronous SQLite database
- `electron-store` ^8.2.0 - JSON-based persisted config/data stores (`src/electron/data/store.ts`)
- `@googleapis/drive` ^8.16.0 - Google Drive cloud sync (`src/electron/cloud/drive.ts`)
- `axios` ^1.12.2 - HTTP client for API/LLM integration calls
- `@sentry/electron` ^7.3.0 - Error reporting (main `src/electron/IPC/responsesMain.ts`, renderer `src/frontend/main.ts`)
- `electron-updater` ^6.6.7 - Auto-update (`src/electron/utils/updater.ts`)
- `json-bible` ^1.1.9 - Bible data model/import (`src/types/Save.ts`, `src/frontend/converters/bible.ts`)
- `bonjour-service` ^1.3.0 - mDNS/Bonjour service publishing for local servers

**Infrastructure:**
- `express` ^4.21.2 + `socket.io` ^4.8.1 - Local network servers (ports 5510–5513)
- `ffmpeg` (downloaded at runtime) - RTMP streaming/encoding (`src/electron/streaming/ffmpegManager.ts`; source `eugeneware/ffmpeg-static` b6.1.1)
- `yauzl` ^3.2.0 / `yazl` ^3.3.1 - ZIP import/export (`src/electron/data/zip.ts`)
- `websocket` via native `WebSocket` - ChurchApps messaging socket (`src/frontend/utils/SocketHelper.ts`)
- `pusher-js` ^8.5.0 (dev) - Planning Center Live real-time updates
- `firebase` ^12.15.0 (dev) - Remote controller realtime DB (`src/frontend/utils/remoteController.ts`)

**Media/Input/Device integrations:**
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

**Frontend media/UI helpers (devDependencies):**
- `pdfjs-dist` ^5.4.296, `@vimeo/player` ^2.29.3, `youtube-player` ^5.6.0, `dayjs` ^1.11.13, `chord-transposer` ^3.0.9, `qrcode-generator` ^1.5.2, `@soundtouchjs/audio-worklet` ^1.0.10, `@tanstack/pacer` ^0.14.0

## Configuration

**Environment:**
- No `.env` file; runtime config is via `electron-store` (`src/electron/data/store.ts`) with store files (e.g. `ACCESS`, `SETTINGS`, `PROJECTS`)
- Environment variables read at runtime (all optional, in `src/`, grep `process.env.`):
  - `NODE_ENV` - production/development detection (`src/electron/index.ts`)
  - `UV_THREADPOOL_SIZE` - defaults to `32` for capture/NDI concurrency (`src/electron/index.ts`)
  - `FS_CAP_STATS` - capture diagnostic stats (`src/electron/capture/senderWorker.ts`, `src/electron/output/helpers/OutputLifecycle.ts`)
  - `FS_MOCK_STORE_PATH` - throwaway store path for Playwright tests (`src/electron/data/store.ts`)
  - `FS_LINUX_RENDER_NODE`, `FS_LINUX_VAAPI`, `FS_LINUX_MEDIA_LOG` - Linux GPU/VAAPI switches (`src/electron/utils/gpu.ts`, `src/electron/utils/commandLineSwitches.ts`)
  - `FREESHOW_VAAPI_DEVICE` - VAAPI device path, default `/dev/dri/renderD128` (`src/electron/streaming/encoderProfiles.ts`)
  - `SPOTIFY_BRIDGE` - enables Spotify helper process (`src/electron/utils/spotify.ts`)
  - `ONSTAGE_API_URL` - override OnStage API base (`src/electron/contentProviders/onStage/connect.ts`)
  - `VITEST` - disables scheduled backup during tests (`src/electron/cloud/syncManager.ts`)
- API keys are compiled into the app, obfuscated (not env-based): `src/electron/utils/keys.ts` (e.g. `pco_id`, `churchApps_id`, `churchApps_secret`, `amazinglife_id`) and `src/frontend/values/keys.ts` (`bibleapi`, `pixabay`, `unsplash`). AI provider keys are entered by the user and stored in the `ACCESS` store (`src/electron/ai/setup/aiKeys.ts`).

**Build:**
- `vite.config.mjs` - Frontend bundle (root `public/` in dev, output `public/build/bundle.js` in prod)
- `config/building/vite.config.servers.mjs` - Builds remote/stage/controller/output_stream clients to `build/electron/<id>/`
- `config/typescript/tsconfig.electron.json`, `config/typescript/tsconfig.electron.prod.json`, `config/typescript/tsconfig.server.json`, `config/typescript/tsconfig.svelte.json`
- `config/building/electron-builder.yaml`, `config/building/electron-builder-lnxarm.yaml`, `config/building/snapcraft.yaml`, `makesnap`
- `svelte.config.mjs` - Svelte preprocess (TypeScript)

## Platform Requirements

**Development:**
- Node.js >=22.12.0, Python 3.12 + `setuptools` (native addon builds, per `README.md`)
- Windows: Visual Studio "Desktop development with C++" + Windows 10 SDK; Linux: `libfontconfig1-dev` (also `uuid-dev`, `libltc-dev` on CI)
- Dev startup: `npm start` → `scripts/start.js` (spawns Vite, server watcher, Electron + tsc watch)

**Production:**
- Cross-platform desktop app packaged by electron-builder:
  - Windows: NSIS (`config/building/electron-builder.yaml`)
  - macOS: dmg + zip (x64, arm64), hardened runtime, notarized via `scripts/macos/notarize.js`
  - Linux: AppImage, deb, rpm (x64/arm64; `config/building/electron-builder-lnxarm.yaml`) and Snap (`config/building/snapcraft.yaml`)
- Distribution via GitHub Releases; updates via `electron-updater`

---

*Stack analysis: 2026-10-17*
