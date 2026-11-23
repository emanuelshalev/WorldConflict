// RC-2..RC-6. node misc.mjs <job>
import fs from 'node:fs';
import path from 'node:path';
import { SCRATCH, SEATS, clean, shot, start } from './lib.mjs';

const job = process.argv[2];
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const txt = (p, q) => p.evaluate((q) => [...document.querySelectorAll(q)].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean), q);
async function nextMonth(p) {
  await p.getByRole('button', { name: /Execute month/i }).first().click({ timeout: 12000 });
  const next = p.getByRole('button', { name: /^Next month/i }).first();
  await next.waitFor({ timeout: 40000 });
  for (let i = 0; i < 3 && (await next.isVisible().catch(() => false)); i++) { await next.click().catch(() => {}); await p.waitForTimeout(1500); }
  await p.waitForTimeout(1500);
}
async function openSettings(p) {
  const direct = p.locator('button[aria-label="Settings"]').first();
  if (await direct.isVisible().catch(() => false)) await direct.click();
  else {
    await p.locator('.hud button[aria-label*="enu" i], button[aria-label*="Menu" i], button[aria-label*="More" i]').first().click().catch(() => {});
    await p.waitForTimeout(500);
    await p.getByRole('button', { name: /Settings/i }).first().click().catch(() => p.getByText(/^Settings/).first().click().catch(() => {}));
  }
  await p.waitForTimeout(800);
  return p.locator('[role="dialog"][aria-label="Settings"]').isVisible().catch(() => false);
}

try {
  if (job === 'chn-orders') {
    const { ctx, page: p } = await start({ seat: SEATS.chn, w: 1440, h: 900, tag: 'chn-orders' });
    await nextMonth(p);
    const adv = p.locator('section.advisors').first();
    await adv.scrollIntoViewIfNeeded();
    await p.waitForTimeout(500);
    await shot(p, 'rc2-chn-m2-orders-1440x900');
    say(`heading: ${(await txt(p, 'section.advisors h3')).join(' | ')}`);
    say(`rows: ${(await txt(p, 'section.advisors .adv-list > *')).map((t) => t.slice(0, 120)).join(' || ')}`);
    say(`more: ${(await txt(p, 'section.advisors .adv-more')).join('|')}`);
    // Full desk: Orders to consider detail (RC-3 hint)
    await p.getByRole('tab', { name: /Full desk/i }).first().click().catch(() => p.getByRole('button', { name: /Full desk/i }).first().click().catch(() => {}));
    await p.waitForTimeout(900);
    const navItem = p.locator('nav.navigator').getByText(/Orders to consider/i).first();
    await navItem.click({ timeout: 3000 }).catch(() => say('no nav item Orders to consider'));
    await p.waitForTimeout(900);
    await shot(p, 'rc3-chn-m2-full-orders-detail-1440x900');
    say(`hint: ${(await txt(p, '.hint')).filter((t) => /staff propose/i.test(t)).join(' | ')}`);
    await ctx.close();
  }
  if (job === 'chn-phone') {
    for (const [w, h] of [[390, 844], [360, 740]]) {
      const { ctx, page: p } = await start({ seat: SEATS.chn, w, h, tag: `chn-ph-${w}` });
      await shot(p, `rc5-chn-m1-${w}x${h}`);
      const lines = await p.evaluate(() => [...document.querySelectorAll('.mission-goal-unit')].map((u) => { const rs = [...u.getClientRects()].map((r) => `${Math.round(r.left)}-${Math.round(r.right)}@${Math.round(r.top)}`); const pu = u.querySelector('.mission-goal-punct'); const pr = pu?.getBoundingClientRect(); return `${u.innerText.replace(/\s+/g, ' ')} [${rs.join(' ')}] punct ${pu ? `${Math.round(pr.left)}@${Math.round(pr.top)}` : '-'}`; }));
      say(`${w}: ${lines.join(' || ')}`);
      say(`${w}: docScrollW ${await p.evaluate(() => document.documentElement.scrollWidth)}`);
      await ctx.close();
    }
  }
  if (job === 'ind') {
    for (const [w, h] of [[1440, 900], [3440, 1440], [1024, 768]]) {
      const { ctx, page: p } = await start({ seat: SEATS.ind, w, h, tag: `ind-${w}` });
      const t = p.locator('.wc-card-tag').first();
      await t.scrollIntoViewIfNeeded().catch(() => {});
      await p.waitForTimeout(400);
      await shot(p, `rc6-ind-m1-${w}x${h}`);
      say(`${w}: tags ${(await txt(p, '.wc-card-tag')).join(' | ')}`);
      say(`${w}: badge ${(await txt(p, '.sel-badge')).join(' | ')}`);
      say(`${w}: backers ${(await txt(p, '[class*="back"]')).filter((x) => /Backed/.test(x)).join(' | ')}`);
      const geo = await p.evaluate(() => [...document.querySelectorAll('.wc-card-tag')].map((e) => { const r = e.getBoundingClientRect(); return `h${Math.round(r.height)} sw${e.scrollWidth} cw${e.clientWidth}`; }));
      say(`${w}: tag geo ${geo.join(' | ')}`);
      // More detail: backers
      await p.getByRole('button', { name: /^More/ }).first().click().catch(() => {});
      await p.waitForTimeout(600);
      say(`${w}: more-back ${(await txt(p, '.move-more-row')).map((x) => x.slice(0, 100)).join(' || ')}`);
      await ctx.close();
    }
  }
  if (job === 'settings') {
    for (const [w, h] of [[3440, 1440], [1440, 900], [1024, 768], [390, 844], [360, 740]]) {
      const { ctx, page: p } = await start({ seat: SEATS.usa, w, h, tag: `set-${w}` });
      const ok = await openSettings(p);
      say(`${w}: settings open ${ok}`);
      const row = p.locator('label.setting-row').filter({ hasText: /Chief of Staff make my calls/ }).first();
      await row.scrollIntoViewIfNeeded().catch(() => {});
      await p.waitForTimeout(400);
      await shot(p, `rc4-settings-${w}x${h}`);
      say(`${w}: ${clean(await row.innerText().catch(() => ''))}`);
      say(`${w}: staff row ${clean(await p.locator('label.setting-row').filter({ hasText: /Staff propose orders/ }).first().innerText().catch(() => ''))}`);
      say(`${w}: overflowX ${await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)}`);
      // turn it on mid-month and look at the desk (setting follows at once)
      if (w === 1440) {
        await row.click();
        await p.waitForTimeout(400);
        await p.keyboard.press('Escape');
        await p.waitForTimeout(600);
        await shot(p, 'rc4-settings-turned-on-midmonth-1440x900');
        say(`after turning on mid-month: badge ${(await txt(p, '.sel-badge')).join(' | ')}`);
      }
      await ctx.close();
    }
  }
} catch (e) { say(`THREW ${e.message.split('\n')[0]}`); }
fs.writeFileSync(path.join(SCRATCH, `misc-${job}.txt`), log.join('\n'));
