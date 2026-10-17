# Codebase Concerns

**Analysis Date:** 2026-10-17

<!-- refreshed: 2026-10-17 -->

FreeShow is a large Electron + Svelte 3 desktop app (~1013 source files across `src/electron`, `src/frontend`, `src/server`, `src/types`) for song lyrics, media, and multi-output presentation. This audit covers the full repo. The dominant risks are (1) inconsistent Electron process hardening, (2) LAN servers and an HTTP/WebSocket API that authenticate nothing by default, (3) very large "god" modules with weak type safety, and (4) a near-absent automated test gate.

## Tech Debt

**Type safety eroded across the codebase:**
- Issue: `strict: true` and `noImplicitAny: true` are commented out in the frontend tsconfig; ~2733 explicit `: any` annotations and 33 `@ts-ignore`/`@ts-nocheck`/`@ts-expect-error`/`eslint-disable` escapes remain.
- Files: `src/frontend/tsconfig.json` (lines 5-6 commented), `src/electron/tsconfig.json`, `src/types/*.ts`, plus `: any` usage concentrated in `src/frontend/components/helpers/output.ts`, `src/frontend/utils/createData.ts`, `src/electron/*`.
- Impact: type errors surface at runtime instead of compile time; refactors are risky because nothing enforces contracts between IPC main/renderer.
- Fix approach: enable `strict` on the frontend tsconfig module-by-module using the `svelte-check` backlog as the burn-down list, starting with `src/types/` and the IPC layer (`src/electron/IPC/main.ts`, `src/types/IPC/*`).

**God modules:**
- Issue: several files far exceed maintainable size and mix unrelated responsibilities.
- Files: `src/frontend/components/output/effects/effectRenderer.ts` (3009 lines), `src/frontend/components/context/menuClick.ts` (2529), `src/frontend/components/drawer/bible/scripture.ts` (2285), `src/frontend/components/helpers/output.ts` (2126), `src/frontend/converters/powerpoint/PowerPointHelper.ts` (1992), `src/frontend/components/helpers/showActions.ts` (1671), `src/electron/utils/files.ts` (1478), `src/frontend/components/helpers/clipboard.ts` (1472), `src/frontend/utils/createData.ts` (1431).
- Impact: high merge-conflict cost, hard-to-review diffs, and difficult isolation of bugs; `menuClick.ts` and `output.ts` are touched by most features.
- Fix approach: extract cohesive units (e.g. effect definitions out of `effectRenderer.ts`, action registries out of `menuClick.ts`) behind existing barrels; add tests as units are extracted.

**Empty catch blocks swallow errors (180 occurrences):**
- Issue: `catch {}` / `catch (err) {}` with no handling or logging hides failures in import, media, and audio paths.
- Files: `src/frontend/converters/propresenter.ts:498,512,526`, `src/frontend/converters/songbeamer.ts:153,156`, `src/frontend/utils/SocketHelper.ts:97,220`, `src/frontend/components/drawer/bible/Scripture.svelte:222`, `src/frontend/components/drawer/audio/metronome.ts:79`, `src/electron/data/protected.ts:41,45`.
- Impact: silent data loss on file import and dropped media; users see "nothing happened" with no error log.
- Fix approach: route failures into the existing `ERROR_LOG` store (`src/electron/data/store.ts:50`) via `actionComplete`/`sendToMain`, and make swallowed catches at least log a warning.

**Inconsistent / outdated toolchain:**
- Issue: Svelte 3.59.2, `svelte-check` 2.10.3, TypeScript 4.9.5, ESLint 8.57.1, Vite 4.5.14, `@sveltejs/vite-plugin-svelte` 2.5.3 — several major versions behind.
- Files: `package.json`, `svelte.config.mjs`, `vite.config.mjs`, `config/linting/*`, `config/typescript/*`.
- Impact: no access to Svelte 4/5 ergonomics or TS5 features; ESLint 8 is EOL; security fixes only arrive via the maintained branch.
- Fix approach: upgrade in stages (ESLint 9 + typescript-eslint, then TS 5, then Vite/Svelte) behind the non-blocking format/type-check job in `.github/workflows/ci.yml`.

