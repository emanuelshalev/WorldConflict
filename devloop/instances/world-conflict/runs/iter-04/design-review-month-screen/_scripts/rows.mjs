import { browser, newSave, openSave, shot, log, SEATS } from './lib.mjs';
import { phoneList, phoneScrollToFamily, openAllOrders } from 'file:///C:/MyData/git/WorldConflict-agenda/devloop/instances/world-conflict/scenarios-qa/regressions/_lib.mjs';
const b = await browser();
for (const size of ['390x844', '360x740']) {
  for (const months of [0, 1]) {
    const sv = await newSave(SEATS.hc, months);
    const { page: p, ctx } = await openSave(b, size, sv, { coach: months === 0 });
    await openAllOrders({ page: p });
    await p.waitForTimeout(800);
    if (months === 0) {
      // add one order to move the coach to step 3 (CA)
      const plain = p.locator('[data-order-catalog] .ord-wrap[data-order-state="available"]').first();
      await plain.locator('.ord-act').click().catch(() => {});
      await p.waitForTimeout(800);
      if (await p.locator('.ord-confirm').count()) { await p.locator('[data-confirm-go]').first().click().catch(() => {}); await p.waitForTimeout(600); }
    }
    await p.getByRole('button', { name: /Target country/i }).first().click().catch(() => {});
    await p.waitForTimeout(300);
    await p.keyboard.type('Russia');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1000);
    for (const fam of ['diplo', 'mil']) {
      await phoneScrollToFamily(p, fam).catch((e) => log('log-rows.txt', 'scroll fail', fam, e.message.slice(0, 80)));
      const m = await phoneList(p);
      log('log-rows.txt', `${size} month ${months + 1} ${fam}`, m);
      await shot(p, `r-${size}-m${months + 1}-${fam}`);
    }
    await ctx.close();
  }
}
await b.close();
