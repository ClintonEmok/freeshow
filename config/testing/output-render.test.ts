/**
 * Phase 1 (Toolchain Gate) — output-window pixel-diff gate.
 *
 * What this proves: a projector output window renders the seeded lyric text, and its frame is
 * pixel-identical (maxDiffPixels: 0) to a baseline captured from the pre-upgrade build.
 *
 * ── Baselines are per-OS, and only per-OS ────────────────────────────────────────────────────
 * Playwright resolves the `output-1920x1080.png` argument through its default snapshot template,
 * which appends the platform name, so the file on disk is `output-1920x1080-<platform>.png`
 * (`-darwin`, `-linux`, `-win32`). Committed here: `-darwin` only.
 *
 * Font rasterisation and hinting differ between operating systems, so comparing a macOS baseline
 * to a Linux capture produces a large diff that means nothing. Cross-OS comparison is therefore
 * not achievable and is not attempted: each OS re-captures its own baseline as part of the
 * release smoke checklist (`RELEASE-SMOKE.md`, step 7). Where a platform has no committed
 * `-<platform>.png` the pixel comparison SKIPS with a recorded reason instead of failing or
 * writing its own claim — never relax the threshold to make an unbaselined platform "pass".
 *
 * ── Capturing a baseline ─────────────────────────────────────────────────────────────────────
 * The only sanctioned capture path is the `update_snapshots` input on the "Playwright Tests"
 * workflow (added in plan 01-05), which runs:
 *
 *     npm run build && npx playwright test --config config/testing/playwright.config.ts output-render --update-snapshots=all
 *
 * The flag must be spelled `--update-snapshots=all`. A bare `--update-snapshots` sets the mode to
 * "changed", not "all" (@playwright/test 1.56.1), and the guard below would then SKIP on exactly
 * the run that is supposed to create the file — the capture would be inert. `cleanBuilds.js` must
 * run afterwards: `scripts/postBuild.js` rewrites `public/index.html` in place for production, and
 * only `scripts/cleanBuilds.js` restores the dev tags.
 *
 * ── Capturing a frame ────────────────────────────────────────────────────────────────────────
 * `NODE_ENV: "production"` makes the app `loadFile("public/index.html")` → `./build/bundle.js`, so
 * `npm run build` must have run and left `public/index.html` in its production form. The output
 * page is located by finding the window whose DOM matches the `output_window` hook — never by
 * window index (such as `windows()[2]`): window order is not a contract, and the main window never
 * has that hook (`App.svelte` renders `<MainOutput />` only while `currentWindow === "output"`).
 *
 * Note on the hook: `src/frontend/MainOutput.svelte` writes it as a CLASS —
 * `class="fill context #output_window"` — because the leading `#` is FreeShow's own context-menu
 * target convention (`class="context #output_screen"`, `class="context #drawer_top"`, …). It is
 * therefore NOT an id, and `document.querySelector("#output_window")` matches nothing. The
 * selector below accepts an id *or* the class token so it stays correct either way.
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { inflateSync } from "node:zlib"
import { expect, test } from "@playwright/test"
import { _electron as electron, type ElectronApplication, type Page } from "playwright"
import tmp from "tmp"

const width = 1920
const height = 1080
const snapshotName = "output-1920x1080"
const snapshotDirectory = "output-render.test.ts-snapshots"
const baseline = join(__dirname, snapshotDirectory, `${snapshotName}-${process.platform}.png`)
const seededLyric = "test line 1"

const timeoutMs = 2_000
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// `#output_window` is a class token in MainOutput.svelte (`class="fill context #output_window"`),
// not an element id — see the header note. Accept either form so the hook stays correct if the
// app ever moves it to a real id.
const outputWindowSelector = "#output_window, [class~='#output_window']"

interface AppContext {
    electronApp: ElectronApplication
    mainWindow: Page
    tmpSettingFolder: tmp.DirResult
    tmpDataFolder: tmp.DirResult
}

// ----- LAUNCH / SHUTDOWN (the idioms from config/testing/start.test.ts) -----

async function launchApp(): Promise<AppContext> {
    const tmpSettingFolder = tmp.dirSync({ unsafeCleanup: true })
    const electronApp = await electron.launch({
        // --no-sandbox is required for Electron to launch reliably on Linux CI.
        // Electron inherits the host's Retina backing scale otherwise (2 device pixels per CSS pixel).
        // Playwright's `scale: "css"` cannot infer Electron's native window scale from its browser context.
        args: [".", "--no-sandbox", "--force-device-scale-factor=1"],
        env: { ...process.env, NODE_ENV: "production", FS_MOCK_STORE_PATH: tmpSettingFolder.name }
    })

    // Mocking Electron open dialog
    const tmpDataFolder = tmp.dirSync({ unsafeCleanup: true })
    await electronApp.evaluate(async ({ dialog }, tmpDataFolderName) => {
        dialog.showOpenDialog = async (): Promise<any> => {
            return { canceled: false, filePaths: [tmpDataFolderName] }
        }
    }, tmpDataFolder.name)

    await electronApp.waitForEvent("window")

    // Seems like we need some delay for FreeShow to start up correctly, before doing anything
    await delay(5_000)

    // The app opens a small loading/splash window first, then the main window.
    // firstWindow() can return the splash, so explicitly pick the main window (it loads index.html).
    let mainWindow = electronApp.windows().find((w) => w.url().includes("index.html"))
    for (let i = 0; i < 20 && !mainWindow; i++) {
        await delay(500)
        mainWindow = electronApp.windows().find((w) => w.url().includes("index.html"))
    }
    if (!mainWindow) mainWindow = await electronApp.firstWindow()

    return { electronApp, mainWindow, tmpSettingFolder, tmpDataFolder }
}

async function closeApp(app: AppContext) {
    const electronProcess = app.electronApp.process()
    await Promise.race([app.electronApp.close(), delay(5_000)]).catch(() => {})
    try {
        if (electronProcess?.pid && !electronProcess.killed) electronProcess.kill("SIGKILL")
    } catch {
        // already exited
    }
    await delay(1_000)
    app.tmpDataFolder.removeCallback()
    app.tmpSettingFolder.removeCallback()
}

// ----- SEED THE SHOW AND TAKE IT LIVE (the operator path) -----

async function seedShowAndGoLive(app: AppContext) {
    const window = app.mainWindow

    // Wait for the app UI to be interactive: either the first-run setup popup or the main top bar.
    await window.locator(".popup button.start, .top").first().waitFor({ timeout: 10 * timeoutMs })

    // First-run setup popup (Initialize.svelte) — only shown when the app isn't initialized yet.
    // It can be absent if a previous run already initialized the user data, so guard it.
    const setupStart = window.locator(".popup button.start")
    let didSetup = false
    if ((await setupStart.count()) > 0) {
        const setupPopup = window.locator(".popup")

        await setupPopup.locator(".dropdown-trigger").first().click({ timeout: 5 * timeoutMs })
        await setupPopup.locator("li[role=option]").filter({ hasText: "English" }).first().click({ timeout: timeoutMs })
        await setupPopup.locator(".button-trigger").first().click({ timeout: timeoutMs })
        await setupStart.click({ timeout: timeoutMs })
        didSetup = true
    }

    // skip the onboarding guide (it opens right after a fresh setup; its overlay otherwise intercepts clicks)
    const skipGuide = window.locator("#guideButtons").getByText("Skip")
    if (didSetup) await skipGuide.waitFor({ timeout: 5 * timeoutMs })
    if ((await skipGuide.count()) > 0) await skipGuide.click({ timeout: timeoutMs })

    // Create a new project, then a new show with the seeded lyrics the pixel gate renders.
    await window.getByText("New project").first().click({ timeout: timeoutMs })
    await window.getByText("New show").first().click({ timeout: timeoutMs })
    await expect(window.locator("#name")).toBeVisible({ timeout: timeoutMs })
    await window.locator("#name").fill("Output Render Test Show", { timeout: timeoutMs })
    await window.getByText("Quick Lyrics").click({ timeout: timeoutMs })
    const lyricsBox = window.getByPlaceholder("[Verse]")
    await lyricsBox.focus()
    await lyricsBox.fill(`[Verse]\ntest line 1\ntest line 2\n\n[Chorus]\ntest line 3\ntest line 4`, { timeout: timeoutMs })
    await window.getByTestId("create.show.popup.new.show").click({ timeout: timeoutMs })

    // Send the first slide live. Clicking a slide in the show editor is the operator path
    // (Slides.svelte -> setOutput("slide", ...)).
    // The FIRST click also materialises the default "Primary" output entry, because
    // getActiveOutputs() calls addOutput(true) when the store holds no outputs — but that call
    // returns before the new entry can be picked up, so the click writes nothing live. The SECOND
    // click finds the output and writes `out.slide` onto it.
    const slides = window.locator(".grid > .main")
    await slides.first().waitFor({ timeout: 10 * timeoutMs })
    await slides.first().click({ timeout: timeoutMs })
    await delay(1_000)
    await slides.first().click({ timeout: timeoutMs })
    await delay(1_000)
}

// ----- CREATE THE PROJECTOR OUTPUT AND FIND ITS PAGE -----

async function listWindows(electronApp: ElectronApplication) {
    return electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().map((win) => ({ id: win.id, visible: win.isVisible(), bounds: win.getBounds() }))
    })
}

/** Locates the output page by its DOM hook. Index-based selection is deliberately not used. */
async function findOutputPage(electronApp: ElectronApplication, attempts = 40): Promise<Page | null> {
    for (let i = 0; i < attempts; i++) {
        for (const window of electronApp.windows()) {
            const isOutput = await window
                .evaluate((selector) => !!document.querySelector(selector), outputWindowSelector)
                .catch(() => false)
            if (isOutput) return window
        }
        await delay(500)
    }
    return null
}

