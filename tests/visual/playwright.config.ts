// Visual regression suite (Playwright test runner from the `playwright` package).
// Run through the gate, which starts its own API and Vite servers:
//   npm run verify -- --only visual        compare against the baselines
//   npm run verify -- --update-visual      rewrite the baselines
// Or against running servers:
//   VISUAL_BASE_URL=http://localhost:5173/ VISUAL_API_URL=http://localhost:8080/api \
//     npx playwright test -c tests/visual/playwright.config.ts [--update-snapshots]
// Baselines: tests/visual/__screenshots__/<test file>/<name>.png on Linux; other systems render
// fonts differently and keep their own set in a subfolder (win32/, darwin/). Specs are *.visual.ts
// so vitest never picks them up.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));

const out = process.env.VISUAL_OUT ?? path.resolve(here, '../../.verify/visual');

export default defineConfig({
  testDir: here,
  testMatch: /.*\.visual\.ts$/,
  outputDir: path.join(out, 'results'),
  snapshotPathTemplate: `{testDir}/__screenshots__/{testFileName}/${process.platform === 'linux' ? '' : `${process.platform}/`}{arg}{ext}`,
  fullyParallel: true,
  workers: 4,
  retries: 1,
  timeout: 90_000,
  reporter: [['list'], ['html', { outputFolder: path.join(out, 'report'), open: 'never' }]],
  expect: {
    // Software GL rasterises the SVG-heavy galleries slowly: allow a slow capture
    timeout: 30_000,
    toHaveScreenshot: {
      // Tolerant to font antialiasing and GPU rasterisation noise, strict enough for layout,
      // copy and colour changes: a pixel counts when it differs by more than 20% in YIQ space,
      // and up to 1.5% of the pixels may differ.
      threshold: 0.2,
      maxDiffPixelRatio: 0.015,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    baseURL: process.env.VISUAL_BASE_URL ?? 'http://localhost:5173/',
    reducedMotion: 'reduce',
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'UTC',
    // Software GL: slower, but the same pixels on every machine
    launchOptions: { args: ['--use-angle=swiftshader', '--use-gl=angle', '--font-render-hinting=none'] },
  },
});