**GitHub-commit-pinned runtime dependencies:**
- Issue: six runtime deps are pinned to raw commit SHAs on GitHub forks, so they bypass semver and registry scanning.
- Files: `package.json` — `grandiose` (ChurchApps/grandiose), `macadam` (vassbo/macadam), `slideshow` (vassbo/slideshow), `osr-capture` (meros-co/osr-capture), `openmediatransport` (meros-co/openmediatransport-node), `libltc-wrapper` (bitfocus/libltc-wrapper).
- Impact: `npm audit` cannot track them; a force-push or repo deletion breaks installs; no security advisories.
- Fix approach: vendor/fork into the org with tags, or replace `exif`-style one-offs with maintained packages; pin to tags with `npm pack` hashes.

**Deprecated / unmaintained packages:**
- Issue: `exif@^0.6.0` is deprecated upstream; `mp4box@^0.6.5` is effectively unmaintained; `music-metadata@^7` (current is v11), `genius-lyrics@^4` scrape-based.
- Files: `package.json` (`dependencies`), consumers in `src/electron/data/thumbnails.ts`, `src/electron/utils/LyricSearch.ts`.
- Impact: breakage on media/EXIF parsing and lyrics scraping with no upstream fixes.
- Fix approach: replace `exif` with `exifreader`/`exifr`, upgrade `music-metadata`, and provide a non-scraping lyrics fallback.

**Security-advisory patch workarounds:**
- Issue: npm `overrides` force `shell-quote@^1.8.4`, `tmp@^0.2.7`, `tar@^7.5.20`, indicating transitive vulnerabilities were patched by override rather than by updating callers.
- Files: `package.json` (`overrides`).
- Impact: overrides can conflict with future upgrades and mask the real dependency chain.
- Fix approach: track which dependents pull these and update them so the overrides can be removed.

**Unresolved TODO/FIXME backlog (72 markers, many runtime-behavioral):**
- Issue: recurring "history" gaps and duplicated logic.
- Files: `src/types/History.ts:13`, `src/frontend/show/slides.ts:98,214`, `src/frontend/utils/sendData.ts:132` ("msg does not change!!!"), `src/frontend/utils/listeners.ts:107,114,452`, `src/frontend/components/helpers/history.ts:197`, `src/frontend/components/helpers/historyHelpers.ts:29,339`, `src/frontend/components/show/Slides.svelte:97`, `src/frontend/converters/txt.ts:403`.
- Impact: undo/redo is missing for many actions; duplicated preview/update logic drifts.
- Fix approach: triage into a backlog and convert each to an issue; prioritize the `History.ts:13` "remove/update" item since it blocks history coverage.

## Known Bugs

**Send-data message never changes:**
- Symptoms: a "send data" action does not reflect updated content.
- Files: `src/frontend/utils/sendData.ts:132` (`// TODO: msg does not change!!!`).
- Trigger: re-sending data to a server/remote that should differ from the previous payload.
- Workaround: None documented.

**TXT import splits slides incorrectly:**
- Symptoms: adding a `[group]` marker splits all slides with no children for some inputs.
- Files: `src/frontend/converters/txt.ts:403`.
- Trigger: importing a specific TXT structure with group markers.
- Workaround: None documented.

**"Ghost" video across multiple outputs:**
- Symptoms: playing the same video in multiple outputs creates an unclearable ghost video element.
- Files: `src/frontend/components/show/VideoShow.svelte:205`.
- Trigger: start the same media item in two active outputs.
- Workaround: None documented.

