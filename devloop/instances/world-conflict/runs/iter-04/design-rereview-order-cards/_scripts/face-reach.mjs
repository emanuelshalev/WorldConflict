// Re-review probe: a player presses a danger order wherever it happens to sit on screen. Are the
// face's Cancel and Give the order then visible and not covered (by the fixed bottom bar on the
// phone), without the player scrolling? Desk All orders, target Russia.
//   node face-reach.mjs <phone|desktop> <evidenceDir>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const device = process.argv[2];
const ev = path.resolve(process.argv[3]);
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const VPS = device === 'phone' ? [{ width: 390, height: 844 }] : [{ width: 1366, height: 768 }, { width: 1440, height: 900 }];
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-rr-reach-${device}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `rr-reach-${device}`, device: device === 'phone' ? 'phone' : '1366x768', out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
try {
  let opened = false;
  if (await s.click(/^Full desk/i, { timeout: 2000 })) opened = await s.click(/^All orders/i, { timeout: 3000 });
  if (!opened) await s.click(/All orders/i, { timeout: 3000 });
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type('Russia');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  for (const v of VPS) {
    await p.setViewportSize(v);
    await p.waitForTimeout(800);
    const tag = `${v.width}x${v.height}`;
    for (const id of ['airstrike-military', 'policing-hard']) {
      for (const frac of [0.45, 0.7, 0.85]) {
        // Put the order's top at this fraction of the viewport height by scrolling its scroller
        await p.evaluate(([id, frac]) => {
          const w = document.querySelector(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`);
          let box = w.parentElement;
          while (box && !(/(auto|scroll)/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight)) box = box.parentElement;
          const r = w.getBoundingClientRect();
          (box ?? document.scrollingElement).scrollTop += r.top - innerHeight * frac;
        }, [id, frac]);
        await p.waitForTimeout(300);
        const hit = p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"] .wc-card-hit`).first();
        const top = await hit.evaluate((e) => Math.round(e.closest('.ord-wrap').getBoundingClientRect().top));
        await hit.click();
        await p.waitForTimeout(1000);
        const m = await p.evaluate(() => {
          const f = document.querySelector('.ord-confirm');
          if (!f) return null;
          const chk = (sel) => {
            const b = f.querySelector(sel);
            const r = b.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const inVp = r.top >= 0 && r.bottom <= innerHeight;
            const at = cy >= 0 && cy <= innerHeight ? document.elementFromPoint(cx, cy) : null;
            const top = at ? (b.contains(at) ? 'button' : `${at.className?.toString().split(' ')[0] || at.tagName}`) : 'off-screen';
            return `${Math.round(r.top)}..${Math.round(r.bottom)} inViewport ${inVp} onTop ${top}`;
          };
          return `Cancel ${chk('[data-confirm-cancel]')}; Give ${chk('[data-confirm-go]')}`;
        });
        log(`${tag} ${id} pressed with its top at y=${top} (${Math.round(frac * 100)}%): ${m ?? 'no face'}`);
        if (m && frac === 0.7) await p.screenshot({ path: path.join(ev, `reach-${id}-${tag}-70pct.jpg`), type: 'jpeg', quality: 70 });
        await p.keyboard.press('Escape');
        await p.waitForTimeout(400);
        if (await p.locator('.ord-confirm').count()) await p.locator('[data-confirm-cancel]').first().click().catch(() => {});
        await p.waitForTimeout(300);
      }
    }
  }
  log(`page errors: ${s.errors.slice(0, 4).join(' | ') || 'none'}`);
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
} finally {
  fs.writeFileSync(path.join(ev, `probe-face-reach-${device}.txt`), `${out.join('\n')}\n`);
  await s.close();
}
