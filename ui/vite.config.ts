import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The map engine is large and changes rarely: ship it as its own cacheable chunk
    rollupOptions: {
      output: {
        manualChunks: { maplibre: ['maplibre-gl'], react: ['react', 'react-dom', 'zustand'] },
      },
    },
    chunkSizeWarningLimit: 1100,
  },
  server: {
    // The store calls a relative `/api` (VITE_API_BASE overrides it in production);
    // in dev, forward those calls to the Fastify backend.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
