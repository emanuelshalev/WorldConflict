// DR-MS-2 (design-review-month-screen.md S2-1): the List clipped its own rows with no fold and no
// scroll. At 1920x1080 after Choose all recommended the rows grew to "Decided: ..." and "Your own
// orders", the only row that leads to the player's orders at that size, fell under the ticker; the
// See all panel lost its last two to four rows at 1366x768, 1024x768 and in Map mode.
// Rule (L-13 / AC-L4, nothing only below the fold, no inner scroll): the List fits its box by its
// own fit rule (compact rows, then the mission foot folds, then the done rows and the other rows to do fold into one
// summary row with Show, never Your own orders), and every row it shows is whole and uncovered.
// Scene: Hormuz Convoy as the United States (seed 4242), month 2, on the desk and in Map mode, at
// 3440x1440, 1920x1080, 1440x900, 1366x768 and 1024x768, in four states: nothing chosen with no own
// order, one own order, six own orders (added with the mouse in All orders), and after Choose all
// recommended. Fixed and floating elements on that screen: the state band and month bar (top), the
// List (a column from 1600 wide; below, the See all panel floating over the Thing; in Map mode a
// float under the card at 3440x1440 and the See all panel below that), the Plan rail or bar, the
// map card and the Plan float in Map mode, the ticker (bottom).
// Every row of the List (and the fold's summary row) must be inside the viewport, inside every
// clipping ancestor and uncovered at its centre and corners (element at point).
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-MS-2.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { WHOLE_JS, apiSave, args, openAllOrders, openSaved, run } from './_lib.mjs';

const { out, base, api } = args('DR-MS-2');
const SIZES = (process.env.DRMS2_SIZES ?? '3440x1440,1920x1080,1440x900,1366x768,1024x768').split(',');
const MODES = (process.env.DRMS2_MODES ?? 'desk,map').split(',');
// Orders a player adds by mouse on Venezuela (free or cheap ones first), until six are in the month
const ADD = [
  ['diplo', 'Diplomacy', 'denounce'],
  ['diplo', 'Diplomacy', 'court'],
  ['mil', 'Military', 'demobilize'],
  ['mil', 'Military', 'deploy-border'],
  ['mil', 'Military', 'procure'],
  ['intel', 'Covert', 'spy'],
  ['home', 'Home', 'address'],
  ['mil', 'Military', 'mobilize'],
  ['home', 'Home', 'policing-soft'],
  ['econ', 'Economy', 'reform'],
];

