// Review 4, caveat B: every confirmation face in the orders gallery (#orders) at 390x844 and
// 360x740 (phone profile): its height, the button row's height, whether it scrolls inside itself.
//   node gallery-faces.mjs <evidenceDir>
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../../../../../../kit/kit.mjs';

const ev = path.resolve(process.argv[2]);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const tmp = path.join(process.env.TEMP ?? '/tmp', 'wc-r4-galfaces');
fs.rmSync(path.join(tmp, '.profile'), { recursive: true, force: true });
const s = await launch({ variant: 'r4-galfaces', device: 'phone', out: tmp, base: 'http://localhost:5173/' });
const p = s.page;
for (const v of [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
]) {
  await p.setViewportSize(v);
  await p.goto('http://localhost:5173/#orders', { waitUntil: 'load' });
  await p.waitForTimeout(3500);
  const faces = await p.evaluate(() =>
    [...document.querySelectorAll('.ord-confirm')].map((f) => {
      const r = f.getBoundingClientRect();
      const btns = f.querySelector('.ord-confirm-btns')?.getBoundingClientRect();
      const wrap = f.closest('.ord-wrap');
      const cs = getComputedStyle(f);
      return {
        id: wrap?.dataset.orderId,
        cls: f.className,
        title: (f.querySelector('[data-confirm-title]')?.innerText ?? f.innerText.split('\n')[0]).trim(),
        h: Math.round(r.height),
        w: Math.round(r.width),
        btnTopFromFaceTop: btns ? Math.round(btns.top - r.top) : null,
        btnH: btns ? Math.round(btns.height) : null,
        go: f.querySelector('[data-confirm-go]')?.innerText.trim(),
        cancel: f.querySelector('[data-confirm-cancel]')?.innerText.trim(),
        lines: f.innerText.split('\n').filter(Boolean).length,
        innerScroll: f.scrollHeight > f.clientHeight + 1 ? `yes (${cs.overflowY})` : 'no',
        y: Math.round(r.top + scrollY),
      };
    }),
  );
  for (const f of faces) {
    log(`${v.width}x${v.height} ${f.id}: "${f.title}" face ${f.w}x${f.h}; buttons start ${f.btnTopFromFaceTop} px below the face top, row ${f.btnH} px; [${f.cancel}] [${f.go}]; ${f.lines} text lines; scrolls inside itself: ${f.innerScroll}; class ${f.cls}`);
    await p.evaluate((y) => window.scrollTo(0, y - 20), f.y);
    await p.waitForTimeout(300);
    const el = p.locator(`.ord-wrap[data-order-id="${f.id}"] .ord-confirm`).first();
    await el.screenshot({ path: path.join(ev, `i3-gallery-face-${f.id}-${v.width}x${v.height}.jpg`), type: 'jpeg', quality: 72 }).catch(() => {});
  }
}
log(`page errors: ${s.errors.slice(0, 3).join(' | ') || 'none'}`);
fs.writeFileSync(path.join(ev, 'probe-gallery-faces.txt'), `${out.join('\n')}\n`);
await s.close();
