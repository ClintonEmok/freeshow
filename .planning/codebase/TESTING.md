# Testing Patterns

**Analysis Date:** 2026-10-17

## Overview

FreeShow uses **two** test frameworks with a clear split:

- **Vitest 2.1.9** — unit tests and one real-process integration test, co-located with source as `*.test.ts`.
- **Playwright 1.56.1** — a single end-to-end smoke test that launches the built Electron app (`config/testing/start.test.ts`).

There are **12 Vitest test files** and **1 Playwright test** in the repo. `svelte-check` and Prettier run as separate "format/type" checks in the same `npm test` pipeline.

## Test Framework

**Runner (unit + integration):**
- Vitest `^2.1.9`
- Config: `config/testing/vitest.config.ts`
- `root` is set back to the project root (because the config lives in `config/testing/`), `include: ["src/**/*.test.ts"]`, `environment: "node"`.

**Runner (e2e):**
- `@playwright/test` `^1.56.1` (with `playwright` `^1.56.1`)
- Config: `config/testing/playwright.config.ts`
- `testDir: "."`, `testMatch: "**/*.test.ts"`, `timeout: 120_000`, `expect.timeout: 10_000`, `fullyParallel: false`, `workers: 1`, `retries: CI ? 2 : 0`.

**Assertion Library:**
- Vitest built-in `expect` (no separate assertion lib).
- Playwright `@playwright/test` `expect` for the e2e test.

**Run Commands:**
```bash
npm run test              # test:unit + test:playwright + test:format + test:svelte (sequential)
npm run test:unit         # vitest run --config config/testing/vitest.config.ts
npm run test:playwright   # npx playwright test --config config/testing/playwright.config.ts
npm run test:format       # prettier --check on src scripts
npm run test:svelte       # svelte-check
# focused runs
npx vitest --config config/testing/vitest.config.ts run src/electron/cloud/syncLedger.test.ts
npx vitest --config config/testing/vitest.config.ts         # watch mode
```

There is **no coverage configuration** and no `vitest.setup.ts`/`jest.config` — each test file does its own setup/mocking. No global setup file exists (`find` for `vitest.setup*` returns nothing).

## Test File Organization

**Location:** Co-located next to the source file. A test for `src/electron/cloud/syncLedger.ts` lives at `src/electron/cloud/syncLedger.test.ts`.

**Naming:**
- `<subject>.test.ts` — unit tests.
- `<subject>.integration.test.ts` — tests that spawn real external processes. Only `src/electron/streaming/RtmpStreamer.integration.test.ts` currently.
- The Playwright test is `config/testing/start.test.ts`.

**Current test files:**
```
src/frontend/utils/search.test.ts
src/frontend/ai/scripture/numbers.test.ts
src/frontend/ai/scripture/references.test.ts
src/electron/ai/stt/sttHelper.test.ts
src/electron/cloud/syncLedger.test.ts
src/electron/cloud/syncManager.test.ts
src/electron/contentProviders/onStage/songBuilder.test.ts
src/electron/data/backup.test.ts
src/electron/data/zip.test.ts
src/electron/streaming/encoderProfiles.test.ts
src/electron/streaming/RtmpStreamer.integration.test.ts   # integration
src/electron/utils/requests.test.ts
config/testing/start.test.ts                              # Playwright e2e
```

**Structure:** No `__tests__` directories; no test-only fixtures directory — fixtures and factory helpers are defined inline at the top of each test file.

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from "vitest"
import { addSongArrangement, createSongBuild, finalizeSongBuild, type OnStageSection, type OnStageSong } from "./songBuilder"

// inline factory helpers at the top of the file
function section(label: string, number: number, lines: string[], overrides: Partial<OnStageSection> = {}): OnStageSection {
    return { label, number, name: `${label} ${number}`, repeats: 1, notes: null, instrumental: false, unscheduled: false, slides: [{ lines }], ...overrides }
}
const VERSE = () => section("Verse", 1, ["mare este Domnul", "vrednic de laudă"])

