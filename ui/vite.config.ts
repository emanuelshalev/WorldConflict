import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const UI = dirname(fileURLToPath(import.meta.url))

/**
 * The font files `src/styles/fonts.css` points at (`url('@fontsource...')`) that are not in
 * `node_modules`. Vite only warns on a CSS url() it cannot resolve and ships the CSS unchanged, so a
 * stale install built a game with no fonts at all (QA4-S2-1). Exported for tests/ui-fonts-build.spec.ts.
 */
export function missingFontFiles(css = join(UI, 'src/styles/fonts.css'), modules = join(UI, 'node_modules')): string[] {
  const specs = [...readFileSync(css, 'utf-8').matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1])
  return [...new Set(specs)].filter((s) => !s.startsWith('/') && !s.startsWith('data:') && !existsSync(join(modules, s)))
}

/** Fail the production build (warn loudly in dev) when a shipped font file does not resolve. */
export function shippedFonts(opts: { modules?: string } = {}): Plugin {
  let command: 'build' | 'serve' = 'serve'
  return {
    name: 'wc-shipped-fonts',
    configResolved(c) {
      command = c.command
    },
    buildStart() {
      const missing = missingFontFiles(undefined, opts.modules)
      if (!missing.length) return
      const msg = `${missing.length} font file(s) in src/styles/fonts.css are not installed (first: ${missing[0]}). Run "npm install" in ui/.`
      if (command === 'build') this.error(msg)
      else this.warn(msg)
    },
    generateBundle(_, bundle) {
      // Every font url must have become a hashed asset: none is left for the browser to resolve
      const fonts = Object.keys(bundle).filter((f) => f.endsWith('.woff2'))
      if (!fonts.length) this.error('The build ships no .woff2 font: src/styles/fonts.css was not bundled.')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), shippedFonts()],
  build: {
    // The map engine and React are large and change rarely: ship them as their own cacheable
    // chunks. A function, because the app imports subpaths (`react-dom/client`,
    // `react-dom/server`) that the object form (bare package names) did not catch.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined
          if (/\/node_modules\/(maplibre-gl|@maplibre)\//.test(id)) return 'maplibre'
          if (/\/node_modules\/(react|react-dom|scheduler|zustand)\//.test(id)) return 'react'
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 1100,
  },
  server: {
    // The store calls a relative `/api` (VITE_API_BASE overrides it in production);
    // in dev, forward those calls to the Fastify backend.
    proxy: {
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:8080',
    },
  },
})