**Looping fails for player/vimeo videos:**
- Symptoms: looping Vimeo or player videos reloads the video rather than looping smoothly.
- Files: `src/frontend/components/drawer/player/Vimeo.svelte:177`, `src/frontend/components/system/Player.svelte:27`.
- Trigger: enabling loop on a Vimeo/player media item.

**Duplicated preview/update path drift:**
- Symptoms: slide preview and out update logic diverge ("duplicate function of preview:126 - updateOut").
- Files: `src/frontend/components/show/Slides.svelte:97`.

## Security Considerations

**Electron window hardening is inconsistent (highest priority):**
- Risk: multiple windows run with full Node integration and no context isolation, so any injected/imported content in those windows has OS-level code execution.
- Files: `src/electron/utils/windowOptions.ts:17-20` (`loadingOptions`: `nodeIntegration: true`, `contextIsolation: false`), `:80-83` (`screenIdentifyOptions`: `contextIsolation: false`), `:86-99` (`exportOptions`: `contextIsolation` commented out, `nodeIntegration: !isProd`); `src/electron/streaming/WebRtcHost.ts:103-109` (hidden window with `contextIsolation: false`, `nodeIntegration: true`, `webSecurity: false` in every build).
- Current mitigation: `mainOptions`/`outputOptions`/`captureOptions` use `contextIsolation: true` plus a `preload` (`src/electron/preload.ts`), and the main window sets `allowRunningInsecureContent: false`.
- Recommendations: move the loading/identify/WebRtcHost windows to `contextIsolation: true` with a minimal preload, or disable `nodeIntegration` there and use IPC; never leave `webSecurity: false` in production paths.

**`shell.openExternal` without URL validation:**
- Risk: if any renderer/integration can pass an arbitrary string to `Main.URL`, `file://` or custom-scheme URLs can launch local executables (known Electron RCE vector).
- Files: `src/electron/IPC/responsesMain.ts:400` (`openURL` calls `shell.openExternal(url)` directly), registered at `:94`; callers include OAuth providers (`src/electron/contentProviders/base/OAuth2Helper.ts:63`, `planningCenter/connect.ts:128`, `churchApps/ChurchAppsConnect.ts:166`, `onStage/connect.ts:216`).
- Current mitigation: callers pass provider-built URLs, but there is no allowlist in `openURL` itself.
- Recommendations: validate `url.startsWith("https://")` (allowlist `http`/`mailto`) before `openExternal`.

**HTTP/WebSocket action API authenticates nothing by default:**
- Risk: `apiPassword` defaults to `""` and `checkAuth` returns `true` whenever the password is empty (`!apiPassword || ...`), so any machine on the LAN can POST actions to the REST port (5506) or send WebSocket/OSC actions (5505) with no credential. CORS is `origin: "*"`. OSC binds `0.0.0.0`.
- Files: `src/electron/utils/api.ts:17-18,38,65,134-138,178,198`.
- Current mitigation: optional password configured in settings; OSC/REST still bound to all interfaces.
- Recommendations: require a non-empty password before starting listeners (fail closed), or generate a per-install token and show it in the connection UI; add an origin check for REST.

**Remote/Stage/Controller/Output-Stream servers have no authentication:**
- Risk: Socket.IO servers on ports 5510-5513 accept any connection up to a `max` (default 10) and forward messages straight to the app (`toApp`), so anyone reachable can drive outputs, stage views, and controllers. There is no token check in the connection handler.
- Files: `src/electron/servers.ts:91-99` (connection handler, max only), `:202-231` (`initialize` forwards `msg` via `toApp`), `:26-32` (ports).
- Current mitigation: connection count cap only; intended for trusted LANs.
- Recommendations: add an optional shared-secret/token handshake, and warn clearly when servers are enabled without one.

