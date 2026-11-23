// QA3R-5b and QA3R-5f (iteration 3 repro, Map mode): the game flipped back to Desk every month
// (ui/src/lib/month.ts set deskMode 'desk' on each new month), and on phones the Map / Desk switch
// was hidden inside the hamburger menu. Guard: at laptop and phone widths the Map switch is a
// visible control in the top bar, outside the menu; a month played in Map opens the next month in
// Map, and the switch still says Map.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/QA3R-5.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('QA3R-5');
const mode = (p) => p.evaluate(() => (document.querySelector('.game')?.className.match(/mode-(map|desk)/) ?? [])[1] ?? '');

await run('QA3R-5', async (g, track) => {
  for (const device of ['laptop', 'phone']) {
    const s = track(await startGame({ variant: `qa3r5-${device}`, device, out: path.join(out, device), base }));
    const p = s.page;
    const mapTab = p.locator('.mode-seg').getByRole('tab', { name: /Map/ }).first();
    g.check(await mapTab.isVisible(), `${device}: the Map switch is visible in the top bar`);
    const inMenu = await mapTab.evaluate((e) => !!e.closest('.hud-phone-menu, .sb-menu-pop, [role=menu]'));
    g.check(!inMenu, `${device}: the Map switch is not inside the menu`);
    // A finger needs a full tap target on the phone (the laptop keeps the compact segmented switch)
    const box = await mapTab.boundingBox();
    if (device === 'phone') g.check(!!box && box.width >= 40 && box.height >= 40, `${device}: the Map switch is a full tap target (${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'none'})`);
    await mapTab.click();
    await p.waitForTimeout(900);
    g.check((await mode(p)) === 'map', `${device}: pressing Map opens Map mode`);
    await s.look(`${device}-map-month1`);
    if (!(await s.click(/Execute month/i, { timeout: 10000 }))) throw new Error('Execute month not clickable in Map mode');
    const next = p.getByRole('button', { name: /^Next month/i }).first();
    await next.waitFor({ timeout: 30000 });
    await p.waitForTimeout(1200);
    for (let i = 0; i < 3 && (await next.isVisible().catch(() => false)); i++) {
      await next.click().catch(() => {});
      await p.waitForTimeout(1500);
    }
    await p.waitForTimeout(1200);
    const goal = (await p.locator('[data-region="state"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    const hud = (await p.locator('.game-top').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    g.check(/month 2\b/i.test(`${goal} ${hud}`) || /Execute month/i.test(await p.locator('body').innerText()), `${device}: month 2 is on screen`);
    await s.look(`${device}-month2`);
    g.check((await mode(p)) === 'map', `${device}: month 2 opens in Map, the mode the player chose (got "${await mode(p)}")`);
    g.check((await mapTab.getAttribute('aria-selected')) === 'true', `${device}: the switch still says Map`);
    g.check(!s.errors.length, `${device}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
