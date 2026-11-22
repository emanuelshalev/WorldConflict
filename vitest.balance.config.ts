import { defineConfig } from 'vitest/config';

// Opt-in balance band check (npm run verify -- --balance): a reduced headless harness run asserted
// against the CLAUDE.md bands. Excluded from the default `npm test` (vitest.config.ts).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/balance/**/*.spec.ts'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
});