**OAuth tokens and provider secrets stored in plaintext:**
- Risk: `ACCESS` store holds `contentProviders` tokens and `secrets` (e.g. Canva `clientSecret`) as unencrypted JSON on disk; `electron-store` is constructed without `encryptionKey`.
- Files: `src/electron/data/store.ts:37,52` (no `encryptionKey`), `src/electron/contentProviders/canva/CanvaConnect.ts:26-31`, `src/electron/contentProviders/amazingLife/AmazingLifeConnect.ts:55-91`, `src/electron/contentProviders/base/OAuth2Helper.ts:127-128,195-196`.
- Current mitigation: file lives under the user data dir (OS-level file permissions).
- Recommendations: use `safeStorage`/`encryptionKey` for the `ACCESS` file, and never persist `clientSecret` unless the user supplies it.

**Hardcoded credentials/config in source:**
- Risk: Firebase web config + database URL, a base64-encoded Google Analytics API secret, and the Sentry DSN are committed in source.
- Files: `src/frontend/utils/remoteController.ts:8`, `src/frontend/components/drawer/pages/firebaseUtils.ts:5`, `src/frontend/utils/analytics.ts:5-6` (`atob("...")` API secret), `src/frontend/main.ts:12-13`.
- Current mitigation: Firebase web keys are public by design; GA/Sentry secrets are client-side but still abusable.
- Recommendations: move the GA API secret server-side or drop it; document that Firebase Realtime DB rules must restrict `control/{id}` (the remote clicker writes commands to an unauthenticated path).

**Dynamic code execution via `new Function`:**
- Risk: user- or action-supplied expression strings are evaluated as JS. Timer values and API "expression" actions can contain arbitrary code; imported shows or a compromised renderer could supply it.
- Files: `src/frontend/components/drawer/timers/timers.ts:132`, `src/frontend/components/actions/apiHelper.ts:448`, `src/frontend/components/inputs/MaterialNumberInput.svelte:50`.
- Current mitigation: wrapped in `try/catch` for invalid expressions only.
- Recommendations: replace with a small arithmetic-expression parser; at minimum strip identifiers and restrict to numeric operators.

**`{@html}` / `innerHTML` sinks (74 + 5):**
- Risk: HTML injection into the UI. Most content is user/self-authored, but imported shows and converters feed these paths.
- Files: `src/frontend/components/drawer/bible/Scripture.svelte:1071,1089,1194,1200`, `src/frontend/components/slide/TextboxLines.svelte:391,420,447,476`, `src/frontend/components/edit/editbox/EditboxLines.svelte:752,775`, `src/frontend/components/show/ShowNotes.svelte:74`, `src/frontend/components/slide/views/IconItem.svelte:12` (`item.customSvg`).
- Current mitigation: values are largely app-generated.
- Recommendations: sanitize any HTML that originates from imported files (`src/frontend/converters/*`) before it reaches an `{@html}` node.

**Development-time web security disabled:**
- Risk: `webSecurity: isProd` and `nodeIntegration: !isProd` are intentional dev affordances, but they mean local builds run broadly permissive.
- Files: `src/electron/utils/windowOptions.ts:32-33,63-64,93-94,108-109`.
- Recommendations: keep, but ensure release builds always set `NODE_ENV=production` (verified via `scripts/preBuild.js`) so these branches never ship.

## Performance Bottlenecks

**Per-frame canvas effect rendering:**
- Problem: `EffectRender` runs a `requestAnimationFrame` loop rendering up to 26 effect types at fixed 1920x1080 with gradient/particle buffers; 39 `requestAnimationFrame` call sites across the app.
- Files: `src/frontend/components/output/effects/effectRenderer.ts` (constructor `:29`, loop and `glowCache`), plus effect consumers in `src/frontend/components/output/effects/`.
- Cause: CPU-bound canvas compositing per output; the same effect can run in preview and multiple outputs.
- Improvement path: share a single canvas/offscreen buffer per effect instance, downscale preview render, and gate on `CHECK_RAM_USAGE` (already exists in `responsesMain.ts:61`).

