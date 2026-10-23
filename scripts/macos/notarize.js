// From https://github.com/simonw/til/blob/main/electron/sign-notarize-electron-macos.md
// Based on https://kilianvalkhof.com/2019/electron/notarizing-your-electron-application/

const { notarize } = require("@electron/notarize")

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context
    if (electronPlatformName !== "darwin") return

    // This opt-out is scoped to unpacked smoke packaging; it does not disable
    // electron-builder signing. Release workflows do not set this flag.
    if (process.env.FS_SMOKE_SKIP_NOTARIZE === "true") {
        console.info("Skipping custom macOS notarization hook for smoke packaging")
        return
    }

    const appName = context.packager.appInfo.productFilename

    return await notarize({
        appBundleId: "app.freeshow",
        appPath: `${appOutDir}/${appName}.app`,
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID
    })
}
