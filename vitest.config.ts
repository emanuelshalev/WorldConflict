import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Several tests simulate 24-48 turns; give them room on a busy machine
    testTimeout: 20_000,
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/api/server.ts', 'src/generated/**'],
    },
  },
  resolve: {
    alias: {
      '@core': './src/core',
      '@agents': './src/agents',
      '@api': './src/api',
      '@infra': './src/infra',
    },
  },
});
