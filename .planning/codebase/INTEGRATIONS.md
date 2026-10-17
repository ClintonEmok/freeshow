# External Integrations

**Analysis Date:** 2026-10-17
<!-- refreshed: 2026-10-17 -->

## APIs & External Services

**Content providers (worship/church planning):**
- **Planning Center Online (PCO)** - Import services, plans, songs; PCO Live countdown/real-time
  - SDK/Client: custom `httpsRequest` (Node `https`) — `src/electron/contentProviders/planningCenter/`
  - Auth: OAuth 2.0 + PKCE (client id in `src/electron/utils/keys.ts` `pco_id`); token store `ACCESS`
  - Base URL: `https://api.planningcenteronline.com` (`src/electron/contentProviders/planningCenter/connect.ts`)
  - Real-time: Pusher over `https://services.planningcenteronline.com` (`src/electron/contentProviders/planningCenter/live.ts`, `pusher-js`)
- **ChurchApps** - Import/export services and songs; content library
  - SDK/Client: custom `httpsRequest` — `src/electron/contentProviders/churchApps/`
  - Auth: OAuth 2.0 (client id/secret in `src/electron/utils/keys.ts` `churchApps_id` / `churchApps_secret`)
  - APIs: `https://api.churchapps.org`, `https://content.churchapps.org`, `https://api.lessons.church`, app `https://admin.b1.church` (`src/electron/contentProviders/churchApps/types.ts`)
- **OnStage** - Presenter/service import
  - SDK/Client: `onStageApiRequest` — `src/electron/contentProviders/onStage/connect.ts`
  - Auth: OAuth 2.0 + PKCE (local redirect on port 5503); base `https://on-stage.app/api` (overridable via `ONSTAGE_API_URL`)
- **AmazingLife (APlay)** - Kids content library (programs/venues/videos)
  - SDK/Client: `AmazingLifeConnect` / `AmazingLifeContentLibrary` — `src/electron/contentProviders/amazingLife/`
  - Auth: OAuth (client id in `src/electron/utils/keys.ts` `amazinglife_id`)
  - APIs: `https://api.joinamazing.com`, `https://app.joinamazing.com`, OAuth `https://api.joinamazing.com/prod/aims/oauth`, content `https://api-prod.amazingkids.app`; media via Mux `https://stream.mux.com` (`src/electron/contentProviders/amazingLife/types.ts`)
- **Canva** - Design/content library
  - SDK/Client: `CanvaConnect` + `OAuth2Helper` — `src/electron/contentProviders/canva/CanvaConnect.ts`
  - Auth: OAuth 2.0 + PKCE, user-supplied client id/secret stored in `ACCESS.secrets`; redirect `http://127.0.0.1:5520/auth/complete`
  - APIs: authorize `https://www.canva.com/api/oauth/authorize`, token `https://api.canva.com/rest/v1/oauth/token`, API `https://api.canva.com/rest` (`src/electron/contentProviders/canva/CanvaProvider.ts`)

**AI / LLM providers:**
- **Anthropic** - `https://api.anthropic.com/v1/messages` (models `https://api.anthropic.com/v1/models`), header `x-api-key`, `anthropic-version: 2023-06-01` (`src/electron/ai/llm/providers/anthropic.ts`)
- **OpenAI** - `https://api.openai.com/v1/chat/completions` / `https://api.openai.com/v1/models` (`src/electron/ai/llm/providers/openai.ts`)
- **Google Gemini** - `https://generativelanguage.googleapis.com/v1beta/models` (`src/electron/ai/llm/providers/google.ts`)
- **Ollama (local)** - `http://127.0.0.1:11434` (`src/electron/ai/llm/providers/ollama.ts`)
- Provider keys entered by users, stored under `ACCESS.secrets.aiProviders` (`src/electron/ai/setup/aiKeys.ts`); registry in `src/electron/ai/llm/llmProviders.ts`

**AI / Speech-to-text (local):**
- **Nemotron 3.5 streaming ASR** via `sherpa-onnx-node` (optional native dep) — model files downloaded from Hugging Face `https://huggingface.co/csukuangfj2/sherpa-onnx-nemotron-3.5-asr-streaming-0.6b-1120ms-int8-2026-06-11` (pinned revision + SHA-256), Silero VAD from `https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx` (`src/electron/ai/setup/models/nemotron.ts`, `src/electron/ai/stt/`)

