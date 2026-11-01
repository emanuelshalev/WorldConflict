import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The store calls a relative `/api` (VITE_API_BASE overrides it in production);
    // in dev, forward those calls to the Fastify backend.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
