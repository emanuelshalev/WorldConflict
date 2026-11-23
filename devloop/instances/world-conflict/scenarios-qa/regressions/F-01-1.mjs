// F-01-1 (iteration 1 triage, Maya/Ruth/Noah): the target country picker is not a native dropdown;
// it works by typing ("ira" + Enter picks Iran) and by picking on the map, on laptop and phone.
// Repro from runs/iter-01/sessions (maya-laptop, noah-tablet): All orders, open the target picker.
import path from 'node:path';
import { args, openAllOrders, run, startGame } from './_lib.mjs';

const { out, base } = args('F-01-1');

async function openCatalog(s) {
  // Iteration 4: All orders opens from the month's List (Your own orders; month 1: its panel)
  if (!(await openAllOrders(s))) throw new Error('no All orders on the desk');
  await s.page.locator('[data-order-catalog], #catalog-search').first().waitFor({ timeout: 8000 });
}

await run('F-01-1', async (g, track) => {
  for (const device of ['laptop', 'phone']) {
    const s = track(await startGame({ variant: `f011-${device}`, device, out: path.join(out, device), base }));
    const p = s.page;
    await openCatalog(s);
    const catalog = p.locator('[data-order-catalog]').first();
    const scope = (await catalog.count()) ? catalog : p.locator('body');
    g.check((await scope.locator('select').count()) === 0, `${device}: no native select in All orders`);
    const trigger = scope.locator('[data-country-picker]').first();
    g.check(await trigger.isVisible(), `${device}: the country picker is on the order list`);

    // By typing
    // A phone taps (no mouse pointer left hovering over the sheet that opens under the finger)
    if (device === 'phone') await trigger.tap();
    else await trigger.click();
    const search = p.getByRole('combobox', { name: /Search countries/i });
    await search.waitFor({ timeout: 4000 });
    const rows = p.locator('.cp-row');
    g.check((await rows.count()) >= 10, `${device}: the picker lists countries (${await rows.count()} rows)`);
    const h = await rows.first().evaluate((e) => e.getBoundingClientRect().height);
    g.check(h >= 44, `${device}: rows are tap-sized (${Math.round(h)} px)`);
    await search.fill('ira');
    await p.waitForTimeout(300);
    await search.press('Enter');
    await p.waitForTimeout(800);
    const label = (await trigger.getAttribute('aria-label')) ?? '';
    g.check(/Iran\b/.test(label), `${device}: typing "ira" + Enter picks Iran (trigger "${label}")`);
    const court = scope.locator('[data-order-id="court"]').first();
    g.check(/Iran/.test(await court.innerText().catch(() => '')), `${device}: the order cards now name Iran`);
    await s.look(`${device}-typed`);

    // By the map (desk catalog only; it is the same component on the map menu and the dossier)
    if (device === 'laptop') {
      await trigger.click();
      const mapBtn = p.getByRole('button', { name: /Pick on the map/i });
      g.check(await mapBtn.isVisible(), 'laptop: the picker offers Pick on the map');
      await mapBtn.click();
      // The globe opens in pick mode: tap a country by its projected position
      await p.waitForFunction(() => !!window.__wcMap && window.__wcMap.isStyleLoaded(), null, { timeout: 15000 });
      await p.waitForTimeout(1500);
      const pt = await p.evaluate(() => {
        const m = window.__wcMap;
        for (const [lng, lat] of [[-102, 23.5], [-100, 22], [-104, 25]]) {
          const q = m.project([lng, lat]);
          const el = document.elementFromPoint(q.x + m.getContainer().getBoundingClientRect().left, q.y + m.getContainer().getBoundingClientRect().top);
          if (el && m.getContainer().contains(el)) return { x: q.x + m.getContainer().getBoundingClientRect().left, y: q.y + m.getContainer().getBoundingClientRect().top };
        }
        return null;
      });
      g.check(!!pt, 'laptop: Mexico is on screen in pick mode');
      if (pt) {
        await s.look('laptop-pick-mode');
        await p.mouse.click(pt.x, pt.y);
        await p.waitForTimeout(1500);
        const t2 = p.locator('[data-order-catalog] [data-country-picker], [data-country-picker]').first();
        await t2.waitFor({ timeout: 8000 }).catch(() => {});
        const l2 = (await t2.getAttribute('aria-label').catch(() => '')) ?? '';
        g.check(/Mexico/.test(l2), `laptop: a tap on Mexico picks it and returns to the order list (trigger "${l2}")`);
        await s.look('laptop-map-picked');
      }
    }
    g.check(!s.errors.length, `${device}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
