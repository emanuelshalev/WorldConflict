// QA AC3 re-measure: the in-game globe diameter and where its top sits against the goal line,
// at 1920, 1440, 1024 and 390, with the map advisor row collapsed (default) and expanded.
//
//   node devloop/instances/world-conflict/scenarios-qa/globe-fit.mjs <outDir> [baseUrl]
//
// Prints one line per width and writes <outDir>/globe-fit.json plus a screenshot per width.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const out = process.argv[2] ?? '/tmp/playtest/globe-fit';
const base = (process.argv[3] ?? process.env.DEVLOOP_BASE_URL ?? 'http://localhost:5173/').replace(/#.*$/, '');
fs.mkdirSync(out, { recursive: true });
const SIZES = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1024, h: 768 },
  { w: 390, h: 844, phone: true },
];
const GPU = process.env.DEVLOOP_SOFTWARE_GL ? [] : ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'];
const browser = await chromium.launch({ args: GPU });
const results = [];

async function measure(p) {
  return p.evaluate(() => {
    const m = window.__wcMap;
    const c = m.getCenter();
    const a = m.project([c.lng - 90, 0]);
    const b = m.project([c.lng + 90, 0]);
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const box = m.getContainer().getBoundingClientRect();
    const pad = m.getPadding();
    // The disc centre on screen: the padded centre of the container
    const cy = box.top + pad.top + (box.height - pad.top - pad.bottom) / 2;
    const rect = (sel) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
    const goal = rect('.goal-line');
    const strip = rect('.cmd-strip');
    return {
      d: Math.round(d),
      discTop: Math.round(cy - d / 2),
      discBottom: Math.round(cy + d / 2),
      goalBottom: goal ? Math.round(goal.bottom) : null,
      stripTop: strip ? Math.round(strip.top) : null,
      stripH: strip ? Math.round(strip.height) : null,
    };
  });
}

for (const s of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1, hasTouch: !!s.phone, isMobile: !!s.phone });
  const p = await ctx.newPage();
  try {
    await p.goto(base);
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForFunction(() => !!window.__wcTitleMap, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.getByRole('radio', { name: /One Term/ }).click();
    await p.waitForTimeout(1500);
    await p.locator('.ts2-go').click();
    await p.waitForFunction(() => document.querySelector('.game'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const go = p.getByRole('button', { name: /Take office/ });
    if (await go.count()) await go.first().click({ timeout: 5000 }).catch(() => undefined);
    await p.waitForTimeout(800);
    const tab = p.getByRole('tab', { name: /Map/ });
    if (await tab.first().isVisible().catch(() => false)) await tab.first().click();
    else await p.evaluate(() => window.__wcStore?.getState().setDeskMode?.('map'));
    await p.waitForFunction(() => !!window.__wcMap, null, { timeout: 15000 });
    await p.waitForTimeout(2500);
    const closed = await measure(p);
    await p.screenshot({ path: path.join(out, `game-${s.w}.png`) });
    let open = null;
    const toggle = p.locator('.strip-tray-btn');
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await p.waitForTimeout(1500);
      open = await measure(p);
      await p.screenshot({ path: path.join(out, `game-${s.w}-advisors.png`) });
    }
    const r = { w: s.w, h: s.h, collapsed: closed, expanded: open };
    results.push(r);
    const clear = closed.goalBottom === null || closed.discTop >= closed.goalBottom - 12;
    console.log(
      `${s.w}x${s.h}: D ${closed.d}${s.w === 1920 ? (closed.d >= 900 ? ' (PASS, at least 900)' : ' (FAIL, needs 900)') : ''}, disc top ${closed.discTop} vs goal line bottom ${closed.goalBottom} (${clear ? 'clear' : 'UNDER the goal line'}), strip ${closed.stripH ?? '-'} px${open ? `; advisors open: D ${open.d}, strip ${open.stripH} px` : ''}`,
    );
  } catch (e) {
    console.log(`${s.w}: ERROR ${e.message.split('\n')[0]}`);
    results.push({ w: s.w, error: e.message });
  } finally {
    await ctx.close();
  }
}
fs.writeFileSync(path.join(out, 'globe-fit.json'), JSON.stringify(results, null, 2));
await browser.close();
