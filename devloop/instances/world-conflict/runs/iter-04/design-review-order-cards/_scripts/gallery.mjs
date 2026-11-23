// Orders gallery (#orders) at every size: full page plus section crops. node gallery.mjs <desktop|tablet|phone> <evidenceDir>
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../../../../../../kit/kit.mjs';
const device = process.argv[2];
const ev = path.resolve(process.argv[3]);
const SIZES = { desktop: [[3440, 1440, '-CEO'], [2560, 1440, ''], [1920, 1080, ''], [1440, 900, ''], [1366, 768, '']], tablet: [[1024, 768, '']], phone: [[390, 844, '']] }[device];
const out = path.join(process.env.TEMP, `wc-dr-gal-${device}`);
fs.rmSync(path.join(out, '.profile'), { recursive: true, force: true });
const s = await launch({ variant: `gal-${device}`, device: device === 'desktop' ? '3440x1440' : device, out, base: 'http://localhost:5173/#orders' });
const p = s.page;
const lines = [];
try {
  await p.goto('http://localhost:5173/#orders');
  await p.waitForSelector('[data-og=states] [data-order-id="spy"][data-order-state]', { timeout: 30000 });
  await p.waitForTimeout(1500);
  for (const [w, h, l] of SIZES) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(900);
    const tag = `${w}x${h}${l}`;
    await p.screenshot({ path: path.join(ev, `gallery-full-${tag}.jpg`), type: 'jpeg', quality: 60, fullPage: true, scale: 'css' });
    for (const sec of ['states', 'rows', 'confirm', 'map', 'pictograms', 'dossier']) {
      const el = p.locator(`[data-og=${sec}]`).first();
      if (await el.count()) await el.screenshot({ path: path.join(ev, `gallery-${sec}-${tag}.jpg`), type: 'jpeg', quality: 75 }).catch((e) => lines.push(`${tag} ${sec}: ${e.message.split('\n')[0]}`));
    }
    const f = await p.evaluate(() => {
      const small = [];
      for (const el of document.querySelectorAll('.ord-wrap button, .ord-confirm button, .ord-wrap a')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.width < 44 || r.height < 44) small.push(`${(el.className || el.tagName).toString().split(' ')[0]} "${(el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 36)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      const wrapped = [];
      for (const el of document.querySelectorAll('.ord-fix, .ord-act, .ord-confirm button')) {
        const r = el.getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 18;
        if (r.width && r.height > lh * 2.2 + 16) wrapped.push(`"${el.innerText.trim().replace(/\s+/g, ' ').slice(0, 50)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      const counts = {};
      for (const s of small) counts[s] = (counts[s] ?? 0) + 1;
      return { hscroll: document.documentElement.scrollWidth > innerWidth, small: Object.entries(counts).map(([k, n]) => `${n}x ${k}`), wrapped: [...new Set(wrapped)] };
    });
    lines.push(`## ${tag}\nhorizontal page scroll: ${f.hscroll}\ncontrols under 44 px (count x control): ${f.small.length}\n  ${f.small.join('\n  ')}\nbuttons whose label wraps to 2+ lines: ${f.wrapped.length}\n  ${f.wrapped.join('\n  ')}`);
  }
  lines.push(`page errors: ${s.errors.slice(0, 5).join(' | ') || 'none'}`);
} catch (e) {
  lines.push(`THREW ${e.message.split('\n')[0]}`);
} finally {
  fs.writeFileSync(path.join(ev, `facts-gallery-${device}.txt`), `${lines.join('\n')}\n`);
  await s.close();
}
