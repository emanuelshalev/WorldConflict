// Visual regression: deterministic surfaces compared with baselines in __screenshots__/.
// Config and how to run: ./playwright.config.ts. Every page runs with reduced motion, CSS
// animations disabled, a fixed clock and, where something is live (the WebGL globe, the ticker,
// dates), a mask over it.
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from 'playwright/test';

const API = (process.env.VISUAL_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
const NOW = new Date('2026-11-22T12:00:00Z');
const SIZES = {
  1440: { width: 1440, height: 900 },
  1024: { width: 1024, height: 768 },
  390: { width: 390, height: 844 },
} as const;
type Width = keyof typeof SIZES;

/** The live parts of a page: the WebGL map (unless `canvas: false`), the ticker, the clock. */
const liveMasks = (page: Page, { canvas = true } = {}) => [
  ...(canvas ? [page.locator('canvas')] : []),
  page.locator('.ticker, .wc-ticker, [class*="ticker"]'),
  page.locator('time, [data-live], .live-clock'),
];

async function prepare(page: Page, width: Width, storage: Record<string, string> = {}) {
  await page.setViewportSize(SIZES[width]);
  // A fake clock: Date, timers and requestAnimationFrame follow it, so settle() can stop time
  await page.clock.install({ time: NOW });
  await page.addInitScript((kv) => {
    try {
      for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v);
      // Sound off, no first-run coach: the same page for every run
      localStorage.setItem('worldconflict.sound', JSON.stringify({ muted: true }));
    } catch {}
  }, storage);
}

/** Let the page run for `ms`, then stop time: the fake clock pauses
 *  (JS animations, timers and rAF freeze), SVG SMIL animations are paused at a fixed time. */
async function settle(page: Page, ms = 600, fastForward = true) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
  // Fast-forward 8 s of page time so camera flights and timed transitions finish even when the
  // machine is slow, then stop the clock. The reveal opts out: its first stage auto-advances.
  if (fastForward) await page.clock.runFor(8000);
  // Pause one page-second ahead (a long jump would fire every pending timer at once). On a busy
  // machine the page clock can pass that point before the call lands: try again further ahead.
  for (const ahead of [1000, 3000, 8000]) {
    try {
      await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + ahead));
      break;
    } catch (e) {
      if (ahead === 8000) throw e;
    }
  }
  await page.evaluate(() => {
    for (const svg of document.querySelectorAll('svg')) {
      svg.pauseAnimations?.();
      svg.setCurrentTime?.(10);
    }
  });
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------------------------
// Dev gallery routes (fixtures, no live data)
// ---------------------------------------------------------------------------------------------

test.describe('galleries', () => {
  test('feel gallery (#scenes/feel)', async ({ page }) => {
    await prepare(page, 1440);
    await page.goto('/#scenes/feel');
    await settle(page, 1500);
    await expect(page).toHaveScreenshot('gallery-feel-1440.png', { mask: liveMasks(page) });
  });

  test('moments gallery (#moments)', async ({ page }) => {
    await prepare(page, 1440);
    await page.goto('/#moments');
    await settle(page, 1500);
    await expect(page).toHaveScreenshot('gallery-moments-1440.png', { mask: liveMasks(page) });
  });

  for (const width of [1440, 390] as const) {
    test(`orders gallery (#orders) ${width}`, async ({ page }) => {
      await prepare(page, width);
      await page.goto('/#orders');
      await page.locator('.og-h2').first().waitFor({ timeout: 30_000 });
      await settle(page, 2000);
      await expect(page).toHaveScreenshot(`gallery-orders-${width}.png`, { mask: liveMasks(page) });
    });
  }

  const stages = ['0', '1', '2', '3', '4', '5', '6', '7', 'report'];
  for (const stage of stages) {
    test(`reveal demo stage ${stage} 1440`, async ({ page }) => {
      await prepare(page, 1440);
      await page.goto(`/#reveal-demo/${stage}`);
      await page.locator('.rv-root').first().waitFor({ timeout: 30_000 });
      await settle(page, 1500, false);
      await expect(page).toHaveScreenshot(`reveal-${stage}-1440.png`, { mask: liveMasks(page) });
    });
  }
  for (const stage of ['0', '7']) {
    test(`reveal demo stage ${stage} 390`, async ({ page }) => {
      await prepare(page, 390);
      await page.goto(`/#reveal-demo/${stage}`);
      await page.locator('.rv-root').first().waitFor({ timeout: 30_000 });
      await settle(page, 1500, false);
      await expect(page).toHaveScreenshot(`reveal-${stage}-390.png`, { mask: liveMasks(page) });
    });
  }
});

