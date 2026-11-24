import { browser, newSave, openSave, shot, log } from './lib.mjs';
import { SEATS } from './lib.mjs';
import { openAllOrders } from 'file:///C:/MyData/git/WorldConflict-agenda/devloop/instances/world-conflict/scenarios-qa/regressions/_lib.mjs';
const size = process.argv[2] ?? '3440x1440';
const L = `log-cat-${size}.txt`;
const b = await browser();
const sv = await newSave(SEATS.hc, 1);
const { page: p } = await openSave(b, size, sv);
await openAllOrders({ page: p });
await p.waitForTimeout(1000);
const probe = () => p.evaluate(() => {
  const c = document.querySelector('[data-order-catalog]');
  const out = [];
  for (let e = c; e; e = e.parentElement) {
    const s = getComputedStyle(e);
    out.push(`${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join('.')} oy=${s.overflowY} sh=${e.scrollHeight} ch=${e.clientHeight} st=${e.scrollTop}`);
  }
  const fams = [...document.querySelectorAll('[data-order-family]')].map((f) => `${f.dataset.orderFamily}@${Math.round(f.getBoundingClientRect().top)}`);
  return { chain: out.slice(0, 8), fams, vh: innerHeight };
});
log(L, 'probe', await probe());
const box = await p.locator('[data-order-catalog]').first().boundingBox();
await p.mouse.move(box.x + 200, box.y + 200);
await p.mouse.wheel(0, 1500);
await p.waitForTimeout(800);
log(L, 'after wheel', await probe());
await shot(p, `c-${size}-catalog-after-wheel`);
// desktop tile add button
const tile = p.locator('[data-order-catalog] .ord-wrap[data-order-id="mobilize"]').first();
log(L, 'tile buttons', await tile.locator('button').allInnerTexts().catch((e) => e.message));
await b.close();
