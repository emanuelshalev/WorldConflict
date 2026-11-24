// DR-INT-2 (design-review-integrated.md): the plan, the Hold card, the review page and the result
// card gave four political capital numbers for the same month and none matched the state band:
// "Political capital 3 stays (above 6 is lost)" with ◆ 0 of 6 in the band (the engine wrote the
// bank before the month's choices), and the result card's "Political capital 5 → 3 (-2)" when the
// player had ◆ 0 left at Execute and started the next month with ◆ 3.
// Rule: one picture of capital (ui/src/lib/budget.ts capitalOutlook). After Choose all recommended
// the plan's capital line names the band's number as what is left and the next month's start; the
// Hold card (Skip of The move for your mission) names the same next-month number; after Execute the
// save starts the next month with exactly that number (the engine, read back through the API), and
// the result card names a choice's capital as spent or gained, never the bank "A → B".
// Scenes: Hormuz Convoy as the United States (seed 4242), months 1 and 2, 1920x1080. Fixed and
// floating elements: the state band and month bar (top), the List (left), the Plan rail with
// Execute (right), the ticker (bottom), the result card over the desk after Execute; none is moved.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-INT-2.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { apiSave, args, openSaved, openThing, run } from './_lib.mjs';

const { out, base, api } = args('DR-INT-2');
const SIZE = process.env.DRINT2_SIZE ?? '1920x1080';

await run('DR-INT-2', async (g) => {
  for (const months of [0, 1]) {
    const sv = await apiSave(api, months, undefined, 'drint2');
    const { browser, page: p, errors } = await openSaved(base, SIZE, sv);
    const where = `month ${months + 1}`;
    try {
      await p.locator('[data-choose-all]').first().click().catch(() => {});
      await p.waitForTimeout(700);
      const band = (await p.locator('.sb-pc').first().innerText()).match(/◆\s*(-?\d+)\s*of/)?.[1];
      const line = await p.locator('.plan [data-capital-line]').first().innerText().catch(() => '');
      const next = line.match(/start next month with ◆ (\d+)/)?.[1];
      g.check(band !== undefined && line.includes(`◆ ${band} left`), `${where}: the plan's capital line says the band's ◆ ${band} is left ("${line}")`);
      g.check(!!next, `${where}: the plan names next month's capital (${next})`);
      const plan = await p.locator('.plan').first().innerText();
      g.check(!/Political capital \d+ stays/.test(plan), `${where}: the plan has no "Political capital n stays"`);
      // The Hold card of the mission move, when the move is still open
      if (await openThing(p, 'The move for your mission')) {
        const hold = await p.locator('article.thing [data-skip]').first().innerText().catch(() => '');
        g.check(!hold || hold.includes(`start next month with ◆ ${next}`), `${where}: the Hold card names next month's ◆ ${next} ("${hold.replace(/\s+/g, ' ').slice(0, 200)}")`);
        await p.screenshot({ path: path.join(out, `m${months + 1}-hold.png`) });
      }
      await p.getByRole('button', { name: /Execute month/ }).first().click();
      await p.locator('.result-card, [data-result-card], .rc').first().waitFor({ timeout: 30000 }).catch(() => {});
      await p.waitForTimeout(2500);
      const after = await fetch(`${api}/load/${sv.save}`).then((r) => r.json());
      const real = after.worldState?.politicalCapital;
      g.check(String(real) === next, `${where}: the engine starts the next month with ◆ ${real}, the plan said ◆ ${next}`);
      const card = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
      g.check(!/Political capital \d+ → \d+/.test(card), `${where}: the result card names no capital "A → B"`);
      await p.screenshot({ path: path.join(out, `m${months + 1}-result.png`) });
      g.check(!errors.length, `${where}: no page errors (${errors.slice(0, 2).join(' | ')})`);
    } finally {
      await browser.close();
    }
  }
});