**Media & metadata APIs:**
- **Unsplash** - Photo search, `https://api.unsplash.com/search/photos` (`src/frontend/components/drawer/media/unsplash.ts`), key obfuscated in `src/frontend/values/keys.ts` (`unsplash`)
- **Pixabay** - Photo/video search, `https://pixabay.com/api/` (`src/frontend/components/drawer/media/pixabay.ts`), key `pixabay`
- **Google Fonts** - Dynamic font loading, `https://fonts.googleapis.com/css2` (`src/frontend/components/helpers/fonts.ts`)
- **YouTube** - Video playback + oEmbed metadata `https://www.youtube.com/oembed`, embed referer set to `https://freeshow.app/` (`src/electron/index.ts`, `src/frontend/components/drawer/player/playerHelper.ts`)
- **Vimeo** - oEmbed `https://vimeo.com/api/oembed.json` (`src/frontend/components/drawer/player/playerHelper.ts`); Vimeo videos referenced from ChurchApps import
- **Genius (lyrics)** - `genius-lyrics` package (`src/electron/utils/LyricSearch.ts`)
- **Hymnary.org** - Hymn/tune search `https://hymnary.org/...` (HTML/CSV scrape) (`src/electron/utils/LyricSearch.ts`)
- **Ultimate Guitar** - Chord chart search `https://www.ultimate-guitar.com/search.php` (`src/electron/utils/LyricSearch.ts`)

**Scripture / Bible:**
- Library: `json-bible` package + Bible API key obfuscated in `src/frontend/values/keys.ts` (`bibleapi`), used via `src/frontend/components/drawer/bible/scripture.ts`
- Verse of the Day: `https://churchapps.github.io/VotdContent/v1/verses.json` (`src/frontend/components/main/votd.ts`)

**Translation & localization:**
- **Google Translate (unofficial endpoint)** - `https://translate.googleapis.com/translate_a/single` (`src/frontend/components/main/popups/localization/translation.ts`)

**Livestream / media transport:**
- **RTMP** - FFmpeg-based multi-destination streaming (`src/electron/streaming/RtmpStreamer.ts`, `encoderProfiles.ts`); e.g. `rtmp://a.rtmp.youtube.com/live2/KEY`
- **WebRTC / WHIP** - WHIP HTTP POST signaling for WebRTC output, with `User-Agent: OBS/30.0.0` (`src/electron/streaming/WebRtcHost.ts`)
- **Icecast** - Opus/Ogg audio streaming with metadata (`src/electron/audio/IcecastSender.ts`, `nowPlaying.ts`)
- **FFmpeg** - Downloaded at runtime from `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1` (`src/electron/streaming/ffmpegManager.ts`)

**Device / protocol integrations (local network / hardware):**
- **NDI** - Send/receive via `grandiose` (`src/electron/ndi/`)
- **Blackmagic DeckLink** - Capture/playback via `macadam` (`src/electron/blackmagic/`)
- **OMT (Open Media Transport)** - Video transport via `openmediatransport` (`src/electron/omt/`)
- **MIDI** - Device I/O via `jzz` (`src/electron/utils/midi.ts`)
- **OSC** - Control via `osc-js` (`src/electron/utils/oscPatch.ts`)
- **Timecode** - LTC via `libltc-wrapper`, MTC (`src/electron/timecode/`)
- **Spotify** - Local control bridge via optional `libspotifyctl` (`src/electron/utils/spotify.ts`)
- **mDNS/Bonjour** - Advertises local servers via `bonjour-service` (`src/electron/data/bonjour.ts`)

## Data Storage

**Databases:**
- Local SQLite via `better-sqlite3` ^12.4.6 (native)
- Primary persistence is JSON files managed by `electron-store` ^8.2.0 — `src/electron/data/store.ts` (stores: `SHOWS`, `SETTINGS`, `SYNCED_SETTINGS`, `THEMES`, `PROJECTS`, `STAGE`, `OVERLAYS`, `TEMPLATES`, `EVENTS`, `HISTORY`, `MEDIA`, `CACHE`, `ACCESS`, `DRIVE_API_KEY`, etc.), stored under the Electron userData directory

**File Storage:**
- Local filesystem (user data folder + user-selected media folders) — `src/electron/utils/files.ts`
- Cloud backup/sync via **Google Drive** (service-account JSON key, `DRIVE_API_KEY` store) — `src/electron/cloud/drive.ts`, `syncManager.ts`, `syncLedger.ts`
- ChurchApps content/zip downloaded from S3-backed content server `https://content.churchapps.org` (`src/electron/cloud/ChurchAppsSyncManager.ts`)

**Caching:**
- In-memory caches (frontend store) + on-disk `CACHE` / `CACHE_SYNC` electron-store files; per-query in-memory cache for Unsplash

## Authentication & Identity

**Auth Provider:**
- **Custom OAuth 2.0 (authorization code + PKCE)** for Planning Center, OnStage, Canva, ChurchApps, and AmazingLife; each provider runs a short-lived local Express server on a fixed port to catch the redirect:
  - PCO 5501 (`src/electron/contentProviders/planningCenter/connect.ts`)
  - ChurchApps 5502 (`src/electron/contentProviders/churchApps/ChurchAppsConnect.ts`)
  - OnStage 5503 (`src/electron/contentProviders/onStage/connect.ts`)
  - Canva 5520 (`src/electron/contentProviders/canva/CanvaConnect.ts`)
  - AmazingLife (local `/auth/complete`) (`src/electron/contentProviders/amazingLife/AmazingLifeConnect.ts`)
