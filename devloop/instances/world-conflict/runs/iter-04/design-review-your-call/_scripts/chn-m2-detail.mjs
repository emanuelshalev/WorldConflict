// Design review "Your call": Quarantine as China, month 2. Full desk (left rail Mission list with
// five goals, Orders to consider: is Court Taiwan offered?) at desktop sizes; on the phone the
// plan sheet (Recommended) and the Orders to consider list.
//   node chn-m2-detail.mjs <evidenceDir> <device> <WxH,...>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const DEVICE = process.argv[3];
const SIZES = process.argv[4].split(',').map((s) => s.split('x').map(Number));
const SEAT = { flashpointId: 'quarantine', countryId: 'CHN', title: 'Quarantine', seed: 4242 };
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `yc-chn2-${DEVICE}`, device: DEVICE, out: path.join(process.env.TEMP ?? '/tmp', `wc-yc-chn2-${DEVICE}`), base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
const txt = (q) => p.evaluate((q) => [...document.querySelectorAll(q)].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean), q);
await s.click(/Execute month/i, { timeout: 12000 });
await p.locator('.result-card .rc-next').first().waitFor({ state: 'visible', timeout: 30000 });
const exec = p.getByRole('button', { name: /Execute month/i }).first();
for (let i = 0; i < 14; i++) {
  if (await exec.click({ trial: true, timeout: 800 }).then(() => true, () => false)) break;
  const moved = (await s.click(/To your desk|Next month|Continue|Done/i, { timeout: 800 })) || (await p.locator('button.primary, .wc-btn.primary').last().click({ timeout: 1200 }).then(() => true, () => false));
  if (!moved) await s.key('Escape');
}
await p.waitForTimeout(2500);
const body = await p.evaluate(() => document.body.innerText);
log(`"Court Taiwan" anywhere on the month 2 desk: ${/Court Taiwan/.test(body)}; "Taiwan" mentions: ${(body.match(/[^\n]{0,60}Taiwan[^\n]{0,60}/g) ?? []).slice(0, 8).join(' | ')}`);
for (const [w, h] of SIZES) {
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(800);
  if (w >= 1100) {
    await p.getByRole('tab', { name: /Full desk/i }).first().click().catch(() => {});
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(ev, `chn-m2-full-${w}x${h}.jpg`), type: 'jpeg', quality: 70 });
    log(`=== ${w}x${h} full desk`);
    const mission = await p.evaluate(() => {
      const nav = document.querySelector('nav.navigator');
      if (!nav) return 'no navigator';
      const r = [...nav.querySelectorAll('*')].find((e) => /^Mission/.test(e.innerText ?? '') && e.children.length > 1);
      return (r ?? nav).innerText.replace(/\s+/g, ' ').slice(0, 700);
    });
    log(`navigator: ${mission}`);
    const rows = await p.evaluate(() => [...document.querySelectorAll('nav.navigator a, nav.navigator button, nav.navigator li')].slice(0, 8).map((e) => { const b = e.getBoundingClientRect(); return `${e.innerText.replace(/\s+/g, ' ').slice(0, 60)} [h${Math.round(b.height)} sw${e.scrollWidth} cw${e.clientWidth}]`; }));
    log(`navigator rows: ${rows.join(' || ')}`);
    log(`orders to consider: ${(await txt('.desk-detail h2, .desk-detail h3, .desk-detail .ord-title, .desk-detail [class*="title"]')).slice(0, 14).join(' || ')}`);
  } else {
    await p.screenshot({ path: path.join(ev, `chn-m2-focus-${w}x${h}.jpg`), type: 'jpeg', quality: 70 });
    // The bottom bar opens the plan sheet with the Recommended list
    const bar = p.locator('.bar-plan, .plan-btn, button:has-text("decided")').first();
    await bar.click().catch(() => log('no plan bar'));
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(ev, `chn-m2-sheet-${w}x${h}.jpg`), type: 'jpeg', quality: 70 });
    log(`=== ${w}x${h} sheet: ${(await txt('[data-staff-picks]')).join(' ').slice(0, 900)}`);
    const geo = await p.evaluate(() => [...document.querySelectorAll('[data-staff-picks] .sp-item, .sp-main')].map((e) => { const b = e.getBoundingClientRect(); return `${e.className.split(' ')[0]} y${Math.round(b.top)}..${Math.round(b.bottom)}`; }).join(' | '));
    log(`sheet geometry (viewport ${h}): ${geo}`);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
  }
}
log(`page errors: ${s.errors.join(' | ') || 'none'}`);
fs.writeFileSync(path.join(ev, `probe-chn-m2-detail-${DEVICE}.txt`), out.join('\n'));
await s.close();
