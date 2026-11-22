import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Several tests simulate 24-48 turns; give them room on a busy machine
    testTimeout: 20_000,
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
    // Opt-in suite: balance bands (vitest.balance.config.ts, npm run verify -- --balance)
    exclude: [...configDefaults.exclude, 'tests/balance/**'],
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
