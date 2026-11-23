// Orders gallery (#orders) at 1440x900 and 390x844: full page, section crops, queued stamp vs seal, "free" count.
//   node gallery2.mjs <evidenceDir>
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../../../../../../kit/kit.mjs';
const ev = path.resolve(process.argv[2]);
const out = path.join(process.env.TEMP, 'wc-rr-gal');
fs.rmSync(path.join(out, '.profile'), { recursive: true, force: true });
const s = await launch({ variant: 'rr-gal', device: '1440x900', out, base: 'http://localhost:5173/#orders' });
const p = s.page;
const lines = [];
try {
  await p.goto('http://localhost:5173/#orders');
  await p.waitForSelector('[data-og=states] [data-order-id="spy"][data-order-state]', { timeout: 30000 });
  await p.waitForTimeout(1500);
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(900);
    const tag = `${w}x${h}`;
    await p.screenshot({ path: path.join(ev, `gallery-full-${tag}.jpg`), type: 'jpeg', quality: 60, fullPage: true, scale: 'css' });
    for (const sec of ['states', 'rows', 'confirm', 'map', 'dossier']) {
      const el = p.locator(`[data-og=${sec}]`).first();
      if (await el.count()) await el.screenshot({ path: path.join(ev, `gallery-${sec}-${tag}.jpg`), type: 'jpeg', quality: 75 }).catch((e) => lines.push(`${tag} ${sec}: ${e.message.split('\n')[0]}`));
    }
    const f = await p.evaluate(() => {
      const r = (e) => e.getBoundingClientRect();
      const overlap = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
      const stamps = [...document.querySelectorAll('.ord-wrap .wc-card-stamp')].map((st) => {
        const w = st.closest('.ord-wrap');
        const seals = [...w.querySelectorAll('.wc-card-seal, .ord-seal, [class*=seal]')].filter((x) => r(x).width > 0 && !x.contains(st));
        const sr = r(st);
        const hit = seals.filter((x) => overlap(sr, r(x)));
        return `${w.dataset.orderId}${w.classList.contains('ord-compact') ? '(compact)' : ''} stamp ${Math.round(sr.left)},${Math.round(sr.top)} ${Math.round(sr.width)}x${Math.round(sr.height)} overlaps seal: ${hit.length ? hit.map((x) => x.className.toString().split(' ')[0]).join('/') : 'no'}`;
      });
      const free = [...document.querySelectorAll('.ord-wrap')].filter((w) => r(w).width > 0).map((w) => {
        const n = (w.innerText.match(/\bfree\b/gi) ?? []).length;
        return n > 1 ? `${w.dataset.orderId}${w.closest('[data-og]') ? `@${w.closest('[data-og]').dataset.og}` : ''}: "free" x${n}` : null;
      }).filter(Boolean);
      const wrapped = [];
      for (const el of document.querySelectorAll('.ord-fix, .ord-act, .ord-confirm button')) {
        const rr = el.getBoundingClientRect();
        if (!rr.width) continue;
        const range = document.createRange();
        range.selectNodeContents(el);
        const tops = new Set([...range.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)));
        if (tops.size > 1) wrapped.push(`"${el.innerText.trim().replace(/\s+/g, ' ').slice(0, 50)}" ${Math.round(rr.width)}x${Math.round(rr.height)} lines ${tops.size}`);
      }
      return { hscroll: document.documentElement.scrollWidth > innerWidth, stamps, free, wrapped: [...new Set(wrapped)] };
    });
    lines.push(`## ${tag}\nhorizontal page scroll: ${f.hscroll}\nORDERED stamps:\n  ${f.stamps.join('\n  ')}\ncards with "free" more than once: ${f.free.length}\n  ${f.free.join('\n  ')}\nbutton labels on 2+ lines: ${f.wrapped.length}\n  ${f.wrapped.join('\n  ')}`);
    // close-up of the first queued tile
    const q = p.locator('.ord-wrap[data-order-state="queued"]').first();
    if (await q.count()) await q.screenshot({ path: path.join(ev, `gallery-queued-tile-${tag}.jpg`), type: 'jpeg', quality: 80 }).catch(() => {});
  }
  lines.push(`page errors: ${s.errors.slice(0, 5).join(' | ') || 'none'}`);
} catch (e) {
  lines.push(`THREW ${e.message.split('\n')[0]}`);
} finally {
  fs.writeFileSync(path.join(ev, 'facts-gallery.txt'), `${lines.join('\n')}\n`);
  await s.close();
}
