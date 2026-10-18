/**
 * Phase 1 (Toolchain Gate) — packaged operator-flow and native-module smoke tests.
 *
 * `FS_SMOKE_EXECUTABLE` switches the launch from the checkout to an unpacked
 * electron-builder artifact. Every launch uses a fresh store and production
 * assets; the main page URL is asserted so a dev-server run cannot pass.
 *
 * Pixel baselines are per-OS only. Font rasterisation differs between systems,
 * so a macOS baseline must never be compared to a Linux or Windows capture. A
 * missing platform baseline skips only the pixel test with a capture reason;
 * non-pixel flow and native-module assertions still run. The only sanctioned
 * capture path is the `update_snapshots` input on the Playwright Tests workflow,
 * which passes `--update-snapshots=all` and uploads the platform baseline.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { inflateSync } from "node:zlib"
import { expect, test } from "@playwright/test"
import { _electron as electron, type ElectronApplication, type Page } from "playwright"
import tmp from "tmp"

const width = 1920
const height = 1080
const seededLyric = "test line 1"
const importedSongName = "Smoke Imported Song"
const snapshotName = "output-1920x1080"
const baseline = join(__dirname, "smoke.test.ts-snapshots", `${snapshotName}-${process.platform}.png`)
const timeoutMs = 2_000
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const outputWindowSelector = "#output_window, [class~='#output_window']"

interface AppContext {
    electronApp: ElectronApplication
    mainWindow: Page
    tmpSettingFolder: tmp.DirResult
    tmpDataFolder: tmp.DirResult
    importedFilePath: string
}

async function launchApp(): Promise<AppContext> {
    const tmpSettingFolder = tmp.dirSync({ unsafeCleanup: true })
    const tmpDataFolder = tmp.dirSync({ unsafeCleanup: true })
    const importedFilePath = join(tmpDataFolder.name, `${importedSongName}.txt`)
    writeFileSync(importedFilePath, "[Verse]\nImported smoke lyric line\n\n[Chorus]\nImported smoke chorus line\n", "utf8")

    const executablePath = process.env.FS_SMOKE_EXECUTABLE
    let electronApp: ElectronApplication
    try {
        electronApp = await electron.launch({
            ...(executablePath ? { executablePath } : {}),
            // Electron otherwise inherits the Retina backing scale (2 device pixels per CSS pixel).
            // Keep the emitted screenshot at the requested CSS-pixel dimensions on macOS.
            args: executablePath ? ["--no-sandbox", "--force-device-scale-factor=1"] : [".", "--no-sandbox", "--force-device-scale-factor=1"],
            env: { ...process.env, NODE_ENV: "production", FS_MOCK_STORE_PATH: tmpSettingFolder.name }
        })
    } catch (err) {
        tmpDataFolder.removeCallback()
        tmpSettingFolder.removeCallback()
        throw err
    }

    await electronApp.evaluate(async ({ dialog }, tmpDataFolderName) => {
        dialog.showOpenDialog = async (): Promise<any> => ({ canceled: false, filePaths: [tmpDataFolderName] })
    }, tmpDataFolder.name)

    await electronApp.waitForEvent("window")
    await delay(5_000)

    let mainWindow = electronApp.windows().find((window) => window.url().includes("index.html"))
    for (let i = 0; i < 20 && !mainWindow; i++) {
        await delay(500)
        mainWindow = electronApp.windows().find((window) => window.url().includes("index.html"))
    }
    if (!mainWindow) mainWindow = await electronApp.firstWindow()

    return { electronApp, mainWindow, tmpSettingFolder, tmpDataFolder, importedFilePath }
}

async function closeApp(app: AppContext) {
    const electronProcess = app.electronApp.process()
    await Promise.race([app.electronApp.close(), delay(5_000)]).catch(() => {})
    try {
        if (electronProcess?.pid && !electronProcess.killed) electronProcess.kill("SIGKILL")
    } catch {
        // The process already exited.
    }
    await delay(1_000)
    app.tmpDataFolder.removeCallback()
    app.tmpSettingFolder.removeCallback()
}

async function prepareFirstRun(app: AppContext) {
    const window = app.mainWindow
    expect(window.url(), "packaged app must load the production index.html").toContain("index.html")
    expect(window.url(), "packaged app must not silently use the dev server").not.toContain("localhost:3000")

    await window
        .locator(".popup button.start, .top")
        .first()
        .waitFor({ timeout: 10 * timeoutMs })
    const setupStart = window.locator(".popup button.start")
    let didSetup = false
    if ((await setupStart.count()) > 0) {
        const setupPopup = window.locator(".popup")
        await setupPopup
            .locator(".dropdown-trigger")
            .first()
            .click({ timeout: 5 * timeoutMs })
        await setupPopup.locator("li[role=option]").filter({ hasText: "English" }).first().click({ timeout: timeoutMs })
        await setupPopup.locator(".button-trigger").first().click({ timeout: timeoutMs })
        await setupStart.click({ timeout: timeoutMs })
        didSetup = true
    }

    const skipGuide = window.locator("#guideButtons").getByText("Skip")
    if (didSetup) await skipGuide.waitFor({ timeout: 5 * timeoutMs })
    if ((await skipGuide.count()) > 0) await skipGuide.click({ timeout: timeoutMs })
}

async function openSettingsAndVerify(app: AppContext) {
    const window = app.mainWindow
    const settingsButton = window.locator('.top button[data-title*="settings" i]').first()
    await expect(settingsButton, "Settings entry point should be visible").toBeVisible({ timeout: 5 * timeoutMs })
    await settingsButton.click({ timeout: timeoutMs })

    await expect(window.locator("main .title h2").first()).toContainText("General", { timeout: 5 * timeoutMs })
    await expect(window.locator("main .scroll .dropdown-trigger").first(), "General settings language control should render").toBeVisible({ timeout: 5 * timeoutMs })
}

async function createSeededShow(app: AppContext) {
    const window = app.mainWindow
    // Settings is opened earlier in this flow. The first button in the middle top-nav group
    // is the Show page button; target its structural slot rather than localized tooltip text.
    await window.locator(".top > span:nth-of-type(2) button").first().click({ timeout: timeoutMs })
    await window.getByText("New project").first().click({ timeout: timeoutMs })
    await window.getByText("New show").first().click({ timeout: timeoutMs })
    await expect(window.locator("#name")).toBeVisible({ timeout: timeoutMs })
    await window.locator("#name").fill("Smoke Test Show", { timeout: timeoutMs })
    await window.getByText("Quick Lyrics").click({ timeout: timeoutMs })

    const lyricsBox = window.getByPlaceholder("[Verse]")
    await lyricsBox.focus()
    await lyricsBox.fill("[Verse]\ntest line 1\ntest line 2\n\n[Chorus]\ntest line 3\ntest line 4", { timeout: timeoutMs })
    await window.getByTestId("create.show.popup.new.show").click({ timeout: timeoutMs })

    const slides = window.locator(".grid > .main")
    await slides.first().waitFor({ timeout: 10 * timeoutMs })
    return slides
}

async function findOutputPage(electronApp: ElectronApplication, attempts = 40): Promise<Page | null> {
    for (let i = 0; i < attempts; i++) {
        for (const window of electronApp.windows()) {
            const isOutput = await window.evaluate((selector) => !!document.querySelector(selector), outputWindowSelector).catch(() => false)
            if (isOutput) return window
        }
        await delay(500)
    }
    return null
}

async function openOutput(app: AppContext) {
    const before = await app.electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((window) => window.id))
    const toggle = app.mainWindow.locator("#output_window_button")
    await expect(toggle, "output toggle should be enabled after the first slide initializes the output").toBeEnabled({ timeout: 5 * timeoutMs })
    await toggle.click({ timeout: timeoutMs })

    const outputPage = await findOutputPage(app.electronApp)
    expect(outputPage, "an output window should render the #output_window hook").not.toBeNull()
    const outputWindowId = await app.electronApp.evaluate(({ BrowserWindow }, previousIds) => {
        return BrowserWindow.getAllWindows().find((window) => !previousIds.includes(window.id))?.id ?? null
    }, before)
    return { outputPage: outputPage as Page, outputWindowId }
}

async function ensureOutputSize(app: AppContext, outputPage: Page, outputWindowId: number | null) {
    const readViewport = () => outputPage.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
    let size = await readViewport()
    if (size.width === width && size.height === height) return "configured output bounds"

    try {
        await outputPage.setViewportSize({ width, height })
        size = await readViewport()
        if (size.width === width && size.height === height) return "page.setViewportSize"
    } catch {
        // Electron pages may ignore viewport overrides; try the BrowserWindow below.
    }

    if (outputWindowId !== null) {
        await app.electronApp.evaluate(
            ({ BrowserWindow }, data) => {
                BrowserWindow.getAllWindows()
                    .find((window) => window.id === data.id)
                    ?.setContentSize(data.width, data.height)
            },
            { id: outputWindowId, width, height }
        )
        await delay(1_000)
        size = await readViewport()
        if (size.width === width && size.height === height) return "BrowserWindow.setContentSize"
    }

    throw new Error(`could not size output to ${width}x${height}; actual viewport is ${size.width}x${size.height}`)
}

async function runOperatorFlow(app: AppContext) {
    await prepareFirstRun(app)
    await openSettingsAndVerify(app)
    const slides = await createSeededShow(app)

    // The first click materializes the default physical output. Open its window,
    // then send the song live with a second click and assert the lyric is rendered.
    await slides.first().click({ timeout: timeoutMs })
    await delay(1_000)
    const { outputPage } = await openOutput(app)
    await slides.first().click({ timeout: timeoutMs })
    await expect(outputPage.locator(outputWindowSelector)).toHaveCount(1)
    await expect(outputPage.getByText(seededLyric).first()).toBeVisible({ timeout: 10 * timeoutMs })

    await app.electronApp.evaluate(async ({ dialog }, importedFilePath) => {
        dialog.showOpenDialog = async (): Promise<any> => ({ canceled: false, filePaths: [importedFilePath] })
    }, app.importedFilePath)
    const importButton = app.mainWindow.locator('button[data-title*="import" i]').first()
    await expect(importButton, "show import entry point should be visible").toBeVisible({ timeout: 5 * timeoutMs })
    await importButton.click({ timeout: timeoutMs })
    const textImportButton = app.mainWindow.locator('button:has(img[alt="txt-logo"])').first()
    await expect(textImportButton, "plain-text importer should be available").toBeVisible({ timeout: 5 * timeoutMs })
    await textImportButton.click({ timeout: timeoutMs })
    await expect(app.mainWindow.getByText(importedSongName, { exact: true }).first(), "the imported song should appear in the app").toBeVisible({ timeout: 30 * timeoutMs })

    return outputPage
}

const pngChannelsByColorType: { [colorType: number]: number } = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

function parsePng(buffer: Buffer) {
    if (buffer.length < 8 || buffer.readUInt32BE(0) !== 0x89504e47) throw new Error("snapshot is not a PNG")
    let offset = 8
    let pngWidth = 0
    let pngHeight = 0
    let bitDepth = 0
    let colorType = 0
    let interlace = 0
    const compressed: Buffer[] = []
    while (offset + 8 <= buffer.length) {
        const length = buffer.readUInt32BE(offset)
        const type = buffer.toString("ascii", offset + 4, offset + 8)
        const data = buffer.subarray(offset + 8, offset + 8 + length)
        if (type === "IHDR") {
            pngWidth = data.readUInt32BE(0)
            pngHeight = data.readUInt32BE(4)
            bitDepth = data[8]
            colorType = data[9]
            interlace = data[12]
        } else if (type === "IDAT") compressed.push(data)
        else if (type === "IEND") break
        offset += 12 + length
    }

    const channels = pngChannelsByColorType[colorType]
    const raw = inflateSync(Buffer.concat(compressed))
    const stride = pngWidth * channels
    const samples = Buffer.alloc(stride * pngHeight)
    let position = 0
    let previous = Buffer.alloc(stride)
    for (let y = 0; y < pngHeight; y++) {
        const filter = raw[position++]
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

    return { width: pngWidth, height: pngHeight, bitDepth, interlace, colorType, channels, samples }
}

function assertRealFrame(buffer: Buffer) {
    const png = parsePng(buffer)
    expect({ width: png.width, height: png.height }, "pixel baseline dimensions").toEqual({ width, height })
    if (png.interlace !== 0 || png.bitDepth !== 8) return

    let uniform = true
    for (let pixel = 1; pixel < png.width * png.height && uniform; pixel++) {
        const offset = pixel * png.channels
        for (let channel = 0; channel < png.channels; channel++) {
            if (png.samples[offset + channel] !== png.samples[channel]) {
                uniform = false
                break
            }
        }
    }
    expect(uniform, "pixel frame is a single uniform colour").toBe(false)
}

test("packaged operator flow launches, opens Settings/output, plays a song, and imports a file", async () => {
    const app = await launchApp()
    try {
        const outputPage = await runOperatorFlow(app)
        console.info(`[smoke] operator flow passed; main URL: ${app.mainWindow.url()}; output URL: ${outputPage.url()}`)
    } finally {
        await closeApp(app)
    }
})

test("packaged native modules are callable under Electron's ABI", async () => {
    const app = await launchApp()
    try {
        const runtime = await app.electronApp.evaluate(() => ({ electron: process.versions.electron, abi: process.versions.modules, arch: process.arch }))
        const checks = await app.electronApp.evaluate(({ app }) => {
            // Playwright evaluates this callback in Electron's main-process global scope, where
            // CommonJS's module-local `require` is not a global. Build one from the packaged app
            // manifest so native addons resolve from the artifact under test and Electron ABI.
            const moduleApi = process.getBuiltinModule("module") as typeof import("node:module")
            const pathApi = process.getBuiltinModule("path") as typeof import("node:path")
            const requireFromApp = moduleApi.createRequire(pathApi.join(app.getAppPath(), "package.json"))
            const result: any = {
                sqlite: { loaded: false, exercised: false, detail: "" },
                opus: { loaded: false, exercised: false, detail: "" },
                osrCapture: { loaded: false, exercised: false, detail: "" },
                osrReadback: false
            }

            let db: any
            try {
                const Database = requireFromApp("better-sqlite3")
                result.sqlite.loaded = true
                db = new Database(":memory:")
                result.sqlite.value = db.prepare("SELECT 1 AS n").get().n
                result.sqlite.exercised = result.sqlite.value === 1
                result.sqlite.detail = `SELECT 1 returned ${result.sqlite.value}`
            } catch (err) {
                result.sqlite.detail = String(err)
            } finally {
                db?.close()
            }

            try {
                const { OpusEncoder } = requireFromApp("@discordjs/opus")
                result.opus.loaded = true
                const encoder = new OpusEncoder(48000, 2)
                const encoded = encoder.encode(Buffer.alloc(960 * 2 * 2))
                result.opus.exercised = Buffer.isBuffer(encoded) && encoded.length > 0
                result.opus.detail = `encoded PCM frame to ${encoded?.length || 0} bytes`
            } catch (err) {
                result.opus.detail = String(err)
            }

            try {
                const osr = requireFromApp("osr-capture")
                result.osrCapture.loaded = true
                const converted = osr.convertBgraToUyvy(Buffer.alloc(2 * 2 * 4), 2, 2)
                result.osrCapture.exercised = Buffer.isBuffer(converted) && converted.length === 2 * 2 * 2
                result.osrCapture.detail = `BGRA conversion returned ${converted?.length || 0} bytes; expected 8`
                result.osrReadback = typeof osr.readback === "function"
            } catch (err) {
                result.osrCapture.detail = String(err)
            }

            return result
        })

        console.info(`[smoke] Electron runtime ${JSON.stringify(runtime)}`)
        console.info(`[smoke] native module results ${JSON.stringify(checks)}`)
        expect(checks.sqlite, "better-sqlite3 must execute a real query").toMatchObject({ loaded: true, exercised: true })
        expect(checks.opus, "@discordjs/opus must encode a real PCM frame").toMatchObject({ loaded: true, exercised: true })
        expect(checks.osrCapture, "osr-capture must perform a real BGRA conversion").toMatchObject({ loaded: true, exercised: true })
        expect(checks.osrReadback, "osr-capture must expose its readback function").toBe(true)
    } finally {
        await closeApp(app)
    }
})

test("packaged projector output matches its committed per-OS pixel baseline", async () => {
    test.skip(!existsSync(baseline) && test.info().config.updateSnapshots !== "all", `no ${process.platform} pixel baseline at ${baseline} — capture with the "Playwright Tests" workflow_dispatch input update_snapshots=true and commit the -${process.platform}.png artifact (per-OS baselines only)`)

    const app = await launchApp()
    try {
        await prepareFirstRun(app)
        const slides = await createSeededShow(app)
        await slides.first().click({ timeout: timeoutMs })
        await delay(1_000)
        const { outputPage, outputWindowId } = await openOutput(app)
        await slides.first().click({ timeout: timeoutMs })
        const sizeRoute = await ensureOutputSize(app, outputPage, outputWindowId)

        await expect(outputPage.locator(outputWindowSelector)).toHaveCount(1)
        await expect(outputPage.getByText(seededLyric).first()).toBeVisible({ timeout: 10 * timeoutMs })
        await delay(3_000)
        await expect(outputPage).toHaveScreenshot(`${snapshotName}.png`, {
            animations: "disabled",
            caret: "hide",
            maxDiffPixels: 0,
            scale: "css",
            timeout: 30_000
        })

        assertRealFrame(readFileSync(baseline))
        console.info(`[smoke] pixel baseline ${baseline} verified at ${width}x${height} (size route: ${sizeRoute})`)
    } finally {
        await closeApp(app)
    }
})
