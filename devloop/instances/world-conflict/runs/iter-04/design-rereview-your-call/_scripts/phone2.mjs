// Phone: scroll vertically only, keep sideways scroll at 0. node phone2.mjs <seat> <w> <h> <months>
import fs from 'node:fs';
import path from 'node:path';
import { SCRATCH, SEATS, clean, shot, start } from './lib.mjs';

const [seatKey, W, H, M] = process.argv.slice(2);
const w = Number(W), h = Number(H), months = Number(M ?? 1);
const tag = `${seatKey}-${w}x${h}`;
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const { ctx, page: p, errors } = await start({ seat: SEATS[seatKey], w, h, tag: `ph2-${tag}` });
const vscroll = (sel) => p.evaluate((sel) => {
  const b = document.querySelector(sel);
  if (!b) return 'none';
  let e = b.parentElement;
  const out = [];
  while (e) {
    const s = getComputedStyle(e);
    if (e.scrollHeight > e.clientHeight + 2 && /(auto|scroll)/.test(s.overflowY)) {
      const r = b.getBoundingClientRect();
      e.scrollTop += r.top - innerHeight * 0.4;
      out.push(`${e.tagName}.${String(e.className).slice(0, 30)}`);
      break;
    }
    e = e.parentElement;
  }
  if (!out.length) { const r = b.getBoundingClientRect(); window.scrollBy(0, r.top - innerHeight * 0.4); out.push('window'); }
  for (const x of document.querySelectorAll('*')) if (x.scrollLeft) out.push(`scrollLeft ${x.className} ${x.scrollLeft}`);
  const r = b.getBoundingClientRect();
  out.push(`box ${Math.round(r.left)}-${Math.round(r.right)} top ${Math.round(r.top)} vw ${innerWidth}`);
  return out.join(' ; ');
}, sel);
try {
  for (let m = 1; m <= months; m++) {
    say(`m${m} ${await vscroll('.sel-badge')}`);
    await p.waitForTimeout(500);
    await shot(p, `phone-${tag}-m${m}-badge-v`);
    const sw = await p.evaluate(() => { const d = document.querySelector('.desk-stage'); return d ? { sw: d.scrollWidth, cw: d.clientWidth, ox: getComputedStyle(d).overflowX } : null; });
    say(`m${m} desk-stage ${JSON.stringify(sw)}`);
    if (m === months) break;
    await p.getByRole('button', { name: /Execute month/i }).first().click({ timeout: 12000 });
    const next = p.getByRole('button', { name: /^Next month/i }).first();
    await next.waitFor({ timeout: 40000 });
    for (let i = 0; i < 3 && (await next.isVisible().catch(() => false)); i++) { await next.click().catch(() => {}); await p.waitForTimeout(1500); }
    await p.waitForTimeout(1500);
  }
} catch (e) { say(`THREW ${e.message.split('\n')[0]}`); }
fs.writeFileSync(path.join(SCRATCH, `phone2-${tag}.txt`), log.join('\n'));
await ctx.close();