**Main window never throttles:**
- Problem: `backgroundThrottling: false` on main/output/capture windows means timers and animations keep running when unfocused.
- Files: `src/electron/utils/windowOptions.ts:37,68,113`.
- Cause: needed for timers/API playback, but applies unconditionally.
- Improvement path: toggle throttling based on whether outputs/timers are active.

**Whole-file JSON stores:**
- Problem: `SHOWS`, `HISTORY`, `MEDIA`, `CACHE` are loaded/saved wholesale (minified JSON via `electron-store`); every save rewrites the whole file after a full content comparison.
- Files: `src/electron/data/store.ts:68-72`, `src/electron/data/save.ts`, `src/electron/utils/files.ts:153` (`writeFileAsync` reads the file to compare before writing).
- Cause: content-match check reads the entire previous file on each write.
- Improvement path: debounce writes, or move large collections (shows/history/media) to SQLite (`better-sqlite3` is already a dependency — see `src/electron/data/bibleDetecter.ts`).

**4K capture readback on the main process:**
- Problem: `OUTPUT_FRAME` capture reads back frames via `CaptureHelper.captureBase64Frame` on the main thread; `UV_THREADPOOL_SIZE` is raised to 32 as a workaround.
- Files: `src/electron/servers.ts:214-222`, `src/electron/index.ts:33-34`, `src/electron/capture/CaptureHelper.ts`.
- Improvement path: use shared textures / offscreen transfer where available (partially present in `OutputLifecycle.ts:164`).

## Fragile Areas

**Multi-output rendering pipeline:**
- Files: `src/frontend/components/helpers/output.ts` (2126), `src/electron/output/helpers/OutputLifecycle.ts` (953), `src/frontend/components/output/**`, `src/electron/servers.ts`.
- Why fragile: window lifecycle (`createServerInstance` recreates servers on restart because a closed `http.Server` cannot be re-listened), stage stream subscriptions with TTL, module-level mutable singletons (`servers`, `stageStreamSubscribers:88,186`, `responded:169`, `ioServers`).
- Safe modification: treat `src/electron/servers.ts` module globals as state machines; always recreate via `createServerInstance` rather than `listen` on a closed server; keep the `responded`/`stageStreamSubscribers` resets in sync with lifecycle.
- Test coverage: gaps — only `RtmpStreamer.integration.test.ts` touches output/streaming.

**Non-null assertions in server lifecycle:**
- Files: `src/electron/servers.ts` (16 uses of `servers[id]!`).
- Why fragile: `startServers`/`updateServerData`/`getServerData` assume the entry exists; if a server was removed (e.g. `stopApiListener` path or failed `createServerInstance`), these throw `Cannot read properties of undefined`.
- Safe modification: replace `!` with explicit guards/early returns.
- Test coverage: none.

**Cloud sync merge logic:**
- Files: `src/electron/cloud/syncManager.ts` (1475 lines of tests in `syncManager.test.ts`), `src/electron/cloud/syncLedger.ts`, `src/electron/cloud/ChurchAppsSyncManager.ts`, `src/electron/cloud/drive.ts`.
- Why fragile: per-item merge across devices with a change ledger, `fileModified` vs mtime heuristics, and destructive operations (`deleteLocalFiles` deletes the entire shows folder, `syncManager.ts:40-50`); `EXTRACT_LOCATION` under `app.getPath("temp")` can be cleared by the OS mid-sync.
- Safe modification: always run the ledger tests; never widen the destructive delete path without a backup (`startBackup` is wired in).
- Test coverage: relatively good (`syncLedger.test.ts`, `syncManager.test.ts`) but integration across providers is untested.

**Show/settings persistence without atomic writes:**
- Files: `src/electron/utils/files.ts:153-180` (`writeFileAsync` uses `fs.writeFile`; no temp-file + rename).
- Why fragile: a crash or power loss during write leaves a truncated/partial JSON file; `checkStores` (`src/electron/data/store.ts:59`) mitigates only for `electron-store` files, not for shows/backups.
- Safe modification: adopt write-to-`.tmp` + `rename` (pattern already used at `files.ts:210` for rename).
- Test coverage: `backup.test.ts`/`zip.test.ts` cover backup packaging, not write durability.