// ---------------------------------------------------------------------------------------------
// Title screen: the daily flashpoint is pinned (the server picks it by date) and the globe masked
// ---------------------------------------------------------------------------------------------

async function pinDaily(page: Page) {
  await page.route('**/api/scenarios', async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.daily = { date: '2026-11-22', flashpointId: 'hormuz-convoy', countryId: 'USA', title: 'Hormuz Convoy' };
    await route.fulfill({ response: res, json: body });
  });
}

test.describe('title', () => {
  for (const width of [1440, 390] as const) {
    test(`title screen ${width}`, async ({ page }) => {
      await prepare(page, width, { 'worldconflict.guest': `guest-visual-title-${width}` });
      await pinDaily(page);
      await page.goto('/');
      await page.getByRole('button', { name: /^Take office/i }).first().waitFor({ timeout: 30_000 });
      await settle(page, 2500);
      // The globe (camera, label placement) settles at a machine-dependent moment: hide it and its
      // pins, compare everything around it. The globe has its own acceptance script (worldmap.mjs).
      await expect(page).toHaveScreenshot(`title-${width}.png`, {
        mask: liveMasks(page, { canvas: false }),
        stylePath: fileURLToPath(new URL('./hide-globe.css', import.meta.url)),
      });
    });
  }
});

// ---------------------------------------------------------------------------------------------
// Month 1 desk from a fixed seed: Hormuz Convoy as the United States, seed 4242
// ---------------------------------------------------------------------------------------------

test.describe('desk', () => {
  for (const width of [1440, 1024, 390] as const) {
    test(`month 1 desk ${width}`, async ({ page, request }) => {
      const guest = `guest-visual-${width}`;
      const res = await request.post(`${API}/new-game`, {
        data: { playerCountryId: 'USA', flashpointId: 'hormuz-convoy', mode: 'FLASHPOINT', seed: 4242, playerId: guest, saveName: 'Visual regression' },
      });
      const data = await res.json();
      expect(data.success, JSON.stringify(data).slice(0, 300)).toBe(true);
      await prepare(page, width, { 'worldconflict.guest': guest, 'worldconflict.lastSave': data.saveId });
      await pinDaily(page);
      await page.goto('/');
      await page.getByRole('button', { name: /^Continue/i }).first().click({ timeout: 30_000 });
      // Phones keep Execute for the review screen (AC-21): wait for the month's Thing
      await page.locator('[data-region="item"]').first().waitFor({ timeout: 30_000 });
      await settle(page, 2500);
      await expect(page).toHaveScreenshot(`desk-m1-${width}.png`, { mask: liveMasks(page) });
    });
  }

  // QA3-S2-1: the month 2 desk shows "Orders to consider" (the month 1 desk hides it), where the
  // shared order card was crushed to one letter per line. Month 1 is resolved with no orders and
  // the default answers, so month 2 is the same every run. Iteration 4 (D-80): the order ideas are
  // the month's "Your own orders" thing ("full": Everything with the List as a column; "focus" on
  // the phone: the thing opened from See all).
  for (const [width, view] of [[1440, 'full'], [390, 'focus']] as const) {
    test(`month 2 desk ${view} ${width}`, async ({ page, request }) => {
      const guest = `guest-visual-m2-${width}`;
      const res = await request.post(`${API}/new-game`, {
        data: { playerCountryId: 'USA', flashpointId: 'hormuz-convoy', mode: 'FLASHPOINT', seed: 4242, playerId: guest, saveName: 'Visual regression' },
      });
      const data = await res.json();
      expect(data.success, JSON.stringify(data).slice(0, 300)).toBe(true);
      const turn = await (await request.post(`${API}/turn`, { data: { saveId: data.saveId, playerActions: [], decisions: [] } })).json();
      expect(turn.success, JSON.stringify(turn).slice(0, 300)).toBe(true);
      await prepare(page, width, { 'worldconflict.guest': guest, 'worldconflict.lastSave': data.saveId });
      await pinDaily(page);
      await page.goto('/');
      await page.getByRole('button', { name: /^Continue/i }).first().click({ timeout: 30_000 });
      await page.locator('[data-region="item"]').first().waitFor({ timeout: 30_000 });
      if (view === 'full') await page.getByRole('button', { name: 'Everything' }).first().click();
      else await page.locator('.see-all').first().click();
      await page.locator('[data-agenda-item="own"]').first().click();
      await page.locator('section.advisors').first().waitFor({ timeout: 10_000 });
      await settle(page, 2500);
      await expect(page).toHaveScreenshot(`desk-m2-${view}-${width}.png`, { mask: liveMasks(page) });
    });
  }
});

