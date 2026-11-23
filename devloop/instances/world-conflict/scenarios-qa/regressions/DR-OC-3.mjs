// DR-OC-3 (design review of build-order-cards, required change 3, S3): the All orders tiles grew
// about 26% (the 104 px band and the plate row), and the phone still listed full 300 to 330 px tiles,
// about 1.5 orders per screen, where design-order-cards.md section 5 asks for compact rows under
// 600 px. Guard: on Ceasefire or Collapse as Ukraine, open All orders on a phone (390x844) and check
// that every order is a row, at least 6 whole orders fit on one screen, no title is cut and the page
// does not scroll sideways; then widen the same page to 1440x900 and check the catalogue is back to
// tiles near the earlier size (an available tile at most 265 px; about 262 before the order cards,
// 279 on the reviewed branch).
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-OC-3.mjs <outDir> <baseUrl> <apiUrl>
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('DR-OC-3');
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const ORDERS = 28;
const MIN_PER_SCREEN = 6;
// At 1440x900, no target picked. Reviewed branch: median 252, Mobilize forces 279, Court 252. Fixed:
// 226, 258, 226. Before the order cards an available tile was about 262 (the review's measure).
const MAX_TILE_MEDIAN = 240;
const MAX_AVAILABLE = 265;
const MAX_NEEDS_TARGET = 236;

async function openCatalog(s) {
  let opened = false;
  if (await s.click(/^Full desk/i, { timeout: 2000 })) opened = await s.click(/^All orders/i, { timeout: 3000 });
  if (!opened && (await s.click(/Show budgets, orders and meetings|Show the whole desk/i, { timeout: 2000 }))) opened = await s.click(/^All orders/i, { timeout: 3000 });
  if (!opened) await s.click(/All orders/i, { timeout: 3000 });
  await s.page.waitForTimeout(900);
  return s.page.locator('[data-order-catalog]').first().isVisible().catch(() => false);
}

await run('DR-OC-3', async (g, track) => {
  const s = track(await startGame({ variant: 'dr-oc-3', device: 'phone', out, base, seat: SEAT }));
  const p = s.page;
  if (!g.check(await openCatalog(s), 'phone: All orders opens')) return;

  // ---- Phone: rows
  await p.locator('[data-order-catalog] .ord-cat').first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(500);
  const ph = await p.evaluate(() => {
    const cat = document.querySelector('[data-order-catalog]');
    const cards = [...cat.querySelectorAll('.ord-cat .ord-wrap')];
    const top = Math.max(0, document.querySelector('.game-top')?.getBoundingClientRect().bottom ?? 0);
    const whole = cards.filter((c) => {
      const r = c.getBoundingClientRect();
      return r.top >= top - 1 && r.bottom <= innerHeight + 1 && r.height > 0;
    });
    const cut = [];
    for (const t of cat.querySelectorAll('.ord-cat .wc-card-title')) if (t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1) cut.push(t.textContent.trim());
    const heights = cards.map((c) => Math.round(c.getBoundingClientRect().height)).sort((a, b) => a - b);
    return {
      total: cards.length,
      rows: cards.filter((c) => c.classList.contains('ord-row')).length,
      whole: whole.length,
      cut,
      hscroll: document.documentElement.scrollWidth > innerWidth + 1,
      median: heights[Math.floor(heights.length / 2)] ?? 0,
    };
  });
  await s.look('phone-catalog');
  g.check(ph.total === ORDERS, `phone: the catalogue lists all ${ORDERS} orders (${ph.total})`);
  g.check(ph.rows === ph.total && ph.total > 0, `phone: every order is a row, not a tile (${ph.rows} of ${ph.total}; median ${ph.median} px)`);
  g.check(ph.whole >= MIN_PER_SCREEN, `phone: at least ${MIN_PER_SCREEN} whole orders on one screen (${ph.whole})`);
  g.check(!ph.cut.length, `phone: no order title is cut (${ph.cut.slice(0, 3).join(', ')})`);
  g.check(!ph.hscroll, 'phone: the page does not scroll sideways');

  // ---- Desktop width: tiles near the earlier height
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.waitForTimeout(1200);
  const dk = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-order-catalog] .ord-cat .ord-wrap')];
    const heights = cards.map((c) => Math.round(c.getBoundingClientRect().height)).filter((h) => h > 0).sort((a, b) => a - b);
    const one = (id) => Math.round(document.querySelector(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`)?.getBoundingClientRect().height ?? 0);
    return { total: cards.length, tiles: cards.filter((c) => c.classList.contains('ord-tile')).length, median: heights[Math.floor(heights.length / 2)] ?? 0, max: heights.at(-1) ?? 0, mobilize: one('mobilize'), court: one('court') };
  });
  await s.look('desktop-catalog');
  g.check(dk.tiles === dk.total && dk.total === ORDERS, `1440x900: the catalogue is back to ${ORDERS} tiles (${dk.tiles} of ${dk.total})`);
  g.check(dk.median > 0 && dk.median <= MAX_TILE_MEDIAN, `1440x900: median tile height at most ${MAX_TILE_MEDIAN} px (${dk.median}, tallest ${dk.max})`);
  // The two common shapes: an available tile (Mobilize forces) and one waiting for a target (Court)
  g.check(dk.mobilize > 0 && dk.mobilize <= MAX_AVAILABLE, `1440x900: an available tile (Mobilize forces) at most ${MAX_AVAILABLE} px (${dk.mobilize})`);
  g.check(dk.court > 0 && dk.court <= MAX_NEEDS_TARGET, `1440x900: a tile waiting for a target (Court) at most ${MAX_NEEDS_TARGET} px (${dk.court})`);
  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);
});
