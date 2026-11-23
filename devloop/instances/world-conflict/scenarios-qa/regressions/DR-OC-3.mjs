// DR-OC-3 (design review of build-order-cards, required change 3 and re-review C2 / C4, S3): the All
// orders tiles grew about 26% (the 104 px band and the plate row), the phone listed full 300 to 330 px
// tiles (about 1.5 orders a screen) where design-order-cards.md section 5 asks for compact rows under
// 600 px, and the first rows hid the blurb and forecast before an order was added.
// Guard, on Ceasefire or Collapse as Ukraine:
//  - phone 390x844, All orders: every order is a row, no title is cut, no sideways scroll;
//  - whole rows counted where the player sees them: inside the desk stage and above the fixed command
//    bar (the re-review's measure; the first version of this guard counted rows under the bar and
//    under the desk tabs). Two states: no target with the list at its first group, and target Russia
//    with the Military group at the top of the stage (the reviewer's screen);
//  - a press on an available row (Spy on Russia) opens its blurb and forecast and does not add it;
//    Add adds it (C2); review 3: the opened forecast runs at least 80% of the row's width and Add
//    stays within the row's first 80 px (S3), the hint line shows only with no target, and a search
//    hit on the phone behaves as a list row (S4);
//  - widened to 1440x900, tiles are back near their earlier height (an available tile at most 265 px;
//    about 262 before the order cards, 279 on the first reviewed build).
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-OC-3.mjs <outDir> <baseUrl> <apiUrl>
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('DR-OC-3');
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const ORDERS = 28;
// Whole rows between the desk tabs and the command bar (y 297 to 743, 446 px at 390x844; the HUD,
// goal strip, Focus / Full desk and desk tabs take the 297 px above). These are floors against
// regression, not the design target of 6: with target Russia most rows carry three lines (title,
// family chip, cost and odds, which do not fit one line beside the chip in 184 px), 71 to 97 px, so
// the Military group shows 4; with no target the rows are 71 to 73 px and 5 fit. Six needs the desk
// chrome above the stage to give up about 60 px (desk layout), or rows of 64 px.
const MIN_ROWS_NO_TARGET = 5;
const MIN_ROWS_RUSSIA = 4;
// At 1440x900, no target picked. First reviewed build: median 252, Mobilize forces 279, Court 252.
// Fixed: 226, 258, 226. Before the order cards an available tile was about 262 (the review's measure).
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

/** Scroll the desk stage so this family's group starts at its top; count the whole rows the player sees. */
async function rowsOnScreen(p, fam) {
  await p.evaluate((fam) => {
    const stage = document.querySelector('#desk-stage');
    const sec = document.querySelector(`[data-order-catalog] [data-order-family="${fam}"]`);
    stage.scrollTop += sec.getBoundingClientRect().top - stage.getBoundingClientRect().top;
  }, fam);
  await p.waitForTimeout(400);
  return p.evaluate(() => {
    const stage = document.querySelector('#desk-stage').getBoundingClientRect();
    const bar = document.querySelector('.cmd-bar')?.getBoundingClientRect();
    const top = Math.max(0, stage.top);
    const bottom = Math.min(innerHeight, stage.bottom, bar && bar.height > 0 ? bar.top : innerHeight);
    const cards = [...document.querySelectorAll('[data-order-catalog] .ord-cat .ord-wrap')];
    const whole = cards.filter((c) => {
      const r = c.getBoundingClientRect();
      return r.height > 0 && r.top >= top - 1 && r.bottom <= bottom + 1;
    });
    return { whole: whole.length, region: `${Math.round(top)}..${Math.round(bottom)}`, heights: whole.map((c) => Math.round(c.getBoundingClientRect().height)).join(',') };
  });
}

