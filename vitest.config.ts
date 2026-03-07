import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