async function openProjectorOutput(app: AppContext) {
    // The top bar's display toggle (#output_window_button) is the operator's own path to a
    // projector window: toggleOutputs() -> send(OUTPUT, ["TOGGLE_OUTPUTS"]) -> OutputLifecycle.
    const toggle = app.mainWindow.locator("#output_window_button")
    await expect(toggle).toBeEnabled({ timeout: 5 * timeoutMs })

    const before = await listWindows(app.electronApp)
    await toggle.click({ timeout: timeoutMs })

    const outputPage = await findOutputPage(app.electronApp)
    expect(outputPage, "no window rendered the output_window hook after the display toggle").not.toBeNull()

    // Identify the new BrowserWindow by set difference (never by index).
    const after = await listWindows(app.electronApp)
    const created = after.filter((win) => !before.some((previous) => previous.id === win.id))

    return { outputPage: outputPage as Page, outputWindowId: created[0]?.id ?? null }
}

// ----- SIZE THE OUTPUT TO EXACTLY 1920x1080 -----

async function ensureOutputSize(app: AppContext, outputPage: Page, outputWindowId: number | null): Promise<string> {
    const readViewport = () => outputPage.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))

    // The default output bounds are already 1920x1080, and enableLargerThanScreen is set on macOS,
    // so the common case needs no resize at all — record whichever route was actually required.
    let size = await readViewport()
    if (size.width === width && size.height === height) return "window content (bounds already 1920x1080)"

    // Route 1 — Playwright's CDP metrics override. Not guaranteed to apply to an Electron page.
    try {
        await outputPage.setViewportSize({ width, height })
        size = await readViewport()
        if (size.width === width && size.height === height) return "page.setViewportSize"
    } catch (err) {
        // Electron pages do not always accept a viewport override — fall through to the window route.
    }

    // Route 2 — resize the output BrowserWindow itself. Needs a virtual screen at least
    // 1920x1080 on Linux CI: playwright.yml's xvfb-run is widened for this in plan 01-05,
    // because enableLargerThanScreen is macOS-only and a smaller screen clamps the window.
    if (outputWindowId !== null) {
        await app.electronApp.evaluate(({ BrowserWindow }, data) => {
            const target = BrowserWindow.getAllWindows().find((win) => win.id === data.id)
            target?.setContentSize(data.width, data.height)
        }, { id: outputWindowId, width, height })
        await delay(1_000)
        size = await readViewport()
        if (size.width === width && size.height === height) return "BrowserWindow.setContentSize"
    }

    return `unsupported (ended at ${size.width}x${size.height})`
}