await run('DR-OC-3', async (g, track) => {
  const s = track(await startGame({ variant: 'dr-oc-3', device: 'phone', out, base, seat: SEAT }));
  const p = s.page;
  if (!g.check(await openCatalog(s), 'phone: All orders opens')) return;

  // ---- Phone: rows
  const ph = await p.evaluate(() => {
    const cat = document.querySelector('[data-order-catalog]');
    const cards = [...cat.querySelectorAll('.ord-cat .ord-wrap')];
    const cut = [];
    for (const t of cat.querySelectorAll('.ord-cat .wc-card-title')) if (t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1) cut.push(t.textContent.trim());
    return { total: cards.length, rows: cards.filter((c) => c.classList.contains('ord-row')).length, cut, hscroll: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  g.check(ph.total === ORDERS, `phone: the catalogue lists all ${ORDERS} orders (${ph.total})`);
  g.check(ph.rows === ph.total && ph.total > 0, `phone: every order is a row, not a tile (${ph.rows} of ${ph.total})`);
  g.check(!ph.cut.length, `phone: no order title is cut (${ph.cut.slice(0, 3).join(', ')})`);
  g.check(!ph.hscroll, 'phone: the page does not scroll sideways');
  const a = await rowsOnScreen(p, 'diplo');
  await s.look('phone-catalog-notarget');
  g.check((await p.locator('[data-order-catalog] [data-cat-hint]').count()) === 1, 'phone, no target: the "Pick a country first" hint is shown once');
  g.check(a.whole >= MIN_ROWS_NO_TARGET, `phone, no target: at least ${MIN_ROWS_NO_TARGET} whole rows between the desk tabs and the command bar (${a.whole} in ${a.region}; ${a.heights} px)`);

  // ---- Desktop width, no target: tiles near the earlier height
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
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(1200);

  // Target Russia, the reviewer's screen
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type('Russia');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  const b = await rowsOnScreen(p, 'mil');
  await s.look('phone-catalog-russia-military');
  g.check(b.whole >= MIN_ROWS_RUSSIA, `phone, Russia at the Military group: at least ${MIN_ROWS_RUSSIA} whole rows between the desk tabs and the command bar (${b.whole} in ${b.region}; ${b.heights} px)`);

  // ---- C2: the row's forecast before adding
  const spy = p.locator('[data-order-catalog] .ord-wrap[data-order-id="spy"]').first();
  await spy.scrollIntoViewIfNeeded();
  g.check((await spy.getAttribute('data-order-state')) === 'available', 'phone: Spy on Russia is available');
  await spy.locator('.wc-card-hit').click();
  await p.waitForTimeout(500);
  const fc = spy.locator('[data-row-forecast]');
  const fcText = (await fc.innerText().catch(() => '')).replace(/\s+/g, ' ');
  g.check(await fc.isVisible().catch(() => false), 'phone: a press on an available row opens its forecast');
  g.check(/Sharpens your estimate/.test(fcText), `phone: the forecast carries the order's description ("${fcText.slice(0, 60)}")`);
  g.check((await spy.getAttribute('data-order-state')) === 'available', 'phone: opening the forecast does not add the order');
  await s.look('phone-row-forecast');
  // Review 3, S3: the opened row's forecast runs the row's full width (not a 180 px column beside
  // Add), and Add stays level with the title instead of floating to the middle of the tall row
  const open = await spy.evaluate((w) => {
    const row = w.getBoundingClientRect();
    const f = w.querySelector('[data-row-forecast]').getBoundingClientRect();
    const add = w.querySelector('.ord-act').getBoundingClientRect();
    return { rowW: Math.round(row.width), fW: Math.round(f.width), addTop: Math.round(add.top - row.top), rowH: Math.round(row.height) };
  });
  g.check(open.fW >= open.rowW * 0.8, `phone: the opened forecast is at least 80% of the row's width (${open.fW} of ${open.rowW} px)`);
  g.check(open.addTop <= 80, `phone: Add stays at the top of the opened row (${open.addTop} px below its top, row ${open.rowH} px tall)`);
  // Review 3, S4: with a target chosen the "Pick a country first" hint no longer takes a line
  g.check((await p.locator('[data-order-catalog] [data-cat-hint]').count()) === 0, 'phone, target chosen: no hint line above the groups');
  // Close the forecast by its title line (the forecast itself lies under the rest of the row)
  await spy.locator('.wc-card-hit').click({ position: { x: 150, y: 14 } });
  await p.waitForTimeout(400);
  g.check(!(await fc.isVisible().catch(() => false)), 'phone: a second press closes the forecast');
  await spy.locator('.ord-act').click();
  await p.waitForTimeout(1200);
  g.check((await spy.getAttribute('data-order-state')) === 'queued', 'phone: Add puts the order in this month');
  await spy.locator('.ord-act').click();
  await p.waitForTimeout(800);

  // ---- Review 3, S4: a search hit on the phone behaves as a list row (a tap shows, Add adds)
  const search = p.locator('#catalog-search');
  await search.fill('spy');
  await p.waitForTimeout(600);
  const hit = p.locator('#ord-hits .ord-wrap[data-order-id="spy"]').first();
  if (g.check(await hit.isVisible().catch(() => false), 'phone, search "spy": Spy is listed')) {
    await search.blur();
    await hit.locator('.wc-card-hit').tap();
    await p.waitForTimeout(500);
    g.check(await hit.locator('[data-row-forecast]').isVisible().catch(() => false), 'phone, search hit: a tap opens its forecast');
    g.check((await hit.getAttribute('data-order-state')) === 'available', 'phone, search hit: the tap does not add the order');
    await hit.locator('.ord-act').tap();
    await p.waitForTimeout(1200);
    g.check((await hit.getAttribute('data-order-state')) === 'queued', 'phone, search hit: Add puts the order in this month');
    await hit.locator('.ord-act').tap();
    await p.waitForTimeout(800);
  }
  await search.fill('');
  await p.waitForTimeout(400);

  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);
});