**Importer/parser error swallowing:**
- Files: `src/frontend/converters/propresenter.ts:498,512,526`, `src/frontend/converters/songbeamer.ts:153,156`, `src/frontend/converters/powerpoint/powerpointImporter.ts:32`, `src/frontend/converters/txt.ts:403`, `src/frontend/converters/calendar.ts:109`.
- Why fragile: parse errors are dropped, so imports silently lose content (and `calendar.ts:109` has an unconverted-timezone TODO).
- Safe modification: collect and surface per-item import warnings in the import UI.
- Test coverage: none for importers.

**UI text rendering/editing duplication:**
- Files: `src/frontend/components/slide/TextboxLines.svelte` (duplicated `{@html}` blocks at `:391/447` and `:420/476`), `src/frontend/components/edit/editbox/EditboxLines.svelte` (925), `src/frontend/components/edit/editbox/EditboxPlain.svelte:78` ("duplicate of SetTime"), `src/frontend/components/show/Slides.svelte:97`.
- Why fragile: near-duplicate branches must be changed together; TODOs flag history gaps.
- Safe modification: factor shared render helpers before changing either copy.

## Scaling Limits

**Connection caps per server:** `max` defaults to 10 and is enforced in `src/electron/servers.ts:92-96`. Larger deployments with many stage/remote clients get `ERROR: overLimit`.
- Scaling path: raise `max`, or add per-role limits and a queue.

**Single-file store scaling:** shows/history/media are loaded whole into memory (`src/electron/data/store.ts:68-72`); large libraries slow startup and every save.
- Scaling path: migrate to SQLite or per-show files with an index.

**API request timeout:** `receivedData` waits up to 10s for a return value (`waitUntilValueIsDefined(..., 50, 10000)` in `src/electron/utils/api.ts:267`); long get-actions time out.
- Scaling path: make the timeout configurable and stream large results.

**OSC sender-per-message:** `emitOSC` constructs a new `OSC` socket for every outgoing message (`src/electron/utils/api.ts:202-243`).
- Scaling path: pool/reuse a long-lived sender, as the commented-out code intended.

**Main-process thread pool:** `UV_THREADPOOL_SIZE` bumped to 32 (`src/electron/index.ts:33-34`) to avoid serializing concurrent 4K readbacks.
- Scaling path: offload to worker threads rather than enlarging the shared pool.

## Dependencies at Risk

**`exif@^0.6.0`:**
- Risk: deprecated upstream, no security maintenance.
- Impact: media EXIF parsing in `src/electron/data/thumbnails.ts`.
- Migration plan: `exifr` or `exifreader`.

**`mp4box@^0.6.5`:**
- Risk: stale; MP4 parsing is security-sensitive.
- Impact: video handling (`src/electron/**` media paths).
- Migration plan: evaluate `mp4box.js` forks or `@webav/av-cliper`.

**GitHub-commit dependencies (`grandiose`, `macadam`, `slideshow`, `osr-capture`, `openmediatransport`, `libltc-wrapper`):**
- Risk: unpinned supply chain, breakage on fork changes, no advisory coverage.
- Impact: audio routing, capture, LTC timecode, slideshow, NDI/OMT (`src/electron/audio/`, `src/electron/capture/`, `src/electron/timecode/`).
- Migration plan: tag/vendor into the org, pin by integrity hash.

**Native modules requiring rebuild (`better-sqlite3`, `@discordjs/opus`, `osr-capture`):**
- Risk: `postinstall` runs `electron-builder install-app-deps`; version drift between Electron 37 and prebuilds breaks local dev (`npm run rebuild-opus`, `rebuild-osr`).
- Impact: install/build failures across platforms (`.github/workflows/build.yml` matrix).
- Migration plan: keep rebuild scripts authoritative; add a smoke test that loads each native module.

