// Review 3: the orders gallery (#orders) loaded three times at 1440x900 and 390x844: page scroll
// position, page height and the position of every card must be the same on each load.
//   node gallery3.mjs <evidenceDir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { launch } from '../../../../../../kit/kit.mjs';

const ev = path.resolve(process.argv[2]);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
for (const device of ['1440x900', 'phone']) {
  const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-r3-gal-${device}`);
  fs.rmSync(path.join(tmp, '.profile'), { recursive: true, force: true });
  const s = await launch({ variant: `r3-gal-${device}`, device, out: tmp, base: 'http://localhost:5173/' });
  const p = s.page;
  const sigs = [];
  for (let i = 1; i <= 3; i++) {
    await p.goto('http://localhost:5173/#orders', { waitUntil: 'load' });
    if (i > 1) await p.reload({ waitUntil: 'load' });
    await p.waitForTimeout(3500);
    const f = await p.evaluate(() => {
      const cards = [...document.querySelectorAll('.ord-wrap')].map((w) => {
        const r = w.getBoundingClientRect();
        return `${w.dataset.orderId ?? '-'}@${Math.round(r.left)},${Math.round(r.top + scrollY)} ${Math.round(r.width)}x${Math.round(r.height)}`;
      });
      const faces = document.querySelectorAll('.ord-confirm').length;
      return { scroll: Math.round(document.scrollingElement.scrollTop), height: document.scrollingElement.scrollHeight, cards: cards.length, faces, layout: cards.join('|') };
    });
    const h = crypto.createHash('sha1').update(f.layout).digest('hex').slice(0, 10);
    sigs.push({ ...f, h });
    log(`${device} load ${i}: page scroll ${f.scroll}, page height ${f.height}, cards ${f.cards}, faces open ${f.faces}, layout hash ${h}`);
    if (i !== 2) await p.screenshot({ path: path.join(ev, `gallery-load${i}-${device}.jpg`), type: 'jpeg', quality: 70 });
  }
  const same = sigs.every((x) => x.h === sigs[0].h && x.scroll === sigs[0].scroll && x.height === sigs[0].height);
  log(`${device}: three loads identical ${same}`);
  if (!same) {
    const a = sigs[0].layout.split('|');
    for (let k = 1; k < 3; k++) {
      const b = sigs[k].layout.split('|');
      const diff = a.map((x, j) => (x !== b[j] ? `${x} vs ${b[j]}` : null)).filter(Boolean).slice(0, 6);
      log(`  load ${k + 1} differs: ${diff.join(' ; ')}`);
    }
  }
  log(`${device} page errors: ${s.errors.slice(0, 3).join(' | ') || 'none'}`);
  await s.close();
}
fs.writeFileSync(path.join(ev, 'probe-gallery-3loads.txt'), `${out.join('\n')}\n`);
