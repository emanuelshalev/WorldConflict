// Review 3: a first-month player adds an order of their own (the coach moves to "When you are
// ready, run the month", anchored above Execute month), then presses Add on a danger row. Where does
// the face land, what lies over Give the order, and what does a finger on Give's centre do?
//   node coach-give.mjs <evidenceDir> <width> <height> <orderId> <frac>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const W = Number(process.argv[3] ?? 390);
const H = Number(process.argv[4] ?? 844);
const ID = process.argv[5] ?? 'policing-hard';
const FRAC = Number(process.argv[6] ?? 0.45);
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-r3-coach-${W}-${ID}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `r3-coach-${W}-${ID}`, device: 'phone', out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
await p.setViewportSize({ width: W, height: H });
const tag = `${W}x${H}-${ID}`;
const place = (id, frac) =>
  p.evaluate(
    ([id, frac]) => {
      const st = document.querySelector('#desk-stage');
      const w = document.querySelector(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`);
      st.scrollTop += w.getBoundingClientRect().top - innerHeight * frac;
      return Math.round(w.getBoundingClientRect().top);
    },
    [id, frac],
  );
const tapCentre = async (sel) => {
  const r = await p.locator(sel).first().boundingBox();
  await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  return r;
};
try {
  if (await s.click(/^Full desk/i, { timeout: 2000 })) await s.click(/^All orders/i, { timeout: 3000 });
  await p.waitForTimeout(900);
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type('Russia');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  await place('mobilize', 0.4);
  await p.waitForTimeout(300);
  await tapCentre('[data-order-catalog] .ord-wrap[data-order-id="mobilize"] .ord-act');
  await p.waitForTimeout(900);
  const coach = await p.evaluate(() => {
    const c = document.querySelector('.coach-bubble');
    if (!c) return 'none';
    const r = c.getBoundingClientRect();
    return `${c.dataset.coach} "${c.innerText.replace(/\s+/g, ' ')}" at ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} pointer-events ${getComputedStyle(c).pointerEvents}`;
  });
  log(`${tag}: Mobilize ${await p.locator('[data-order-catalog] .ord-wrap[data-order-id="mobilize"]').first().getAttribute('data-order-state')}; coach ${coach}`);
  const top = await place(ID, FRAC);
  await p.waitForTimeout(300);
  await tapCentre(`[data-order-catalog] .ord-wrap[data-order-id="${ID}"] .ord-act`);
  await p.waitForTimeout(1100);
  const f = await p.evaluate(() => {
    const g = document.querySelector('.ord-confirm [data-confirm-go]');
    if (!g) return null;
    const r = g.getBoundingClientRect();
    const c = document.querySelector('.coach-bubble')?.getBoundingClientRect();
    let covered = 0;
    let total = 0;
    for (let x = r.left + 1; x < r.right; x += 4)
      for (let y = r.top + 1; y < r.bottom; y += 4) {
        total++;
        if (!g.contains(document.elementFromPoint(x, y))) covered++;
      }
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return `Give ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}; covered ${Math.round((covered / total) * 100)}% of its area; on top at centre: ${g.contains(at) ? 'Give' : at?.closest('.coach-bubble') ? 'coach bubble' : at?.className}; coach ${c ? `${Math.round(c.left)},${Math.round(c.top)}..${Math.round(c.bottom)}` : 'none'}`;
  });
  log(`${tag}: ${ID} row top ${top} -> face: ${f ?? 'NO FACE (the Add tap missed?)'}`);
  if (f) {
    await p.screenshot({ path: path.join(ev, `s2-coach-${tag}.jpg`), type: 'jpeg', quality: 72 });
    await tapCentre('.ord-confirm [data-confirm-go]');
    await p.waitForTimeout(900);
    log(`${tag}: finger on Give's centre -> face open ${await p.locator('.ord-confirm').count()}, ${ID} ${await p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${ID}"]`).first().getAttribute('data-order-state')}`);
    await p.screenshot({ path: path.join(ev, `s2-coach-after-tap-${tag}.jpg`), type: 'jpeg', quality: 72 });
  }
  log(`page errors: ${s.errors.slice(0, 4).join(' | ') || 'none'}`);
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
} finally {
  fs.writeFileSync(path.join(ev, `probe-coach-give-${tag}.txt`), `${out.join('\n')}\n`);
  await s.close();
}