**`svelte@3.59.2` / `svelte-check@2`:**
- Risk: Svelte 3 is legacy; ecosystem tooling for it is frozen.
- Impact: whole frontend.
- Migration plan: staged Svelte 4 → 5 migration with `svelte-check` as the gate.

## Missing Critical Features

**No atomic/crash-safe writes for user data:**
- Problem: shows, backups, and settings are written with plain `fs.writeFile`/`fs.writeFileSync` (`src/electron/utils/files.ts:153-180`).
- Blocks: guaranteeing data integrity on power loss or crash during save.

**No default authentication for network features:**
- Problem: API and remote servers start unauthenticated unless a password is configured (`src/electron/utils/api.ts:17-18,38`; `src/electron/servers.ts:91-99`).
- Blocks: safely using remote/stage control on shared or untrusted networks.

**No test gate on pull requests:**
- Problem: `.github/workflows/ci.yml` and `playwright.yml` are `workflow_dispatch` only; format and `svelte-check` are `continue-on-error: true` (documented "pre-existing backlog"). Only `release.yml` runs on push (`main`).
- Blocks: catching regressions before merge/release.

**No coverage thresholds:**
- Problem: `config/testing/vitest.config.ts` defines no `coverage` config or thresholds.
- Blocks: measuring and enforcing test growth.

**Structured logging / log rotation:**
- Problem: 856 `console.*` calls across the app; only an in-app `ERROR_LOG` store (`src/electron/data/store.ts:50`) with no rotation.
- Blocks: diagnosing production issues from user reports beyond Sentry.

## Test Coverage Gaps

**Frontend is almost entirely untested:**
- What's not tested: the 446 Svelte components under `src/frontend/components/**` (output pipeline, edit, drawer, stage, timeline, converters UI).
- Files: `src/frontend/components/**`, `src/frontend/values/**`, `src/frontend/show/**`.
- Risk: regressions in the core rendering/editing UX ship undetected; only 12 test files exist for ~1013 source files.
- Priority: High.

**Importers/converters untested:**
- What's not tested: `propresenter`, `powerpoint`, `songbeamer`, `easyworship`, `openlp`, `txt`, `calendar` converters that silently swallow errors.
- Files: `src/frontend/converters/**`.
- Risk: silent content loss on import (see Known Bugs and Fragile Areas).
- Priority: High.

**Server lifecycle & IPC bridge untested:**
- What's not tested: `src/electron/servers.ts` recreation, `responded`/`stageStreamSubscribers` state, `src/electron/IPC/main.ts` routing.
- Risk: undefined-access crashes (16 `servers[id]!`), stale connection counts, dropped frames.
- Priority: Medium.

**Security-critical paths untested:**
- What's not tested: `openURL` validation (absent), API auth (`checkAuth`), protected-media range/decrypt (`src/electron/data/protected.ts`).
- Risk: hardening regressions go unnoticed.
- Priority: High.

**Existing unit tests (12 files):**
- `src/frontend/utils/search.test.ts`, `src/frontend/ai/scripture/references.test.ts`, `src/frontend/ai/scripture/numbers.test.ts`, `src/electron/contentProviders/onStage/songBuilder.test.ts`, `src/electron/utils/requests.test.ts`, `src/electron/streaming/encoderProfiles.test.ts`, `src/electron/ai/stt/sttHelper.test.ts`, `src/electron/cloud/syncLedger.test.ts`, `src/electron/cloud/syncManager.test.ts`, `src/electron/data/zip.test.ts`, `src/electron/data/backup.test.ts`, plus the Playwright e2e `config/testing/start.test.ts`.
- Run: `npm run test:unit` (Vitest, `config/testing/vitest.config.ts`), `npm run test:playwright`, `npm run test:format`, `npm run test:svelte`.

---

*Concerns audit: 2026-10-17*
