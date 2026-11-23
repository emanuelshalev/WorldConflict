// Phone: scroll the open call's badge into view and look. node phone.mjs <seat> <w> <h>
import fs from 'node:fs';
import path from 'node:path';
import { SCRATCH, SEATS, clean, shot, start } from './lib.mjs';

const [seatKey, W, H] = process.argv.slice(2);
const w = Number(W), h = Number(H);
const tag = `${seatKey}-${w}x${h}`;
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const { ctx, page: p, errors } = await start({ seat: SEATS[seatKey], w, h, tag: `ph-${tag}` });
const look = async (name) => {
  const r = await p.evaluate(() => {
    const b = document.querySelector('.sel-badge');
    if (!b) return null;
    const box = b.getBoundingClientRect();
    const st = getComputedStyle(b);
    const cx = Math.min(innerWidth - 2, box.left + box.width / 2), cy = box.top + box.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    const parentClip = (() => { let e = b.parentElement; while (e) { const s = getComputedStyle(e); if (/(hidden|auto|scroll|clip)/.test(s.overflowX)) return `${e.tagName}.${String(e.className).slice(0, 30)} w${Math.round(e.getBoundingClientRect().width)}`; e = e.parentElement; } return ''; })();
    return { text: b.textContent.replace(/\s+/g, ' ').trim(), top: Math.round(box.top), bottom: Math.round(box.bottom), left: Math.round(box.left), right: Math.round(box.right), vw: innerWidth, vh: innerHeight, whiteSpace: st.whiteSpace, scrollW: b.scrollWidth, clientW: b.clientWidth, hit: hit ? `${hit.tagName}.${String(hit.className).slice(0, 40)}` : '', inBadge: hit ? b.contains(hit) : false, clipParent: parentClip, row: (() => { const r = b.parentElement.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), sw: b.parentElement.scrollWidth, cw: b.parentElement.clientWidth }; })() };
  });
  say(`${name}: ${JSON.stringify(r)}`);
};
try {
  for (let m = 1; m <= 2; m++) {
    await look(`m${m} initial`);
    await p.evaluate(() => document.querySelector('.sel-badge')?.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(600);
    await shot(p, `phone-${tag}-m${m}-badge`);
    await look(`m${m} scrolled`);
    // the option cards below
    await p.evaluate(() => document.querySelector('.sel-badge')?.scrollIntoView({ block: 'start' }));
    await p.waitForTimeout(400);
    await shot(p, `phone-${tag}-m${m}-cards`);
    // the bottom bar sheet
    if (m === 2) {
      const bar = p.locator('.ex-sheet-toggle, [aria-label*="decided"], button:has-text("decided")').first();
      if (await bar.click({ timeout: 2000 }).then(() => true, () => false)) {
        await p.waitForTimeout(800);
        await shot(p, `phone-${tag}-m2-sheet`);
        const t = clean(await p.locator('body').innerText());
        const i = t.indexOf('This month you will');
        say(`sheet: ${i >= 0 ? t.slice(i, i + 400) : t.slice(0, 200)}`);
        const sa = p.getByRole('button', { name: /^Accept all recommended/i }).first();
        if (await sa.isVisible().catch(() => false)) {
          await sa.scrollIntoViewIfNeeded().catch(() => {});
          await sa.click().catch(() => {});
          await p.waitForTimeout(800);
          const st = await p.locator('.sp-main').first().scrollIntoViewIfNeeded().catch(() => {});
          await shot(p, `phone-${tag}-m2-sheet-after-accept`);
          say(`after accept: ${clean((await p.locator('.sp-main').allInnerTexts().catch(() => [])).join(' | '))}`);
        }
      }
      break;
    }
    await p.getByRole('button', { name: /Execute month/i }).first().click({ timeout: 12000 });
    const next = p.getByRole('button', { name: /^Next month/i }).first();
    await next.waitFor({ timeout: 40000 });
    await shot(p, `phone-${tag}-m1-report`);
    for (let i = 0; i < 3 && (await next.isVisible().catch(() => false)); i++) { await next.click().catch(() => {}); await p.waitForTimeout(1500); }
    await p.waitForTimeout(1500);
  }
} catch (e) { say(`THREW ${e.message.split('\n')[0]}`); await shot(p, `phone-${tag}-fail`); }
say(`errors: ${errors.slice(0, 3).join(' | ')}`);
fs.writeFileSync(path.join(SCRATCH, `phone-${tag}.txt`), log.join('\n'));
await ctx.close();