describe("song shared by several services", () => {
    it("keeps one arrangement per structure", () => {
        const build = createSongBuild(song([]))
        const first = addSongArrangement(build, song([VERSE(), CHORUS(), BRIDGE()]), "Sunday")
        const show = finalizeSongBuild(build)
        expect(first).not.toBe(second)
        expect(Object.keys(show.layouts)).toHaveLength(2)
    })
})
```
(`src/electron/contentProviders/onStage/songBuilder.test.ts`)

**Conventions observed:**
- Import order: `{ describe, expect, it }` (alphabetical-ish) from `vitest` on the first line, then the subject under test. Some files add `beforeEach/afterEach/beforeAll/afterAll/vi` as needed (`src/electron/streaming/RtmpStreamer.integration.test.ts`).
- `describe` names are **behavioral sentences**, often naming the module and a scenario, sometimes with an issue reference: `describe("SyncLedger — per-item merge (#3335)")`, `describe("normalizeNumbers - Multilingual")`, `describe("RTMP pipeline (real ffmpeg)")`.
- `it` names describe the outcome in plain language, frequently with the *reason*: `it("an item marked deleted and missing locally is skipped (stays deleted, no resurrection)")`.
- Nested `describe` blocks group behaviors (`describe("union ...")`, `describe("vaapi")`, `describe("deletion propagates ...")`).
- Factory helpers (`makeChanges`, `section`, `song`, `bgraFrame`, `writeTempFile`) keep setup declarative and are defined once at the top.
- Local assertion helpers are common: `const ids = (results: any[]) => results.map((r) => r.id)` (`src/frontend/utils/search.test.ts`), `function arg(args, flag)` (`src/electron/streaming/encoderProfiles.test.ts`).

**Setup/Teardown patterns:**
- `beforeEach` for reset between tests — e.g. clearing a store: `beforeEach(() => h.textCache._set({}))` (`src/frontend/utils/search.test.ts`).
- Real-filesystem tests create a temp root and clean it: `beforeAll(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "freeshow-rtmp-")) })` with `afterAll(() => fs.rmSync(h.tempRoot, { recursive: true, force: true }))` (`src/electron/data/zip.test.ts`, `src/electron/cloud/syncManager.test.ts`).
- `afterEach` tears down active resources (`RtmpStreamer.stopAll()`, clears intervals) in `src/electron/streaming/RtmpStreamer.integration.test.ts`.
- `vi.useFakeTimers()` + `vi.setSystemTime(...)` for time-dependent logic, restored with `vi.useRealTimers()` (`src/electron/data/backup.test.ts`).

## Mocking

**Framework:** Vitest `vi` (`vi.mock`, `vi.fn`, `vi.mocked`, `vi.hoisted`).

**Primary pattern — `vi.hoisted` for setup that must run before imports resolve:**
```typescript
// 1. Host the temporary folder setup so it runs before imports are resolved
const h = vi.hoisted(() => {
    const fs = require("fs")
    const path = require("path")
    const tempRoot = path.join(__dirname, "../../../tmp_test_sync")
    if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot, { recursive: true, force: true })
    fs.mkdirSync(tempRoot, { recursive: true })
    return { tempRoot, /* ...shared mutable state... */ }
})

