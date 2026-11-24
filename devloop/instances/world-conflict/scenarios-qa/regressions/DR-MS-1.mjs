// DR-MS-1 (design-review-month-screen.md S1-1): the All orders catalogue was cut off at every desktop
// size with no scroll, no family tabs and no sign that more existed (1366x768 showed six Diplomacy
// tiles; at 3440x1440 Economy and Home were below the screen and Covert cut in half; the wheel did
// nothing), so whole families (war, strikes, covert, reform) could not be found by browsing.
// Rule (design-layout.md section 7, L-13 no inner scroll): every family is one visible control away
// (family tabs with counts) and the chosen family's orders fit the frame, never clipped.
// Scene: Hormuz Convoy as the United States (seed 4242), month 2 (one month resolved with the
// default answers), Your own orders > All orders, on the desk. Fixed and floating elements on that
// screen: the state band and the month bar (top), the List column (D and up) and the Plan rail
// (L and up) beside the item, the ticker (bottom), the country picker's pop-up and an order's
// hover forecast (floating), the confirm face of a danger order (in place of its card).
// Checks at 3440x1440, 1920x1080, 1440x900, 1366x768 and 1024x768, mouse only, no typing:
//  - each of the six families is named by a visible, uncovered control (or its heading is in view);
//  - after choosing it, every order of the family is whole: inside the viewport, inside every
//    clipping ancestor, uncovered at its centre and corners; its action button takes a click;
//  - a target is picked with the mouse (Venezuela), Court is added (Orders 1 of 6), and Declare war
//    goes through its confirmation: the face is whole and its confirm button takes the order.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-MS-1.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { WHOLE_JS, apiSave, args, openAllOrders, openSaved, run } from './_lib.mjs';

const { out, base, api } = args('DR-MS-1');
const SIZES = (process.env.DRMS1_SIZES ?? '3440x1440,1920x1080,1440x900,1366x768,1024x768').split(',');
const FAMILIES = [
  ['diplo', 'Diplomacy'],
  ['mil', 'Military'],
  ['nuke', 'Nuclear'],
  ['intel', 'Covert'],
  ['econ', 'Economy'],
  ['home', 'Home'],
];

await run('DR-MS-1', async (g) => {
  const sv = await apiSave(api, 1, undefined, 'drms1');
  for (const size of SIZES) {
    const { browser, page: p, errors } = await openSaved(base, size, sv);
    try {
      const whole = (loc) => loc.evaluate(new Function(`return (${WHOLE_JS})`)());
      g.check(await openAllOrders({ page: p }), `${size}: All orders opens from the month`);
      await p.waitForTimeout(600);
      const cat = p.locator('[data-order-catalog]').first();
      // Mouse only: pick the target from the picker's list (the cards then say Add, not Pick)
      await cat.locator('.cp-trigger').first().click();
      await p.locator('.cp-row', { hasText: 'Venezuela' }).first().click();
      await p.waitForTimeout(500);
      for (const [fam, word] of FAMILIES) {
        const tab = cat.getByRole('tab', { name: new RegExp(`^${word}\\b`) }).first();
        const head = cat.locator(`[data-family-heading="${word}"]`).first();
        let named = '';
        if (await tab.isVisible().catch(() => false)) named = await whole(tab);
        else named = (await head.isVisible().catch(() => false)) ? await whole(head) : 'no tab and no heading';
        g.check(named === '', `${size} ${word}: the family is named by a visible control or heading${named ? ` (${named})` : ''}`);
        if (await tab.isVisible().catch(() => false)) {
          await tab.click();
          await p.waitForTimeout(400);
        }
        const tiles = cat.locator(`.ord-wrap[data-family="${fam}"]`);
        const n = await tiles.count();
        g.check(n > 0, `${size} ${word}: its orders are listed (${n})`);
        const bad = [];
        for (let i = 0; i < n; i++) {
          const t = tiles.nth(i);
          const id = await t.getAttribute('data-order-id');
          const w = await whole(t);
          const state = await t.getAttribute('data-order-state');
          if (w) bad.push(`${id}: ${w}`);
          // An order the rules do not allow now (no target of that kind, no pact to break) says why on
          // its card; an available one must take the press
          else if (state === 'available' && !(await t.locator('.ord-act, .wc-card-hit').first().click({ trial: true, timeout: 1500 }).then(() => true, () => false))) bad.push(`${id}: its button takes no click`);
          else if (state !== 'available' && !(await t.locator('.ord-reason, .ord-meta-why').first().isVisible().catch(() => false))) bad.push(`${id}: unavailable (${state}) with no reason shown`);
        }
        g.check(!bad.length, `${size} ${word}: every order is whole and its button takes a click${bad.length ? ` (${bad.slice(0, 3).join('; ')})` : ''}`);
      }
      // Add one order by mouse
      const diplo = cat.getByRole('tab', { name: /^Diplomacy\b/ }).first();
      if (await diplo.isVisible().catch(() => false)) await diplo.click();
      await cat.locator('.ord-wrap[data-order-id="court"]').first().locator('.ord-act, .wc-card-hit').first().click();
      await p.waitForTimeout(800);
      const band = (await p.locator('[data-region="band"], .state-band, header').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
      g.check(/Orders\s*1\s*of\s*6/.test(band) || (await cat.locator('.ord-wrap[data-order-id="court"] .ord-queued-line').count()) > 0, `${size}: Court is added with the mouse (band "${band.match(/Orders[^A-Za-z]*of\s*\d/)?.[0] ?? '?'}")`);
      // Declare war through its confirmation, on the desk
      const mil = cat.getByRole('tab', { name: /^Military\b/ }).first();
      if (await mil.isVisible().catch(() => false)) await mil.click();
      await p.waitForTimeout(300);
      await cat.locator('.ord-wrap[data-order-id="declare-war"]').first().locator('.ord-act, .wc-card-hit').first().click();
      await p.waitForTimeout(600);
      const face = p.locator('[data-confirm-order="declare-war"]').first();
      const shown = await face.isVisible().catch(() => false);
      g.check(shown, `${size}: Declare war on Venezuela opens its confirmation`);
      if (shown) {
        const fw = await whole(face);
        g.check(fw === '', `${size}: the confirmation is whole and uncovered${fw ? ` (${fw})` : ''}`);
        await face.locator('[data-confirm-go]').first().click();
        await p.waitForTimeout(900);
        const queued = (await cat.locator('.ord-wrap[data-order-id="declare-war"] .ord-queued-line').count()) > 0;
        const band2 = (await p.locator('[data-region="band"], .state-band, header').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
        g.check(queued || /Orders\s*2\s*of\s*6/.test(band2), `${size}: the confirm button gives the order (queued: ${queued})`);
      }
      await p.screenshot({ path: path.join(out, `catalog-${size}.png`) });
      g.check(!errors.length, `${size}: no page errors (${errors.slice(0, 2).join(' | ')})`);
    } finally {
      await browser.close();
    }
  }
});