// ---------------------------------------------------------------------------------------------
// Iteration 4 layout (design-layout.md WP-A6, WP-L2): desk month 1, desk month 4 and Map month 4 at
// 1366x768, 1920x1080 and the CEO's 3440x1440; the result card and the paper at 1920x1080 and
// 3440x1440. Hormuz Convoy as the United States, seed 4242; month 4 after three months resolved
// with no orders and the default answers (7 recommended). The coach is finished so it covers nothing.
// ---------------------------------------------------------------------------------------------

const LAYOUT = { '1366x768': { width: 1366, height: 768 }, '1920x1080': { width: 1920, height: 1080 }, '3440x1440': { width: 3440, height: 1440 } } as const;

async function openMonth(page: Page, request: import('playwright/test').APIRequestContext, size: keyof typeof LAYOUT, months: number, tag: string) {
  const guest = `guest-visual-layout-${tag}-${size}`;
  const res = await request.post(`${API}/new-game`, {
    data: { playerCountryId: 'USA', flashpointId: 'hormuz-convoy', mode: 'FLASHPOINT', seed: 4242, playerId: guest, saveName: 'Visual regression' },
  });
  const data = await res.json();
  expect(data.success, JSON.stringify(data).slice(0, 300)).toBe(true);
  for (let i = 0; i < months; i++) {
    const turn = await (await request.post(`${API}/turn`, { data: { saveId: data.saveId, playerActions: [], decisions: [] } })).json();
    expect(turn.success, JSON.stringify(turn).slice(0, 300)).toBe(true);
  }
  await page.setViewportSize(LAYOUT[size]);
  await page.clock.install({ time: NOW });
  await page.addInitScript((kv) => {
    try {
      for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v);
      localStorage.setItem('worldconflict.sound', JSON.stringify({ muted: true }));
      localStorage.setItem('worldconflict.coach', 'done');
    } catch {}
  }, { 'worldconflict.guest': guest, 'worldconflict.lastSave': data.saveId });
  await pinDaily(page);
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue/i }).first().click({ timeout: 30_000 });
  await page.locator('[data-region="item"]').first().waitFor({ timeout: 30_000 });
}

test.describe('layout', () => {
  for (const size of Object.keys(LAYOUT) as Array<keyof typeof LAYOUT>) {
    for (const [state, months] of [['desk-m1', 0], ['desk-m4', 3], ['map-m4', 3]] as const) {
      test(`${state} ${size}`, async ({ page, request }) => {
        await openMonth(page, request, size, months, state);
        if (state === 'map-m4') {
          await page.keyboard.press('m');
          await page.locator('.map-month').first().waitFor({ timeout: 10_000 });
        }
        await settle(page, 2500);
        // Map mode: the globe (camera, labels) is hidden, not masked, so the panels over it are compared
        await expect(page).toHaveScreenshot(`layout-${state}-${size}.png`, state === 'map-m4'
          ? { mask: liveMasks(page, { canvas: false }), style: '.maplibregl-canvas, .maplibregl-marker, .maplibregl-popup, .wcm { visibility: hidden !important; }' }
          : { mask: liveMasks(page) });
      });
    }
  }
  for (const size of ['1920x1080', '3440x1440'] as const) {
    for (const state of ['result', 'paper'] as const) {
      test(`${state} ${size}`, async ({ page, request }) => {
        await openMonth(page, request, size, 0, state);
        await page.getByRole('button', { name: /^Choose all recommended/ }).first().click();
        // A fresh month ignores Execute for 900 ms (useExecute's double-press guard)
        await page.waitForTimeout(1500);
        await page.getByRole('button', { name: /Execute month/ }).first().click();
        await page.locator('.result-card .rc-next').first().waitFor({ timeout: 75_000 });
        if (state === 'paper') {
          await page.getByRole('button', { name: /Read the paper/ }).first().click();
          await page.locator('.paper-overlay').first().waitFor({ timeout: 10_000 });
        }
        await settle(page, 2500);
        await expect(page).toHaveScreenshot(`layout-${state}-${size}.png`, { mask: liveMasks(page) });
      });
    }
  }
});