const bandOrders = async (p) => Number(((await p.locator('header, [data-region="band"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').match(/Orders\s*(\d+)\s*of\s*6/) ?? [])[1] ?? -1);

/** Check every row of the List at each size and mode; `tag` names the state. */
async function checkList(g, p, tag) {
  const whole = (loc) => loc.evaluate(new Function(`return (${WHOLE_JS})`)());
  for (const size of SIZES) {
    const [w, h] = size.split('x').map(Number);
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(700);
    for (const mode of MODES) {
      const where = `${tag} ${size} ${mode}`;
      await p.locator('.mode-seg').getByRole('tab', { name: mode === 'map' ? /Map/ : /Desk/ }).first().click().catch(() => {});
      await p.waitForTimeout(mode === 'map' ? 1200 : 600);
      let list = p.locator('[data-agenda]').first();
      let opened = false;
      if (!(await list.isVisible().catch(() => false))) {
        await p.locator('.see-all').first().click().catch(() => {});
        opened = true;
        await p.waitForTimeout(700);
        list = p.locator('[data-agenda]').first();
      }
      const shown = await list.isVisible().catch(() => false);
      g.check(shown, `${where}: the List is shown${opened ? ' (See all)' : ''}`);
      if (!shown) continue;
      const rows = list.locator('.lrow');
      const n = await rows.count();
      const bad = [];
      for (let i = 0; i < n; i++) {
        const r = rows.nth(i);
        const t = (await r.locator('.lrow-t > b').first().innerText().catch(() => '?')).trim();
        const why = await whole(r);
        if (why) bad.push(`${t}: ${why}`);
      }
      const own = list.locator('[data-agenda-item="own"]');
      const ownFolded = (await own.count()) === 0;
      g.check(n > 0 && !bad.length, `${where}: every row of the List is whole and uncovered (${n} rows${bad.length ? `; ${bad.slice(0, 3).join(' | ')}` : ''})`);
      // The row that leads to every order is never folded away (the review: the only way to the player's orders at these sizes)
      g.check(!ownFolded, `${where}: "Your own orders" is a row of its own`);
      const fit = await list.getAttribute('data-fit');
      await p.screenshot({ path: path.join(out, `${tag}-${size}-${mode}${opened ? '-seeall' : ''}.png`) });
      console.log(`     ${where}: ${n} rows, fit ${fit ?? '-'}`);
      if (opened) {
        await list.locator('.al-close').first().click().catch(() => {});
        await p.waitForTimeout(300);
      }
    }
    await p.locator('.mode-seg').getByRole('tab', { name: /Desk/ }).first().click().catch(() => {});
    await p.waitForTimeout(400);
  }
}

await run('DR-MS-2', async (g) => {
  // 1. Nothing chosen, no own order; then Choose all recommended
  {
    const sv = await apiSave(api, 1, undefined, 'drms2a');
    const { browser, page: p, errors } = await openSaved(base, '1920x1080', sv);
    try {
      await checkList(g, p, 'orders0');
      await p.setViewportSize({ width: 1920, height: 1080 });
      await p.waitForTimeout(500);
      const all = p.getByRole('button', { name: /^Choose all recommended/ }).first();
      g.check(await all.click({ timeout: 5000 }).then(() => true, () => false), 'Choose all recommended is pressed');
      await p.waitForTimeout(1200);
      await checkList(g, p, 'chooseall');
      g.check(!errors.length, `no page errors (${errors.slice(0, 2).join(' | ')})`);
    } finally {
      await browser.close();
    }
  }
  // 2. One own order, then six
  {
    const sv = await apiSave(api, 1, undefined, 'drms2b');
    const { browser, page: p, errors } = await openSaved(base, '1920x1080', sv);
    try {
      const addUntil = async (want) => {
        if (!(await p.locator('[data-order-catalog]').first().isVisible().catch(() => false))) await openAllOrders({ page: p });
        await p.waitForTimeout(600);
        const cat = p.locator('[data-order-catalog]').first();
        if (!/Venezuela/.test(await cat.locator('.cp-trigger').first().innerText().catch(() => ''))) {
          await cat.locator('.cp-trigger').first().click();
          await p.locator('.cp-row', { hasText: 'Venezuela' }).first().click();
          await p.waitForTimeout(400);
        }
        for (const [, word, id] of ADD) {
          if ((await bandOrders(p)) >= want) break;
          const tab = cat.getByRole('tab', { name: new RegExp(`^${word}\\b`) }).first();
          if (await tab.isVisible().catch(() => false)) await tab.click();
          await p.waitForTimeout(250);
          const card = cat.locator(`.ord-wrap[data-order-id="${id}"]`).first();
          if ((await card.getAttribute('data-order-state').catch(() => '')) !== 'available') continue;
          if ((await card.locator('.ord-queued-line').count()) > 0) continue;
          await card.locator('.ord-act, .wc-card-hit').first().click().catch(() => {});
          await p.waitForTimeout(500);
          const go = p.locator('[data-confirm-go]').first();
          if (await go.isVisible().catch(() => false)) await go.click().catch(() => {});
          await p.waitForTimeout(300);
        }
        await p.getByRole('button', { name: /Back to the month/ }).first().click().catch(() => {});
        await p.waitForTimeout(600);
        return bandOrders(p);
      };
      g.check((await addUntil(1)) === 1, 'one own order is added with the mouse');
      await checkList(g, p, 'orders1');
      await p.setViewportSize({ width: 1920, height: 1080 });
      await p.waitForTimeout(500);
      const six = await addUntil(6);
      g.check(six === 6, `six own orders are added with the mouse (${six})`);
      await checkList(g, p, 'orders6');
      g.check(!errors.length, `no page errors (${errors.slice(0, 2).join(' | ')})`);
    } finally {
      await browser.close();
    }
  }
});
