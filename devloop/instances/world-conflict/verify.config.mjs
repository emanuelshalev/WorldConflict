// World Conflict verify gate (runner: devloop/kit/verify-runner.mjs, usage in ./README.md).
//   npm run verify                    tests, lints, build, balance, servers, smoke, reveal, visual, regressions
//   npm run verify -- --quick         tests, lints, build, registry check
//   npm run verify -- --ui            UI lint, UI build, smoke, reveal, visual
//   npm run verify -- --full          everything, plus the orders/world map acceptance scenarios
//   npm run verify -- --balance       balance bands only
//   npm run verify -- --changed       suites and finding guards that cover files changed since the base
//   npm run verify -- --update-visual rewrite the visual baselines (tests/visual/__screenshots__/)
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inst = 'devloop/instances/world-conflict';
const registry = `${inst}/regressions.yaml`;
const browserEnv = (ctx) => ({ DEVLOOP_BASE_URL: `${ctx.urls.ui}/`, DEVLOOP_API_URL: `${ctx.urls.api}/api` });
const lastLine = (re) => (log) => (log.match(re) ?? []).slice(-1)[0] ?? '';

export default {
  name: 'World Conflict',
  root,
  out: '.verify',
  modes: {
    default: ['registry', 'test', 'lint', 'ui-lint', 'build', 'balance', 'smoke', 'reveal', 'visual', 'regressions'],
    quick: ['registry', 'test', 'lint', 'ui-lint', 'build'],
    ui: ['ui-lint', 'ui-build', 'smoke', 'reveal', 'visual'],
    full: ['registry', 'test', 'lint', 'ui-lint', 'build', 'balance', 'smoke', 'reveal', 'visual', 'regressions', 'orders', 'worldmap'],
    balance: ['balance'],
    changed: ['changed'],
  },
  flags: {
    'update-visual': { steps: ['visual'], note: 'rewrite the visual baselines instead of comparing' },
  },
  servers: {
    api: {
      cmd: 'npx',
      args: ['tsx', 'src/api/server.ts'],
      // JSON saves in the run folder: never touches dev.db or saves/
      env: (ctx) => ({ PORT: String(ctx.ports.api), DB_DRIVER: 'json', WC_DAILY_DATE: '2026-11-22' /* guards and baselines must not depend on the calendar */, SAVES_DIR: path.join(ctx.out, 'saves'), CORS_ORIGINS: ctx.urls.ui ?? '' }),
      port: 8640,
      ready: (ctx) => `${ctx.urls.api}/health`,
    },
    ui: {
      cmd: 'npx',
      args: (ctx) => ['vite', '--port', String(ctx.ports.ui), '--strictPort'],
      cwd: 'ui',
      env: (ctx) => ({ VITE_API_PROXY: ctx.urls.api }),
      port: 5640,
      ready: (ctx) => `${ctx.urls.ui}/`,
    },
  },
  steps: [
    {
      id: 'changed',
      label: 'Changed files: covering suites and guards',
      cmd: 'node',
      args: (ctx) => ['devloop/kit/regressions.mjs', registry, 'changed', '--base', process.env.VERIFY_BASE ?? 'origin/dev/rc1-synthetic-loop', '--out', path.join(ctx.out, 'regressions')],
      env: browserEnv,
      needs: ['api', 'ui'],
      summarize: lastLine(/findings covering them.*|\d+\/\d+ findings.*/g),
    },
    {
      id: 'registry',
      label: 'Regression registry check',
      cmd: 'node',
      args: ['devloop/kit/regressions.mjs', registry, 'check'],
      summarize: lastLine(/\d+ findings, \d+ guards, \d+ problems/g),
    },
    {
      id: 'test',
      label: 'Unit tests (vitest)',
      cmd: 'npm',
      args: ['run', 'test'],
      timeoutMs: 900_000,
      // npm test is two vitest runs (main + perf): add them up
      summarize: (log) => {
        const n = (re) => [...log.matchAll(re)].reduce((s, m) => s + Number(m[1]), 0);
        const failed = n(/Tests\s+(\d+) failed/g);
        return `${n(/Tests\s+(?:\d+ failed \| )?(\d+) passed/g)} passed${failed ? `, ${failed} failed` : ''}`;
      },
    },
    { id: 'lint', label: 'Backend lint (biome)', cmd: 'npm', args: ['run', 'lint'], summarize: lastLine(/Checked \d+ files|Found \d+ errors?/g) },
    { id: 'ui-lint', label: 'UI lint (eslint)', cmd: 'npm', args: ['run', 'lint'], cwd: 'ui' },
    { id: 'build', label: 'Build (tsc + vite)', cmd: 'npm', args: ['run', 'build'], timeoutMs: 600_000 },
    { id: 'ui-build', label: 'UI build (vite)', cmd: 'npm', args: ['run', 'build'], cwd: 'ui', timeoutMs: 600_000 },
    {
      id: 'smoke',
      label: 'Smoke playtest (3 months)',
      cmd: 'node',
      args: (ctx) => [`${inst}/smoke.mjs`, path.join(ctx.out, 'smoke')],
      env: browserEnv,
      needs: ['api', 'ui'],
      timeoutMs: 300_000,
    },
    {
      id: 'reveal',
      label: 'Reveal fast-forward',
      cmd: 'node',
      args: (ctx) => ['devloop/kit/finish-flashpoint.mjs', path.join(ctx.out, 'finish')],
      env: browserEnv,
      needs: ['api', 'ui'],
      timeoutMs: 600_000,
      summarize: lastLine(/reveal opened after \d+ months/g),
    },
    {
      id: 'visual',
      label: 'Visual regression',
      cmd: 'npx',
      args: (ctx) => ['playwright', 'test', '-c', 'tests/visual/playwright.config.ts', ...(ctx.flags.has('update-visual') ? ['--update-snapshots'] : [])],
      env: (ctx) => ({ VISUAL_BASE_URL: `${ctx.urls.ui}/`, VISUAL_API_URL: `${ctx.urls.api}/api`, VISUAL_OUT: path.join(ctx.out, 'visual') }),
      needs: ['api', 'ui'],
      // A clean run takes about 4.5 minutes on Windows (35 tests, four workers, the 3440 layout
      // pages the heaviest). A real layout change fails each of the 13 layout tests three times at
      // roughly a minute an attempt, about 10 more minutes: 20 minutes keeps that run's report
      // instead of cutting it off (600 s did, 2026-11-23)
      timeoutMs: 1_200_000,
      summarize: (log) => [...log.matchAll(/^\s*(\d+ (?:failed|flaky|passed))/gm)].map((m) => m[1]).join(', '),
    },
    {
      id: 'regressions',
      label: 'Finding guards (regressions.yaml)',
      cmd: 'node',
      args: (ctx) => ['devloop/kit/regressions.mjs', registry, 'run', '--out', path.join(ctx.out, 'regressions')],
      env: browserEnv,
      needs: ['api', 'ui'],
      timeoutMs: 1_200_000,
      summarize: lastLine(/\d+\/\d+ findings guarded.*/g),
    },
    {
      id: 'balance',
      label: 'Balance bands (reduced harness)',
      cmd: 'npx',
      args: ['vitest', 'run', '-c', 'vitest.balance.config.ts'],
      timeoutMs: 900_000,
      summarize: lastLine(/Tests\s+.*(passed|failed).*/g),
    },
    {
      id: 'orders',
      label: 'Orders acceptance (27 AC)',
      cmd: 'node',
      args: (ctx) => [`${inst}/scenarios-qa/orders.mjs`, path.join(ctx.out, 'orders'), `${ctx.urls.ui}/`, `${ctx.urls.api}/api`],
      needs: ['api', 'ui'],
      timeoutMs: 900_000,
    },
    {
      id: 'worldmap',
      label: 'World map acceptance (20 AC)',
      cmd: 'node',
      args: (ctx) => [`${inst}/scenarios-qa/worldmap.mjs`, path.join(ctx.out, 'worldmap'), `${ctx.urls.ui}/`, `${ctx.urls.api}/api`],
      needs: ['api', 'ui'],
      timeoutMs: 900_000,
    },
  ],
};
