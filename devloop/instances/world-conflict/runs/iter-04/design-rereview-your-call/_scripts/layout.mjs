// Layout pass: seat, months 1-2, one size. node layout.mjs <seat> <w> <h> [on]
import fs from 'node:fs';
import path from 'node:path';
import { SCRATCH, SEATS, clean, shot, start } from './lib.mjs';

const [seatKey, W, H, mode] = process.argv.slice(2);
const w = Number(W), h = Number(H);
const chief = mode === 'on';
const tag = `${seatKey}-${w}x${h}${chief ? '-on' : ''}`;
const log = [];
const say = (s) => { console.log(s); log.push(s); };

const probe = (p) => p.evaluate(() => {
  const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
  const out = { vw: innerWidth, vh: innerHeight, scrollW: document.documentElement.scrollWidth, items: [], fixed: [] };
  const all = [...document.querySelectorAll('body *')];
  for (const el of all) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
    const t = clean(el.textContent);
    if (!/No answer yet|Still open|Recommended:|If you leave it/.test(own) && !(el.matches('.sel-badge, .sp-main-sub, .slot-text small') && /No answer|Still open|Recommended/.test(t))) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') continue;
    const cx = r.left + r.width / 2, cy = r.top + Math.min(r.height / 2, 10);
    const hit = cy >= 0 && cy < innerHeight ? document.elementFromPoint(cx, cy) : null;
    const covered = hit && !el.contains(hit) && !hit.contains(el) ? `${hit.tagName}.${String(hit.className).slice(0, 40)}` : '';
    const clipped = el.scrollWidth > el.clientWidth + 1 ? `scrollW ${el.scrollWidth} > ${el.clientWidth}` : '';
    out.items.push({ cls: String(el.className).slice(0, 40), text: t.slice(0, 120), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), inView: r.top >= 0 && r.bottom <= innerHeight, covered, clipped });
  }
  for (const el of all) {
    const st = getComputedStyle(el);
    if (st.position !== 'fixed' && st.position !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 16 || r.bottom < 0 || r.top > innerHeight) continue;
    out.fixed.push({ cls: String(el.className).slice(0, 40), pos: st.position, top: Math.round(r.top), bottom: Math.round(r.bottom), text: clean(el.textContent).slice(0, 60) });
  }
  return out;
});

const { ctx, page: p, errors } = await start({ seat: SEATS[seatKey], w, h, chief, tag });
try {
  for (let m = 1; m <= 2; m++) {
    await p.evaluate(() => window.scrollTo(0, 0));
    await shot(p, `lay-${tag}-m${m}`);
    const r = await probe(p);
    say(`\n== ${tag} month ${m}: vw ${r.vw} vh ${r.vh} docScrollW ${r.scrollW}`);
    for (const i of r.items) say(`  item ${JSON.stringify(i)}`);
    for (const f of r.fixed) say(`  fixed ${JSON.stringify(f)}`);
    if (w < 800) {
      // full page too
      await shot(p, `lay-${tag}-m${m}-full`, true);
    }
    if (m === 2) {
      // Accept all, then look again
      await p.getByRole('button', { name: /^Review \d+ recommended/i }).first().click({ timeout: 1500 }).catch(() => {});
      await p.waitForTimeout(500);
      const ok = await p.getByRole('button', { name: /^Accept all recommended/i }).first().click({ timeout: 2000 }).then(() => true, () => false);
      await p.waitForTimeout(800);
      say(`  accept all pressed ${ok}`);
      await shot(p, `lay-${tag}-m2-after-accept`);
      const r2 = await probe(p);
      for (const i of r2.items) say(`  after item ${JSON.stringify(i)}`);
      break;
    }
    await p.getByRole('button', { name: /Execute month/i }).first().click({ timeout: 12000 });
    const next = p.getByRole('button', { name: /^Next month/i }).first();
    await next.waitFor({ timeout: 40000 });
    for (let i = 0; i < 3 && (await next.isVisible().catch(() => false)); i++) { await next.click().catch(() => {}); await p.waitForTimeout(1500); }
    await p.waitForTimeout(1500);
  }
} catch (e) {
  say(`THREW ${e.message.split('\n')[0]}`);
  await shot(p, `lay-${tag}-fail`);
}
say(`errors: ${errors.slice(0, 3).join(' | ')}`);
fs.writeFileSync(path.join(SCRATCH, `lay-${tag}.txt`), log.join('\n'));
await ctx.close();
