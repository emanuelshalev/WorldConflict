import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///C:/MyData/git/WorldConflict/node_modules/playwright/index.mjs';
import { pinSeat } from 'file:///C:/MyData/git/WorldConflict/devloop/instances/world-conflict/scenarios-qa/regressions/_lib.mjs';

export const SHOTS = 'C:/MyData/git/WorldConflict/devloop/instances/world-conflict/runs/iter-04/design-rereview-your-call';
export const API = 'http://localhost:8080/api';
export const BASE = 'http://localhost:5173/';
export const SCRATCH = 'C:/Users/emanu/AppData/Local/Temp/claude/d3ee1a5a4c6f8003/c790e4f0-25ab-45ad-bcda-a1bb0eac880c/scratchpad/rereview-yc';

export const SEATS = {
  usa: { flashpointId: 'hormuz-convoy', countryId: 'USA', title: 'Hormuz Convoy', seed: 4242 },
  chn: { flashpointId: 'quarantine', countryId: 'CHN', title: 'Quarantine', seed: 4242 },
  ukr: { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' },
  ind: { flashpointId: 'water-war', countryId: 'IND', title: 'Water War', seed: 4242 },
};

export function device(w, h) {
  if (w < 600) return { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  return { viewport: { width: w, height: h } };
}

export async function start({ seat, w, h, chief = false, tag }) {
  const prof = path.join(SCRATCH, 'profiles', tag);
  fs.rmSync(prof, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(prof, device(w, h));
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await pinSeat(page, seat);
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  if (chief) await page.addInitScript(() => localStorage.setItem('worldconflict.chiefCalls', 'on'));
  await page.reload();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /^Take office/i }).first().click({ timeout: 15000 });
  const exec = page.getByRole('button', { name: /Execute month/i }).first();
  const t0 = Date.now();
  while (!(await exec.click({ trial: true, timeout: 600 }).then(() => true, () => false))) {
    if (Date.now() - t0 > 30000) throw new Error('desk did not open');
    for (const re of [/^(Take office|Begin|Start)/i]) await page.getByRole('button', { name: re }).first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(1000);
  return { ctx, page, errors };
}

export async function shot(page, name, full = false) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, `${name}.jpg`), type: 'jpeg', quality: 70, fullPage: full });
}

export const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