// 2. Mock the module's dependencies by returning hand-written fakes
vi.mock("electron", () => ({ app: { getPath: (name: string) => /* ... */, whenReady: () => Promise.resolve() }, ipcMain: { on: vi.fn(), handle: vi.fn() } }))
vi.mock("../IPC/main", () => ({ sendMain: vi.fn(), sendToMain: vi.fn() }))
```
(`src/electron/cloud/syncManager.test.ts`)

**Pattern — partial mock with `importOriginal`:**
```typescript
vi.mock("../utils/helpers", async (importOriginal) => {
    const actual = (await importOriginal()) as any
    return { ...actual, getMachineId: () => h.currentMachineId }
})
```
(`src/electron/cloud/syncManager.test.ts`)

**Pattern — module factory returning `vi.fn()`s, cast to typed mocks in the test:**
```typescript
vi.mock("../utils/files", () => ({ deleteFile: vi.fn(), readFolder: vi.fn(() => []), /* ... */ }))
// then:
vi.mocked(readFolder).mockImplementation((folderPath: string) => /* ... */)
vi.mocked(getFileStats).mockReturnValue({ stat: { ctimeMs: 1000000, size: 2048 }, folder: false } as any)
```
(`src/electron/data/backup.test.ts`)

**Pattern — hand-written fake classes for Node APIs** (so tests can drive exact lifecycles without real sockets):
```typescript
// Fake ClientRequest that mimics the two Node.js behaviors this test cares about...
class FakeClientRequest extends EventEmitter {
    destroy(err?: Error) { this.destroyed = true; if (err) queueMicrotask(() => this.emit("error", err)) }
}
vi.mock("https", () => ({ default: { request: (_options: any, onResponse: any) => { /* ... */ return lastRequest } } }))
```
(`src/electron/utils/requests.test.ts`)

**Pattern — mirror real behavior in a stub** so the unit under test reflects production: the txt/similarity mock in `src/frontend/utils/search.test.ts` reimplements the actual Levenshtein similarity rather than stubbing it to a constant.

**What to mock:**
- Electron main-process globals (`electron`, `electron-store`) whenever the subject imports them.
- IPC senders (`../IPC/main` → `sendMain`/`sendToMain`).
- Filesystem and OS helpers (`../utils/files`), heavy collaborators (`./zip`, `./store`), and network (`https`).
- Svelte stores plus heavy collaborators for renderer pure-logic tests (`../stores`, `../converters/txt`) — `src/frontend/utils/search.test.ts`.

**What NOT to mock:**
- The module under test itself.
- Real external processes in the integration test: only encoder *resolution* is faked, actual `ffmpeg`/`ffprobe` are spawned (`src/electron/streaming/RtmpStreamer.integration.test.ts` — `vi.mock("./encoderDetection", ...)` and `vi.mock("./ffmpegManager", ...)` only).

**Conditional suites:** environment-dependent tests are skipped via a computed alias rather than being marked pending inline:
```typescript
function hasFfmpeg(): boolean { try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true } catch { return false } }
const describeIfFfmpeg = hasFfmpeg() ? describe : describe.skip
describeIfFfmpeg("RTMP pipeline (real ffmpeg)", () => { /* ... */ })
```
(`src/electron/streaming/RtmpStreamer.integration.test.ts`)

## Fixtures and Factories

**Test data:** Built with small typed factory functions, overridable via a `Partial<T>` last argument:
```typescript
function makeChanges(devices: string[], overrides: Partial<Changes> = {}): Changes {
    return { version: "0.1.1", devices, modified: {}, deleted: {}, created: {}, ...overrides }
}
```
(`src/electron/cloud/syncLedger.test.ts`)

Inline data objects are typed with `as any` cast when the exact shape is irrelevant — a pervasive, accepted pattern in these tests:
```typescript
const shows = [{ id: "amazing", name: "Amazing Grace" }] as any
```
(`src/frontend/utils/search.test.ts`)

**Location:** Defined at the top of each test file. There is no shared fixtures/helpers module.

**File fixtures:** temp files/dirs are created with `fs.mkdtempSync`/`tmp.dirSync` and removed in `afterAll`/`afterEach` (`tmp.dirSync({ unsafeCleanup: true })` in `config/testing/start.test.ts`).

## Coverage

**Requirements:** None. No coverage tooling is configured and no threshold is enforced. Vitest runs without `--coverage`.

**View Coverage:** Not applicable — would require adding `@vitest/coverage-*` and a coverage config.

## Test Types

**Unit Tests:**
- The bulk of the suite. Pure functions and classes with dependencies mocked. Focus areas:
  - Frontend pure logic: search scorer (`src/frontend/utils/search.test.ts`), scripture number/reference normalization (`src/frontend/ai/scripture/*.test.ts`).
  - Electron logic: sync ledger and manager (`src/electron/cloud/*.test.ts`), song build (`src/electron/contentProviders/onStage/songBuilder.test.ts`), backup/zip (`src/electron/data/*.test.ts`), ffmpeg command builders (`src/electron/streaming/encoderProfiles.test.ts`), STT helpers (`src/electron/ai/stt/sttHelper.test.ts`), https request handling (`src/electron/utils/requests.test.ts`).
- Multi-language coverage is a recurring theme (numbers/references tests assert across English/French/Spanish/German/Portuguese/Italian/Dutch/Norwegian).

**Integration Tests:**
- `src/electron/streaming/RtmpStreamer.integration.test.ts` — spawns real `ffmpeg`/`ffprobe`, feeds BGRA frames, and asserts on the produced FLV (codec, dimensions, status events, fallback/reconnect behavior). Gated on `ffmpeg` availability, with generous per-test timeouts (`}, 15000)`/`}, 20000)`).
- `src/electron/cloud/syncManager.test.ts` is effectively a filesystem integration test: it drives `syncData()` across simulated devices against real temp dirs and real zips.

**E2E Tests:**
- Playwright, launching the **packaged app**: `config/testing/start.test.ts` launches Electron via `playwright._electron`, with `NODE_ENV: "production"` and `FS_MOCK_STORE_PATH` pointing at a temp dir.
- It mocks the Electron open dialog by overriding `dialog.showOpenDialog`, waits for the main window (`w.url().includes("index.html")`), then drives first-run setup, project/show creation, lyric entry, group change, and save via keyboard shortcuts.
- Uses a fixed `const timeoutMs = 2_000` and `await delay(ms)` for the app's startup timing; on failure it screenshots to `test-output/screenshots/failed.png` and rethrows.
- `test.beforeEach` aborts the GitHub releases route: `await context.route("https://api.github.com/.../releases", (route) => route.abort())`.
- Run in CI via `.github/workflows/playwright.yml` under `xvfb-run` after `npm run build`; artifacts (`test-output/`) are uploaded for 30 days.

## Common Patterns

**Async Testing:**
```typescript
await expect(compressToZip(entries, zipPath)).resolves.toBeUndefined()
const files = await decompressZipStream(zipPath)
```
(`src/electron/data/zip.test.ts`)

Waiting on real async work is done with explicit sleeps scaled to workload:
```typescript
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
await new Promise((r) => setTimeout(r, 2_400))
```
(`src/electron/streaming/RtmpStreamer.integration.test.ts`)

**Error Testing:**
- Assert on injected rejections and user-facing side effects rather than thrown values:
```typescript
vi.mocked(compressToZip).mockRejectedValueOnce(new Error("Zip compression failed"))
await startBackup()
expect(sendToMain).toHaveBeenCalledWith(ToMain.ALERT, "Could not create the backup file!")
```
(`src/electron/data/backup.test.ts`)

- Callback-style errors are asserted via `vi.fn()` capture:
```typescript
const cb = vi.fn()
httpsRequest("example.com", "/", "GET", {}, {}, cb)
lastRequest.emit("timeout")
const [err, result] = cb.mock.calls[0]
expect(err).toBeInstanceOf(Error)
```
(`src/electron/utils/requests.test.ts`)

**Parametrized Testing (`it.each`):**
```typescript
it.each([
    ["nvenc", "-rc", "cbr"],
    ["amf", "-rc", "cbr"],
    ["vaapi", "-rc_mode", "CBR"]
] as const)("requests CBR on %s", (encoderId, flag, value) => {
    const args = buildEncoderCommand({ ...baseOptions, encoderId, rateControl: "cbr" })
    expect(arg(args, flag)).toBe(value)
})
```
(`src/electron/streaming/encoderProfiles.test.ts`)

**Property/generative style:**
- Loops over all enum members to assert invariants: `for (const id of ENCODER_IDS) { expect(arg(buildEncoderCommand({ ...baseOptions, encoderId: id }), "-c:v")).toBe(getProfile(id).codec) }` (`src/electron/streaming/encoderProfiles.test.ts`).
- Diminishing-returns and monotonicity assertions use comparisons rather than exact fixed values where appropriate (`src/frontend/utils/search.test.ts`).

**Commenting intent:** Tests frequently carry a `// reason` comment above a non-obvious assertion, e.g. `// every FLV stream starts with 'F', 'L', 'V' (0x46, 0x4c, 0x56)` and `// a truncated buffer would otherwise desync -f rawvideo and shear the broadcast`.

## Adding Tests

- **New unit test:** create `<subject>.test.ts` beside the source, `import { describe, expect, it } from "vitest"`, mock Electron/IPC/fs dependencies with `vi.mock` + `vi.hoisted` if imports require it, and use inline factory helpers.
- **New integration test:** name it `<subject>.integration.test.ts`, gate on the external tool via a `hasX() ? describe : describe.skip` alias, and give each `it` an explicit timeout.
- **Run a single file:** `npx vitest --config config/testing/vitest.config.ts run <path>`.
- **E2E:** extend `config/testing/start.test.ts` (single Playwright spec) or add a new `.test.ts` under `config/testing/` — it is picked up by `testMatch: "**/*.test.ts"` and will launch a separate Electron instance.

---

*Testing analysis: 2026-10-17*