// ----- PNG GUARD (no new dependency: node:zlib over the IDAT chunks) -----

const pngChannelsByColorType: { [colorType: number]: number } = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

interface ParsedPng {
    width: number
    height: number
    bitDepth: number
    colorType: number
    interlace: number
    samples: Buffer
}

function parsePng(buffer: Buffer): ParsedPng {
    if (buffer.length < 8 || buffer.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG")
    let offset = 8
    let width = 0
    let height = 0
    let bitDepth = 0
    let colorType = 0
    let interlace = 0
    const compressed: Buffer[] = []
    while (offset + 8 <= buffer.length) {
        const length = buffer.readUInt32BE(offset)
        const type = buffer.toString("ascii", offset + 4, offset + 8)
        const data = buffer.subarray(offset + 8, offset + 8 + length)
        if (type === "IHDR") {
            width = data.readUInt32BE(0)
            height = data.readUInt32BE(4)
            bitDepth = data[8]
            colorType = data[9]
            interlace = data[12]
        } else if (type === "IDAT") compressed.push(data)
        else if (type === "IEND") break
        offset += 12 + length
    }
    return { width, height, bitDepth, colorType, interlace, samples: unfilter(inflateSync(Buffer.concat(compressed)), width, height, pngChannelsByColorType[colorType]) }
}

/** Reverses the PNG scanline filters so the raw samples can be inspected. */
function unfilter(raw: Buffer, width: number, height: number, channels: number) {
    const stride = width * channels
    const samples = Buffer.alloc(stride * height)
    let position = 0
    let previous = Buffer.alloc(stride)
    for (let y = 0; y < height; y++) {
        const filter = raw[position]
        position += 1
        const line = raw.subarray(position, position + stride)
        position += stride
        const row = samples.subarray(y * stride, (y + 1) * stride)
        for (let x = 0; x < stride; x++) {
            const left = x >= channels ? row[x - channels] : 0
            const up = previous[x]
            const upLeft = x >= channels ? previous[x - channels] : 0
            let value = line[x]
            if (filter === 1) value += left
            else if (filter === 2) value += up
            else if (filter === 3) value += (left + up) >> 1
            else if (filter === 4) {
                const estimate = left + up - upLeft
                const distanceLeft = Math.abs(estimate - left)
                const distanceUp = Math.abs(estimate - up)
                const distanceUpLeft = Math.abs(estimate - upLeft)
                value += distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft ? left : distanceUp <= distanceUpLeft ? up : upLeft
            }
            row[x] = value & 0xff
        }
        previous = row
    }
    return samples
}

/** The baseline must be exactly 1920x1080 and must not be a single uniform colour. */
function assertFrameIsRealBaseline(buffer: Buffer) {
    const png = parsePng(buffer)
    expect({ width: png.width, height: png.height }, "baseline PNG dimensions").toEqual({ width, height })

    if (png.interlace !== 0 || png.bitDepth !== 8) return // dimensions already asserted; sampling needs 8-bit non-interlaced
    const perPixel = pngChannelsByColorType[png.colorType]
    let uniform = true
    for (let pixel = 1; pixel < png.width * png.height && uniform; pixel++) {
        const offset = pixel * perPixel
        for (let channel = 0; channel < perPixel; channel++) {
            if (png.samples[offset + channel] !== png.samples[channel]) {
                uniform = false
                break
            }
        }
    }
    expect(uniform, "baseline frame is a single uniform colour — a blank capture must never pass as 'no diff'").toBe(false)
}

// ----- SHARED SETUP: app -> show -> live slide -> projector output at 1920x1080 -----

async function renderOutputWindow(app: AppContext) {
    await seedShowAndGoLive(app)
    const { outputPage, outputWindowId } = await openProjectorOutput(app)

    const viewportRoute = await ensureOutputSize(app, outputPage, outputWindowId)
    expect(viewportRoute, `could not size the output window to ${width}x${height}`).not.toContain("unsupported")

    return { outputPage, outputWindowId, viewportRoute }
}

// ----- TESTS -----

// The flow assertions live in their own test so a platform-scoped pixel skip can never suppress
// them: these run on every platform, they are not pixel claims.
test("output window renders the seeded lyric text at 1920x1080", async () => {
    const app = await launchApp()
    try {
        const { outputPage, viewportRoute } = await renderOutputWindow(app)

        // The output-window hook is what located the page (findOutputPage); assert it is still there.
        await expect(outputPage.locator(outputWindowSelector)).toHaveCount(1)
        await expect(outputPage.getByText(seededLyric).first()).toBeVisible({ timeout: 10 * timeoutMs })

        const size = await outputPage.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
        expect(size, `output viewport (route: ${viewportRoute})`).toEqual({ width, height })

        console.log(`[output-render] viewport route: ${viewportRoute}`)
    } finally {
        await closeApp(app)
    }
})

test("projector output frame is pixel-identical to the committed pre-upgrade baseline", async () => {
    test.skip(
        !existsSync(baseline) && test.info().config.updateSnapshots !== "all",
        `no ${process.platform} pixel baseline at ${baseline} — capture with the "Playwright Tests" workflow_dispatch input update_snapshots=true and commit the -${process.platform}.png artifact (per-OS baselines only)`
    )

    const app = await launchApp()
    try {
        const { outputPage, viewportRoute } = await renderOutputWindow(app)

        // Assert before capturing: locate, content, size — in that order.
        await expect(outputPage.locator(outputWindowSelector)).toHaveCount(1)
        await expect(outputPage.getByText(seededLyric).first()).toBeVisible({ timeout: 10 * timeoutMs })
        const size = await outputPage.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
        expect(size, `output viewport (route: ${viewportRoute})`).toEqual({ width, height })

        // Let the first frame paint before the comparison starts.
        await delay(3_000)

        await expect(outputPage).toHaveScreenshot(`${snapshotName}.png`, {
            animations: "disabled",
            caret: "hide",
            maxDiffPixels: 0,
            // Keep the emitted PNG at CSS-pixel dimensions even if Playwright's capture context changes.
            scale: "css",
            timeout: 30_000
        })

        // Guard the false pass: a blank or single-colour frame must never be able to pass as "no diff".
        assertFrameIsRealBaseline(readFileSync(baseline))
        console.log(`[output-render] baseline ${baseline} verified non-uniform at ${width}x${height} (viewport route: ${viewportRoute})`)
    } finally {
        await closeApp(app)
    }
})
