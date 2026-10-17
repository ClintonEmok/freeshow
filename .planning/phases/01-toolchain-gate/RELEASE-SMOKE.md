# Phase 1 — Release Smoke Checklist (TOOL-04)

**Requirement:** TOOL-04 — "packaged builds on Windows, macOS and Linux still launch, render the output window and load every native module."
**ROADMAP Phase 1 Success Criteria:** 4 (no check dropped / no new errors versus the pre-upgrade baseline) and 5 (this checklist).
**Owner at execution time:** plan 01-05 (cross-OS packaged validation). This file is written in plan 01-01 so the checklist exists **before** the first dependency change.

The checklist must be executed on a **packaged artifact** on each of the three platforms — Windows, macOS (x64 + arm64) and Linux (x64/arm64). A dev run (`npm start`) does not satisfy it: TOOL-04 is about the shipped runtime, its native addons and its production asset paths.

---

## Preconditions

1. **`npm run build && npm run pack` succeeded on that platform** (`pack` = `electron-builder --dir`; use the platform's own `pack`/`pack:arm64` script). Record the `build.yml` run URL and date.
2. **`public/index.html` was restored before any dev work resumed.** After any build the dev tree is broken until `node scripts/cleanBuilds.js` runs (`scripts/postBuild.js` rewrites `public/index.html` in place; `vite.config.mjs` serves dev from `root: "public"`). Assert `git status --porcelain public/index.html` is empty.
3. **The pixel step needs a 1920×1080-capable display on that host.** macOS is fine on any Retina panel. On Linux, `xvfb-run --server-args="-screen 0 1280x960x24"` is **too small** — Electron's `enableLargerThanScreen` is macOS-only, so a 1920×1080 window is clamped to 1280×960 and the baseline is not 1920×1080. Use `--server-args="-screen 0 1920x1080x24"` (this is widened in plan 01-05).
4. **Every step below runs from a throwaway store.** Launch with `FS_MOCK_STORE_PATH=<fresh tmp dir>` so a leftover profile cannot make a step pass (test isolation depends on this).

> ### ⚠️ A green badge proves nothing
>
> `.github/workflows/build.yml`, `.github/workflows/ci.yml` and `.github/workflows/playwright.yml` are all **`workflow_dispatch`-only**. They have no `push`/`pull_request` trigger (the commented-out blocks in `playwright.yml` and the `on: workflow_dispatch:` in `ci.yml` are deliberate), so a green repository/status says nothing about whether any of them has ever run. **Every dispatch must have its own run URL and date recorded as evidence** (see "Evidence to record" at the end); an unchecked box backed by no URL is not evidence. `.github/workflows/release.yml` is excluded from this checklist entirely — it fires on every push to `main` and publishes a release.

---

## The checklist

Run steps 1–7 in order on each platform. Steps 1–5 are the operator flow; step 6 proves the native modules are *callable*; step 7 is the per-OS pixel gate.

### 1. Launch the packaged app

- [ ] Launch the packaged binary (not `npm start`, not `electron .`).
- [ ] The splash/loading window closes and the main window renders the editor UI.
- [ ] No unhandled renderer exception in the window console (`App.svelte` binds `on:error` / `on:unhandledrejection` to `logerror`; a thrown error surfaces as a toast/alert, and a *blank* window is a failure).
- [ ] Confirm the page URL came from the production path — it must include `index.html`, i.e. `loadFile("public/index.html")` → `./build/bundle.js`, not `http://localhost:3000`. A `NODE_ENV=development` launch would load Vite's dev server and is **not** a valid packaged launch.

**Evidence:** screenshot of the main window + the resolved `page.url()`.

### 2. Open Settings

- [ ] Open the Settings drawer from the main UI.
- [ ] Every settings tab in the sidebar renders (the drawer must not be empty or partially mounted).
- [ ] Switch between at least three tabs (e.g. General, Outputs, Styles) and confirm no tab throws and no tab renders a blank panel.

**Evidence:** screenshot of Settings open with the tab list visible.

### 3. Create an output and confirm a projector window renders

- [ ] In Settings → Outputs, **create a new output** and enable it.
- [ ] A **second window opens** and renders the output page (not the editor). Confirm by content: the output window shows the projector surface, and its DOM contains the `#output_window` element. The main window never has `#output_window` (`App.svelte` only renders `<MainOutput />` when `currentWindow === "output"`), so this is the unambiguous check.
- [ ] If a second physical display is available, send the output to it (`outputs[].screen`) and confirm it appears there. On a single-display host the window still opens — capture that.
- [ ] The output window shows the configured background/style, and **not** a black or blank surface.

**Evidence:** screenshot of both windows side by side; the output window's `window.id`; confirmation that `document.querySelector("#output_window") !== null` in that window.

### 4. Play the song

- [ ] Have a song with lyrics (step 5 of the operator flow creates one if the throwaway store is empty, or import one first).
- [ ] Select the song and send it live (play it) from the main window.
- [ ] The **lyric text appears in the output window**, styled and readable.
- [ ] Advance to the next slide — the output window updates, and the transition completes with no stuck frame.

**Evidence:** screenshot of the output window showing the lyric text; the lyric text string recorded verbatim.

### 5. Import a file

- [ ] Trigger the import flow and import a real file (a `.txt`/`.pro`/`.json` show, or a song file).
- [ ] The imported content appears in the app (new show/song in the list) and can be opened.
- [ ] The file dialog is mocked the way the existing harness does it, so this step is automatable in a Playwright spec:

  ```ts
  // config/testing/start.test.ts:22-26 — the established idiom
  await electronApp.evaluate(async ({ dialog }, tmpDataFolderName) => {
      dialog.showOpenDialog = async (): Promise<any> => {
          return { canceled: false, filePaths: [tmpDataFolderName] }
      }
  }, tmpDataFolder.name)
  ```

  Mocking `showOpenDialog` is the automation contract; a manual run clicks the real dialog instead. Either path satisfies the step, but the automatable path is the one plan 01-05's spec uses, and it is why this step is cheap to re-run.

**Evidence:** the imported entity's name and type; screenshot of it listed in the app.

### 6. Assert the three native modules load **and are callable**

Requiring a module is **not** proof — `require()` succeeds for a lazily-bound addon whose real entry points throw on first use, and `@discordjs/opus` in particular depends on the `renameOpusBuild()` step in `scripts/postBuild.js`. Each check below performs a **real call and asserts a real result value**, evaluated in the packaged app's **main process**:

```js
// Run via electronApp.evaluate() against the packaged app, or as a main-process startup probe.
const checks = {}

// 1. better-sqlite3 — open an in-memory database and execute a query.
{
    const Database = require("better-sqlite3")
    const db = new Database(":memory:")
    checks.sqlite = db.prepare("SELECT 1 AS n").get().n === 1 // must be true
    db.close()
}

// 2. @discordjs/opus — construct an encoder and encode a real PCM frame.
{
    const { OpusEncoder } = require("@discordjs/opus")
    const encoder = new OpusEncoder(48000, 2)
    const pcm = Buffer.alloc(960 * 2 * 2) // 20 ms of 48 kHz stereo s16le
    const encoded = encoder.encode(pcm)
    checks.opus = Buffer.isBuffer(encoded) && encoded.length > 0 // must be true
}

// 3. osr-capture — call a synchronous exported converter and assert its output size.
{
    const osr = require("osr-capture")
    const out = osr.convertBgraToUyvy(Buffer.alloc(2 * 2 * 4), 2, 2) // BGRA in, UYVY out
    checks.osrCapture = Buffer.isBuffer(out) && out.length === 2 * 2 * 2 // must be true
    // Also feature-detect the GPU readback entry point (format-agnostic; does not need a live texture):
    checks.osrReadback = typeof osr.readback === "function"
}
```

- [ ] `better-sqlite3` — `new Database(":memory:")` opens, `SELECT 1 AS n` returns `1`.
- [ ] `@discordjs/opus` — `new OpusEncoder(48000, 2)` constructs and `.encode()` returns a non-empty `Buffer`.
- [ ] `osr-capture` — the native binding loads and `convertBgraToUyvy(bgra, 2, 2)` returns a `Buffer` of exactly `w * h * 2` bytes (`8`), **and** `typeof readback === "function"`.

> **Why `convertBgraToUyvy` rather than `readback` for the "callable" half:** `readback` needs a live Electron shared-texture handle, which is not available outside a running OSR output. The CPU converter is a real N-API export on the same binary, so calling it proves the addon is loaded, its N-API registration ran, and its argument marshalling works — without inventing an offscreen capture just to satisfy a smoke check.

**Evidence:** the three boolean results; the recorded `process.versions.modules` (Node ABI) and `process.arch`; the electron version from the packaged app.

### 7. Re-capture the pixel baseline for this OS, then diff a second run against it

Two-phase, and the order matters:

- [ ] **Capture** the baseline for **this** platform only, on a build where no source or config changed:

  ```bash
  npm run build
  npx playwright test --config config/testing/playwright.config.ts output-render --update-snapshots=all
  node scripts/cleanBuilds.js
  git status --porcelain public/index.html   # must be empty
  ```

  The artifact is written to `config/testing/output-render.test.ts-snapshots/output-1920x1080-<platform>.png` (`<platform>` = `darwin` | `linux` | `win32`). Commit it **only** from a run where nothing else changed.

- [ ] **Diff**: run the same command **without** `--update-snapshots` and confirm the test passes. Then run it a **second** time and confirm it passes again — a gate that passes once because it wrote its own baseline is not a gate.
- [ ] Confirm the committed PNG's IHDR is exactly `1920×1080` and the frame is not a single uniform colour (a blank/transparent capture must never be accepted as "no diff").

**The capture flag is `--update-snapshots=all`, never a bare `--update-snapshots`.** In `@playwright/test@1.56.1` a bare `--update-snapshots` sets the mode to `"changed"`, not `"all"`, and the spec's platform guard (`test.info().config.updateSnapshots !== "all"`) would then **skip** — the capture run would silently write nothing and the baseline would never exist.

> ### Cross-OS comparison is not achievable — per-OS baselines only
>
> Font rasterisation and hinting differ between macOS, Windows and Linux, so the same DOM produces different pixels on each. Comparing a macOS baseline against a Linux capture would produce a large diff that means nothing. **Baselines are per-OS and are re-captured as part of this checklist on each OS**; the committed `-darwin` baseline is the macOS contract and does not constrain the other two. Where a platform has no committed `-<platform>.png`, the spec **skips with a recorded reason** rather than failing or writing its own baseline — that platform's gate only becomes real once its own baseline is committed. The pixel comparison must never lean on `retries` to convert a first-attempt failure into a pass (`playwright.config.ts:16` sets `retries: process.env.CI ? 2 : 0`, and retries carry no correctness weight here).

**Evidence:** both PNGs (committed + re-generated), the `--update-snapshots=all` capture command's output, the two clean comparison runs, and the diff image if any run failed.

---

## Evidence to record (per platform)

| Field | Value |
|---|---|
| Platform / arch | |
| Packaged artifact + version | |
| `build.yml` dispatch run URL + date | |
| `ci.yml` dispatch run URL + date | |
| `playwright.yml` dispatch run URL + date | |
| Steps 1–5 result (PASS/FAIL + screenshots) | |
| Step 6 results (`sqlite` / `opus` / `osrCapture` / `osrReadback`) | |
| Step 6 `process.versions.modules`, `process.arch`, Electron version | |
| Step 7 baseline file committed (`output-1920x1080-<platform>.png`) + two clean comparison runs | |
| Baseline check-count versus `.planning/phases/01-toolchain-gate/baseline/` (Success Criterion 4) | |

**Success Criterion 4 on the same run:** re-read `.planning/phases/01-toolchain-gate/baseline/README.md` and confirm `svelte-check`, the four lint jobs, Vitest and Prettier report **no new** errors/failures, and that no `lint:*` / `test:*` script was dropped from `package.json`. Both `continue-on-error: true` entries in `.github/workflows/ci.yml` must still be **exactly two** — flipping either one is a CI-behaviour change and is out of scope for Phase 1.

## Failure handling

- A failed step is a **release blocker**: do not re-capture the baseline or relax the pixel threshold to make it pass. The threshold starts at `maxDiffPixels: 0` and may only be relaxed to `maxDiffPixelRatio: 0.001` with the generated diff image kept for human review and the reason recorded.
- If step 7 fails only on a platform with a freshly-committed baseline from the same session, suspect the display size (Precondition 3) before suspecting the renderer.
- If step 6 fails, check `scripts/postBuild.js`'s native-module handling (in particular `renameOpusBuild()`) before assuming the addon is broken — the packaged layout differs from `node_modules`.
