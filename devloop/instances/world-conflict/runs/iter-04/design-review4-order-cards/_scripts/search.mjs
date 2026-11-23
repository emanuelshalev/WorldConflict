// Review 4, item 4 on a search hit: phone, Ukraine seat, target Russia, search "troops", tap the first
// hit's row (not Add): forecast opens full width, Add stays at the top, nothing is queued; then Add.
//   node search.mjs <evidenceDir> <width> <height>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const W = Number(process.argv[3] ?? 390);
const H = Number(process.argv[4] ?? 844);
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-r4-search-${W}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `r4-search-${W}`, device: 'phone', out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
await p.setViewportSize({ width: W, height: H });
const tag = `${W}x${H}`;
const geo = () =>
  p.evaluate(() => {
    const w = document.querySelector('#ord-hits .ord-wrap');
    if (!w) return 'no hit';
    const card = w.querySelector('.wc-card').getBoundingClientRect();
    const foot = w.querySelector('.wc-card-foot')?.getBoundingClientRect();
    const a = w.querySelector('.ord-act').getBoundingClientRect();
    return `${w.dataset.orderId} state ${w.dataset.orderState} open ${w.classList.contains('is-open')}; card ${Math.round(card.width)}x${Math.round(card.height)}; foot ${foot ? `w${Math.round(foot.width)}` : 'none'}; Add +${Math.round(a.top - card.top)} ${Math.round(a.width)}x${Math.round(a.height)} "${w.querySelector('.ord-act').innerText.trim()}"; faces ${document.querySelectorAll('.ord-confirm').length}; hits ${document.querySelectorAll('#ord-hits .ord-wrap').length}`;
  });
try {
  if (await s.click(/^Full desk/i, { timeout: 2000 })) await s.click(/^All orders/i, { timeout: 3000 });
  await p.waitForTimeout(1000);
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type('Russia');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  const input = p.locator('[data-order-catalog] input[type="search"], [data-order-catalog] input:not([type="hidden"])').last();
  log(`inputs in catalogue: ${await p.locator('[data-order-catalog] input').count()}; using placeholder "${await input.getAttribute('placeholder')}"`);
  await input.tap();
  await p.keyboard.type('troops');
  await p.waitForTimeout(900);
  await p.evaluate(() => document.activeElement?.blur());
  await p.waitForTimeout(500);
  log(`${tag} after typing: ${await geo()}`);
  const hit = p.locator('#ord-hits .ord-wrap').first();
  await hit.scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  // Tap the hit's title, with the hit just under the stage top (fresh coordinates each time)
  const tapTitle = async (q) => {
    const r = await p.evaluate((q) => {
      const st = document.querySelector('#desk-stage');
      const w = document.querySelector(q);
      st.scrollTop += w.getBoundingClientRect().top - (st.getBoundingClientRect().top + 20);
      const t = (w.querySelector('.wc-card-title') ?? w.querySelector('.wc-card')).getBoundingClientRect();
      const x = t.left + 20;
      const y = t.top + Math.min(t.height / 2, 14);
      const e = document.elementFromPoint(x, y);
      return { x, y, on: `${e?.tagName}.${e?.className?.toString().split(' ')[0]} inRow ${!!e?.closest(q)}` };
    }, q);
    await p.waitForTimeout(250);
    await p.touchscreen.tap(r.x, r.y);
    await p.waitForTimeout(900);
    return `tap ${Math.round(r.x)},${Math.round(r.y)} on ${r.on}`;
  };
  log(`${tag} first ${await tapTitle('#ord-hits .ord-wrap')}: ${await geo()}`);
  await hit.screenshot({ path: path.join(ev, `c4-search-hit-row-${tag}.jpg`), type: 'jpeg', quality: 72 });
  await p.screenshot({ path: path.join(ev, `c4-search-hit-screen-${tag}.jpg`), type: 'jpeg', quality: 70 });
  log(`${tag} second ${await tapTitle('#ord-hits .ord-wrap')}: ${await geo()}`);
  await p.locator('[data-order-catalog] input').first().fill('');
  await p.waitForTimeout(800);
  const spy = '[data-order-catalog] .ord-wrap[data-order-id="spy"]';
  for (const k of [1, 2]) {
    const t = await tapTitle(spy);
    log(`${tag} list row spy, ${t}: open ${await p.locator(spy).first().evaluate((w) => w.classList.contains('is-open'))}`);
  }
  log(`page errors: ${s.errors.slice(0, 4).join(' | ') || 'none'}`);
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
  await p.screenshot({ path: path.join(ev, `failure-search-${tag}.jpg`), type: 'jpeg', quality: 60 }).catch(() => {});
} finally {
  fs.writeFileSync(path.join(ev, `probe-search-${tag}.txt`), `${out.join('\n')}\n`);
  await s.close();
}
