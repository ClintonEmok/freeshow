const { existsSync, readdirSync, readFileSync, statSync } = require("fs")
const { join } = require("path")

// app build file paths
const buildSveltePath = join(__dirname, "..", "public", "build")
const buildElectronPath = join(__dirname, "..", "build") // this includes server files
const sourceIndexPath = join(__dirname, "..", "public", "index.html")

// the literal contract scripts/postBuild.js writes and scripts/cleanBuilds.js restores
const devScriptPath = '<script type="module" src="/src/frontend/main.ts"></script>'
const prodHTMLPaths = '<script type="module" crossorigin src="./build/bundle.js"></script><link rel="stylesheet" href="./build/bundle.css">'

// real component selectors that must survive into the extracted CSS, so an empty stub cannot pass
const requiredCSSSelectors = [".dragger", ".mediaContainer", ".attributionString"]

function fail(message) {
    throw new Error(`Build output assertion failed: ${message}`)
}

function assertNonEmptyFile(filePath, label) {
    if (!existsSync(filePath)) fail(`${label} is missing (expected ${filePath})`)
    if (statSync(filePath).size === 0) fail(`${label} is empty (${filePath})`)
}

try {
    // 1. exactly one CSS asset, named bundle.css
    const cssFiles = existsSync(buildSveltePath) ? readdirSync(buildSveltePath).filter((file) => file.endsWith(".css")) : []
    const onlyCSSFile = cssFiles.length === 1 ? cssFiles[0] : ""
    if (onlyCSSFile !== "bundle.css") {
        fail(`expected exactly one CSS asset named "bundle.css" in public/build, found: ${cssFiles.join(", ") || "none"}`)
    }

    // 2 + 3. the stylesheet and the bundle are both non-empty
    const bundleCSSPath = join(buildSveltePath, "bundle.css")
    const bundleJSPath = join(buildSveltePath, "bundle.js")
    assertNonEmptyFile(bundleCSSPath, "the renderer stylesheet bundle.css")
    assertNonEmptyFile(bundleJSPath, "the renderer bundle bundle.js")

    // 4. the production HTML literal is present (not merely "the dev literal is absent"), and it points at files that exist
    const htmlContent = readFileSync(sourceIndexPath, "utf8")
    if (!htmlContent.includes(prodHTMLPaths)) {
        const state = htmlContent.includes(devScriptPath) ? "it still holds the development script path" : "it holds neither the development nor the production script path"
        fail(`public/index.html does not reference the production bundle - ${state}`)
    }

    // 5. the stylesheet holds real extracted component CSS, from more than one component
    const cssContent = readFileSync(bundleCSSPath, "utf8")
    requiredCSSSelectors.forEach((selector) => {
        if (!cssContent.includes(selector)) fail(`the built CSS is missing the component selector "${selector}"`)
    })

    // 6. the electron build ran
    assertNonEmptyFile(join(buildElectronPath, "electron", "index.js"), "the electron main process build")

    console.info(`Build output assertion passed: bundle.css (${statSync(bundleCSSPath).size} bytes, ${requiredCSSSelectors.length} component selectors), bundle.js, production HTML literal, electron build`)
} catch (err) {
    console.error(err.message)
    process.exit(1)
}
