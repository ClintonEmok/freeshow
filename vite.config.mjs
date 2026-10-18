import { defineConfig } from "vite"
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte"

const production = process.env.NODE_ENV === "production"
const importMetaUrlName = "__freeshow_import_meta_url__"

function importMetaUrlIntro(bundlePath) {
    return `var ${importMetaUrlName} = typeof document !== "undefined" ? (document.currentScript && document.currentScript.src || new URL(${JSON.stringify(bundlePath)}, document.baseURI).href) : undefined;`
}

export default defineConfig({
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
        })
    ],
    root: production ? "." : "public",
    publicDir: false,
    build: production
        ? {
              lib: {
                  entry: "src/frontend/main.ts",
                  name: "freeshow",
                  formats: ["iife"],
                  fileName: () => "bundle.js",
                  // Vite 6+ names library CSS from this instead of deriving it from package.json "name" (which would give "freeshow.css")
                  cssFileName: "bundle"
              },
              outDir: "public/build",
              emptyOutDir: false,
              rollupOptions: {
                  output: {
                      assetFileNames: (assetInfo) => {
                          // Rollup 4 moved asset names to `names[]` and deprecated `name`; read both so neither version throws
                          const names = assetInfo.names ?? (assetInfo.name ? [assetInfo.name] : [])
                          const name = names[0] ?? ""
                          if (name.endsWith(".css")) {
                              return "bundle.css"
                          }
                          return name
                      },
                      // Module scripts have no document.currentScript; resolve the emitted bundle from index.html.
                      intro: importMetaUrlIntro("./build/bundle.js")
                  }
              }
          }
        : {
              outDir: "../dist",
              rollupOptions: {
                  input: "index.html"
              }
          },
    server: {
        port: 3000,
        host: "127.0.0.1",
        strictPort: true,
        middlewareMode: false
    },
    resolve: {
        dedupe: ["svelte"],
        ...(!production && { alias: { "/src": "../src" } })
    }
})