- **Google service account** (JSON key file) for Drive — `src/electron/cloud/drive.ts`
- Tokens/credentials persisted in the `ACCESS` electron-store file (`src/electron/data/store.ts`, `src/electron/data/contentProviders.ts`)
- **Anonymous device identity** — `node-machine-id` used as a device/client id (`src/frontend/utils/analytics.ts`)

## Monitoring & Observability

**Error Tracking:**
- **Sentry** (`@sentry/electron` ^7.3.0) — main process DSN in `src/electron/IPC/responsesMain.ts` (`autoErrorReport`, production only), renderer DSN in `src/frontend/main.ts`; disabled when `autoErrorReporting` config is false or app name differs (fork guard)

**Analytics:**
- **Google Analytics Measurement Protocol** — events POSTed to `https://www.google-analytics.com/mp/collect` with measurement id / API secret (`src/frontend/utils/analytics.ts`; app version, page/drawer views, scripture usage)

**Logs:**
- `console` logging to stdout (main + renderer); optional capture diagnostics gated by `FS_CAP_STATS` (`src/electron/capture/`, `src/electron/output/helpers/OutputLifecycle.ts`)

## CI/CD & Deployment

**Hosting:**
- GitHub Releases (electron-builder `--publish always`, `package.json` `release` script)
- Windows code signing via Azure Trusted Signing (`config/building/electron-builder.yaml` `azureSignOptions`); macOS notarization via `scripts/macos/notarize.js`

**CI Pipeline:**
- GitHub Actions — `.github/workflows/`:
  - `ci.yml` — manually triggered: format check, `svelte-check`, and a blocking `npm run build` (Node 22, Ubuntu)
  - `build.yml` — manual matrix build (windows/macos/ubuntu)
  - `release.yml` — on push to `main`: publishes Windows/Linux/macOS releases (env: `GITHUB_TOKEN`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`)
  - `playwright.yml`, `winget.yml`

## Environment Configuration

**Required env vars:**
- None are required to run; all are optional overrides (see `process.env.` usages in `src/`): `NODE_ENV`, `UV_THREADPOOL_SIZE`, `FS_CAP_STATS`, `FS_MOCK_STORE_PATH`, `FS_LINUX_RENDER_NODE`, `FS_LINUX_VAAPI`, `FS_LINUX_MEDIA_LOG`, `FREESHOW_VAAPI_DEVICE`, `SPOTIFY_BRIDGE`, `ONSTAGE_API_URL`, `VITEST`
- Release/CI only: `GITHUB_TOKEN`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`

**Secrets location:**
- Compiled-in app API keys are XOR-obfuscated in source: `src/electron/utils/keys.ts` (`pco_id`, `churchApps_id`, `churchApps_secret`, `amazinglife_id`, `enc_general`, `enc_salt`) and `src/frontend/values/keys.ts` (`bibleapi`, `pixabay`, `unsplash`)
- User-entered secrets (AI keys, Canva client credentials, OAuth tokens) stored locally in the `ACCESS` electron-store file (`src/electron/data/store.ts`, `src/electron/data/contentProviders.ts`)
- Firebase config for the remote controller is hard-coded in `src/frontend/utils/remoteController.ts`

## Webhooks & Callbacks

**Incoming:**
- OAuth redirect callbacks served by ephemeral local Express servers:
  - `http://localhost:5501/auth/complete` (Planning Center)
  - `http://localhost:5502/auth/complete` (ChurchApps)
  - `http://localhost:5503/auth/complete` (OnStage)
  - `http://127.0.0.1:5520/auth/complete` (Canva)
  - AmazingLife local `/auth/complete`
- Local application servers (`src/electron/servers.ts`): REMOTE 5510, STAGE 5511, CONTROLLER 5512, OUTPUT_STREAM 5513 (Express + Socket.IO; also `/nowplayingcover`)

**Outgoing:**
- **Firebase Realtime Database** for the remote controller — `https://freeshow-net-default-rtdb.europe-west1.firebasedatabase.app` project `freeshow-net`; the app writes and subscribes to `control/{id}` commands (`src/frontend/utils/remoteController.ts`)
- **ChurchApps messaging WebSocket** — `wss://socket.churchapps.org` and REST `https://api.churchapps.org/messaging` (`src/frontend/utils/SocketHelper.ts`)
- **PCO Live Pusher** channel subscriptions authorized through `https://services.planningcenteronline.com` (`src/electron/contentProviders/planningcenter/live.ts`)
- **Update check** — `https://api.github.com/repos/ChurchApps/freeshow/releases` (`src/frontend/utils/checkForUpdates.ts`)
- **PCO/ChurchApps/OnStage/Canva/AmazingLife** API requests (see above)

---

*Integration audit: 2026-10-17*
