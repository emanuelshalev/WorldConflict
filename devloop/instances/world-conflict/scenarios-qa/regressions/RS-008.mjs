// RS-008 (CEO playtest of iter-3 on a large monitor, D-80): "with a wide screen there is a central
// piece with wasted space on the sides ... it is unclear that such things exist and a player may
// miss them ... that section [political capital] is scrolling within a tiny space". The layout
// audit (devloop/kit/layout-audit.mjs, config ../../layout-audit.config.mjs) measures inner scroll
// regions, controls and month items below the fold, page scroll, used width, cut-off and covered
// controls, and whether every listed region is on screen or collapsed into a visible counted summary.
// States: month 1 desk, the result card after Execute, month 2 Desk mode, month 2 Map mode.
// Viewports: 3440x1440 (the CEO's screen, 100% zoom, reported first as "CEO"), 390x844 (phone),
// 1024x768 (tablet), and one desktop session resized through 1366x768, 1440x900, 1920x1080,
// 2560x1440, 3440x1440 and 3840x2160.
// Seat: the control seed code CA-USA-OLIV1 (scenarios.yaml control: olivia), never today's daily.
// Registry status: open (expected to fail until the D-80 layout ships; the iter-3 baseline is in
// the registry note). Artifacts: <outDir>/layout-audit.json, layout-audit.txt, screenshots.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/RS-008.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { auditViewports, printAudit, writeReport } from '../../../../kit/layout-audit.mjs';
import cfg from '../../layout-audit.config.mjs';
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('RS-008');
const SEAT = { flashpointId: 'caracas-after-maduro', countryId: 'USA', title: 'Caracas After Maduro', seedCode: 'CA-USA-OLIV1' };

const SESSIONS = [
  { device: 'phone', viewports: cfg.viewports.filter((v) => v.width === 390) },
  { device: 'tablet', viewports: cfg.viewports.filter((v) => v.width === 1024) },
  { device: 'desktop', viewports: cfg.viewports.filter((v) => v.width >= 1366) },
];

/** Close transient layers a player would dismiss (none expected; the coach bubble stays: it is part of the layout). */
async function settle(page) {
  await page.waitForTimeout(300);
}

async function toResult(s) {
  const p = s.page;
  await s.click(/^Accept all recommended/i, { timeout: 1500 });
  if (!(await s.click(/Execute month/i, { timeout: 12000 }))) throw new Error('Execute month not clickable');
  await p.locator('.result-card .rc-next').first().waitFor({ state: 'visible', timeout: 30000 });
  await p.waitForTimeout(1500);
}

async function toDesk(s) {
  const p = s.page;
  const exec = p.getByRole('button', { name: /Execute month/i }).first();
  for (let i = 0; i < 14; i++) {
    if (await exec.click({ trial: true, timeout: 800 }).then(() => true, () => false)) break;
    const moved =
      (await s.click(/To your desk|Next month|Continue|Done/i, { timeout: 800 })) ||
      (await p
        .locator('button.primary, .wc-btn.primary')
        .last()
        .click({ timeout: 1200 })
        .then(() => true, () => false));
    if (!moved) await s.key('Escape');
  }
  await p.waitForTimeout(1200);
}

async function toMap(page) {
  await page.keyboard.press('m');
  await page.waitForTimeout(800);
  if (!(await page.locator('.cmd-strip').isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /^Map\b/ }).first().click().catch(() => {});
    await page.waitForTimeout(800);
  }
  return page.locator('.cmd-strip').isVisible().catch(() => false);
}

const rows = [];
await run('RS-008', async (g, track) => {
  for (const { device, viewports } of SESSIONS) {
    const s = track(await startGame({ variant: `rs008-${device}`, device, out: path.join(out, device), base, seat: SEAT }));
    const shots = path.join(out, 'shots');
    const audit = async (name, config) => {
      const r = await auditViewports(s.page, { config, viewports, out: shots, name, before: settle });
      rows.push(...r);
      return r;
    };
    await audit('month-1', cfg.game);
    await toResult(s);
    await audit('result-card', cfg.result);
    await toDesk(s);
    await audit('month-2-desk', cfg.game);
    g.check(await toMap(s.page), `${device}: Map mode opens`);
    await audit('month-2-map', cfg.game);
    g.check(s.errors.length === 0, `${device}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
  // The CEO's screen first (every state), then by state and viewport width
  const order = ['month-1', 'result-card', 'month-2-desk', 'month-2-map'];
  rows.sort((a, b) => (a.label === 'CEO' ? 0 : 1) - (b.label === 'CEO' ? 0 : 1) || order.indexOf(a.name) - order.indexOf(b.name) || Number.parseInt(a.viewport, 10) - Number.parseInt(b.viewport, 10));
  writeReport(rows, out);
  printAudit(rows);
  for (const r of rows) g.check(r.violations.length === 0, `${r.name} ${r.viewport}${r.label ? ` ${r.label}` : ''}: ${r.violations.map((v) => v.rule).join(', ') || 'layout rules hold'}`);
});
