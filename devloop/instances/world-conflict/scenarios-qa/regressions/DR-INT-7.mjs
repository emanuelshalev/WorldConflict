// DR-INT-7 (design-review-integrated.md, carried review page item): "Check and execute" listed bare
// answers ("Promise full support" twice, "your Chief of Staff takes it", "Spy on Iran, Mobilize
// forces") without what they answer or what they cost, repeated the untrue capital line of DR-INT-2,
// and filled the left two thirds of the top half of the screen.
// Rule: every "You chose" row names what it answers and shows its cost (◆ n, Free or Gives ◆ n),
// whole and uncovered, the answer starts with a capital; the page's capital line states the band's
// number as what is left; the rows and the Execute block use the item's width (together at least
// 90% of it, the Execute block reaching its right edge). No page scroll.
// Scenes: Hormuz Convoy as the United States (seed 4242), months 2 and 4, 1920x1080: Choose all
// recommended, the month's crisis call answered on its first card, then Check and execute. Fixed
// and floating elements: the state band and month bar (top), the List (left), the ticker (bottom);
// the Plan rail gives its place to the review page (Desk.tsx); none is moved by this guard.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-INT-7.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { WHOLE_JS, apiSave, args, openSaved, run } from './_lib.mjs';

const { out, base, api } = args('DR-INT-7');
const SIZE = process.env.DRINT7_SIZE ?? '1920x1080';

await run('DR-INT-7', async (g) => {
  for (const months of [1, 3]) {
    const sv = await apiSave(api, months, undefined, 'drint7');
    const { browser, page: p, errors } = await openSaved(base, SIZE, sv);
    const where = `month ${months + 1}`;
    try {
      await p.locator('[data-choose-all]').first().click().catch(() => {});
      await p.waitForTimeout(600);
      // Answer the first crisis call still open on its first card
      const call = p.locator('.lrow').filter({ hasText: 'Your call' }).filter({ hasNotText: 'move for your mission' }).first();
      if (await call.isVisible().catch(() => false)) {
        await call.click();
        await p.waitForTimeout(600);
        await p.locator('article.thing .opts > .opt:not(.skipopt)').first().click().catch(() => {});
        await p.waitForTimeout(600);
      }
      await p.getByRole('button', { name: /^Check and execute/ }).first().click();
      await p.waitForTimeout(1000);
      const m = await p.evaluate((wholeSrc) => {
        // eslint-disable-next-line no-new-func
        const whole = new Function(`return ${wholeSrc}`)();
        const rows = [...document.querySelectorAll('[data-review-row="chose"]')].map((r) => {
          const q = r.querySelector('[data-rv-q]');
          const c = r.querySelector('[data-rv-cost]');
          const a = r.querySelector('.rv-a b');
          return { q: q?.textContent?.trim() ?? '', a: a?.textContent?.trim() ?? '', cost: c?.textContent?.trim() ?? '', bad: [q && whole(q), c && whole(c), a && whole(a)].filter(Boolean) };
        });
        const item = document.querySelector('main.item')?.getBoundingClientRect();
        const rv = document.querySelector('.rv-rows')?.getBoundingClientRect();
        const ex = document.querySelector('.rv-exec')?.getBoundingClientRect();
        const band = document.querySelector('.sb-pc')?.textContent ?? '';
        const line = document.querySelector('.review-page [data-capital-line]')?.textContent ?? '';
        return {
          rows,
          used: item && rv && ex ? (Math.max(rv.right, ex.right) - Math.min(rv.left, ex.left)) / (item.width - 2 * parseFloat(getComputedStyle(document.querySelector('main.item')).paddingLeft)) : 0,
          exRight: item && ex ? Math.round(item.right - parseFloat(getComputedStyle(document.querySelector('main.item')).paddingRight) - ex.right) : 999,
          band: band.match(/◆\s*(-?\d+)\s*of/)?.[1] ?? null,
          line,
          scroll: document.scrollingElement.scrollHeight > innerHeight + 1,
        };
      }, WHOLE_JS);
      g.check(m.rows.length >= 3, `${where}: the You chose rows are read (${m.rows.length})`);
      const bad = [];
      for (const r of m.rows) {
        if (!r.q) bad.push(`"${r.a}" says nothing of what it answers`);
        if (!/^(◆ \d+|Free|Gives ◆ \d+)$/.test(r.cost)) bad.push(`"${r.a}" shows no cost ("${r.cost}")`);
        if (/^[a-z]/.test(r.a)) bad.push(`"${r.a}" starts in lower case`);
        if (r.bad.length) bad.push(`"${r.a}": ${r.bad.join(', ')}`);
      }
      g.check(!bad.length, `${where}: every row says what it answers and what it costs (${m.rows.map((r) => `${r.q} / ${r.a} / ${r.cost}`).join(' | ').slice(0, 300)})${bad.length ? ` [${bad.slice(0, 4).join('; ')}]` : ''}`);
      g.check(m.band !== null && m.line.includes(`◆ ${m.band} left`), `${where}: the capital line says the band's ◆ ${m.band} is left ("${m.line}")`);
      g.check(!/stays \(above/.test(await p.locator('.review-page').innerText()), `${where}: no "Political capital n stays (above 6 is lost)"`);
      g.check(m.used >= 0.9 && m.exRight <= 4, `${where}: the page uses the item's width (${Math.round(m.used * 100)}%, Execute block ${m.exRight} px from the right edge)`);
      g.check(!m.scroll, `${where}: no page scroll`);
      await p.screenshot({ path: path.join(out, `m${months + 1}-review.png`) });
      g.check(!errors.length, `${where}: no page errors (${errors.slice(0, 2).join(' | ')})`);
    } finally {
      await browser.close();
    }
  }
});
