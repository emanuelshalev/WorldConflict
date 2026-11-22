import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
