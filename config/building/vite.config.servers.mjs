import { defineConfig } from "vite"
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte"
import { resolve } from "path"
import { copyFileSync, mkdirSync, existsSync } from "fs"

// Define server configurations
export const servers = {
    remote: { typescript: true },
    stage: { typescript: true },
    controller: { typescript: true },
    output_stream: { typescript: true }
}

const importMetaUrlName = "__freeshow_import_meta_url__"

function importMetaUrlIntro() {
    return `var ${importMetaUrlName} = typeof document !== "undefined" ? (document.currentScript && document.currentScript.src || new URL("client.js", document.baseURI).href) : undefined;`
}

// Copy static files for the server
function copyServerFiles(id) {
    const root = process.cwd()
    const dest = resolve(root, `build/electron/${id}`)

    // Ensure directory exists
    if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true })
    }

    const files = [
        { src: resolve(root, `src/server/${id}/index.html`), dest: resolve(dest, "index.html") },
        { src: resolve(root, `src/server/${id}/manifest.json`), dest: resolve(dest, "manifest.json") },
        { src: resolve(root, "src/server/icon.png"), dest: resolve(dest, "icon.png") },
        { src: resolve(root, "src/server/sw.js"), dest: resolve(dest, "sw.js") }
    ]

    if (id === "stage") {
        files.push(
            { src: resolve(root, `src/server/${id}/html/navigation.js`), dest: resolve(dest, "html/navigation.js") },
            { src: resolve(root, `src/server/${id}/html/show.css`), dest: resolve(dest, "html/show.css") }
        )

        const htmlDest = resolve(dest, "html")
        if (!existsSync(htmlDest)) {
            mkdirSync(htmlDest, { recursive: true })
        }
    }

    files.forEach(({ src, dest: targetDest }) => {
        try {
            copyFileSync(src, targetDest)
        } catch (err) {
            console.warn(`Failed to copy ${src} to ${targetDest}:`, err.message)
        }
    })
}

// Plugin to copy server files after build
function copyServerFilesPlugin(serverId) {
    return {
        name: "copy-server-files",
        writeBundle() {
            copyServerFiles(serverId)
        }
    }
}

export function getServerViteConfig(serverId, production = process.env.NODE_ENV === "production") {
    const serverConfig = servers[serverId]
    if (!serverConfig) {
        throw new Error(`Unknown server ID: ${serverId}`)
    }

    const root = process.cwd()

    return {
        // Vite 8/Rolldown no longer polyfills import.meta.url in IIFE output; keep dev's native URL untouched.
        ...(production && { define: { "import.meta.url": importMetaUrlName } }),
        plugins: [
            svelte({
                preprocess: vitePreprocess(),
                compilerOptions: {
                    dev: !production
                },
                onwarn: (warning, handler) => {
                    // disable A11y warnings (Svelte 5 renamed the warning codes from kebab-case to snake_case)
                    if (warning.code.startsWith("a11y_")) return
                    handler(warning)
                }
            }),
            copyServerFilesPlugin(serverId)
        ],
        root: resolve(root, `src/server/${serverId}`),
        publicDir: production ? false : resolve(root, "public"),
        build: {
            outDir: resolve(root, `build/electron/${serverId}`),
            emptyOutDir: true,
            lib: {
                entry: resolve(root, `src/server/${serverId}/main.ts`),
                name: serverId,
                formats: ["iife"],
                fileName: () => "client.js",
                // each server's index.html links "styles.css" by literal name (and Vite 6+ would otherwise derive "freeshow.css")
                cssFileName: "styles"
            },
            rollupOptions: {
                output: {
                    assetFileNames: (assetInfo) => {
                        // Rollup 4 moved asset names to `names[]` and deprecated `name`; read both so neither version throws
                        const names = assetInfo.names ?? (assetInfo.name ? [assetInfo.name] : [])
                        const name = names[0] ?? ""
                        if (name.endsWith(".css")) {
                            return "styles.css"
                        }
                        return name
                    },
                    // Server index.html loads client.js as a classic script, so currentScript is the bundle URL.
                    intro: importMetaUrlIntro()
                }
            },
            minify: production ? "terser" : false,
            sourcemap: !production
        },
        resolve: {
            dedupe: ["svelte"],
            alias: {
                "@": resolve(root, "src")
            }
        },
        server: {
            port: 3001 + Object.keys(servers).indexOf(serverId),
            strictPort: false,
            hmr: true,
            watch: {
                usePolling: false
            },
            fs: {
                allow: [root]
            }
        }
    }
}

export default defineConfig(() => {
    const serverId = process.env.VITE_SERVER_ID || process.argv.find((arg) => arg.startsWith("--server="))?.split("=")[1]

    if (!serverId || !servers[serverId]) {
        console.error("Please specify a server to build using VITE_SERVER_ID environment variable")
        console.error("Available servers:", Object.keys(servers).join(", "))
        process.exit(1)
    }

    return getServerViteConfig(serverId)
})
