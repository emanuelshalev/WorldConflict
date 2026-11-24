// QA4-S2-4 (runs/iter-04/qa-verify.md): at 1366x768 every answer card of a call showed only its
// "Hurts" tag. The Thing folds detail to fit (data-fit 2 and 3, layout.css) and the "Helps" part of
// a mixed answer (DR-INT-4, data-mt-also) went with the effect words, so a card that helps one goal
// and hurts another read as only hurting the mission.
// Rule: a folded card may be shorter, never one-sided. On every crisis answer card whose label (the
// engine's mission tag, in its aria-label) names both a goal it helps and a goal it hurts or breaks,
// the visible card text says both helps and hurts/breaks, at every fit level the screen gives (the
// folded desk card and the short Map card in one line: "Mixed: hurts 1 goal, helps 1."), and no
// answer card is cut off.
// Scenes: Hormuz Convoy as the United States (seed 4242), months 1 and 4 (QA4S24_MONTHS for all), every crisis on the List,
// desk at 1920x1080, 1440x900, 1366x768 and 1024x768, and the Map mode card at 1920x1080 and
// 1366x768. Fixed and floating elements: the state band, the List, the Plan, the ticker; none moved.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/QA4-S2-4.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { apiSave, args, openSaved, openThing, run } from './_lib.mjs';

const { out, base, api } = args('QA4-S2-4');
const SIZES = (process.env.QA4S24_SIZES ?? '1920x1080,1440x900,1366x768,1024x768').split(',');
const MAP_SIZES = new Set(['1920x1080', '1366x768']);
// Months 1 and 4 by default (month 1 folds the desk at 1366, month 4 has the two-line Map card): the
// gate runs a guard for at most 300 s. QA4S24_MONTHS=1,2,3,4 sweeps every month.
const MONTHS = (process.env.QA4S24_MONTHS ?? '1,4').split(',').map((m) => Number(m) - 1);

/** The answer cards on screen: label (aria), visible text, the fit level of the region. */
const cards = (p) =>
  p.evaluate(() =>
    [...document.querySelectorAll('article.thing .opts .opt')].map((c) => ({
      aria: c.getAttribute('aria-label') ?? '',
      text: (c.querySelector('.opt-fx')?.innerText ?? '').replace(/\s+/g, ' '),
      fit: c.closest('[data-fit]')?.getAttribute('data-fit') ?? '-',
      // Cut off by the region that holds it (the Thing or the Map card never scrolls)
      cut: c.getBoundingClientRect().bottom > (c.closest('[data-region="item"]')?.getBoundingClientRect().bottom ?? innerHeight) + 1,
    })),
  );

/** One-sided: the label names a help and a hurt, the visible card only one of them. */
const oneSided = (c) => {
  const mixed = /\bHelps:/.test(c.aria) && /\b(Hurts|Breaks):/.test(c.aria);
  if (!mixed) return false;
  // A folded desk card and the short Map card fold both sides into one line ("Mixed: hurts 1 goal, helps 1.")
  return !(/\bhelps\b/i.test(c.text) && /\b(hurts|breaks)\b/i.test(c.text));
};

await run('QA4-S2-4', async (g) => {
  let mixedSeen = 0;
  const fits = new Set();
  for (const months of MONTHS) {
    const sv = await apiSave(api, months, undefined, 'qa4s24');
    for (const size of SIZES) {
      const { browser, page: p, errors } = await openSaved(base, size, sv);
      try {
        // The List is folded behind See all on short screens (1366x768): open it to read the titles
        // Crises and meetings only: their answer cards carry the mission tag
        const rows = p.locator('.lrow[data-agenda-item="crisis"] .lrow-t > b, .lrow[data-agenda-item="meeting"] .lrow-t > b');
        const folded = !(await p.locator('.lrow').first().isVisible().catch(() => false));
        if (folded) {
          await p.locator('.see-all').first().click({ timeout: 3000 }).catch(() => {});
          await p.waitForTimeout(400);
        }
        const titles = (await rows.allInnerTexts()).filter((t) => t.trim());
        if (folded) {
          // Close the List again (See all toggles it), so the cards are measured as a player sees them
          await p.locator('.see-all').first().click({ timeout: 3000 }).catch(() => {});
          await p.waitForTimeout(400);
        }
        g.check(titles.length > 0, `month ${months + 1} ${size}: the month's crises and meetings are read from the List (${titles.length})`);
        const modes = MAP_SIZES.has(size) ? ['desk', 'map'] : ['desk'];
        for (const mode of modes) {
          if (mode === 'map') {
            await p.getByRole('tab', { name: /Map/ }).first().click();
            await p.waitForTimeout(1200);
          }
          for (const title of titles) {
            if (!(await openThing(p, title.trim()))) continue;
            await p.waitForTimeout(500);
            const cs = await cards(p);
            const mixed = cs.filter((c) => /\bHelps:/.test(c.aria) && /\b(Hurts|Breaks):/.test(c.aria));
            if (!mixed.length) continue;
            mixedSeen += mixed.length;
            for (const c of cs) fits.add(`${mode}:${c.fit}`);
            const bad = cs.filter(oneSided);
            const where = `month ${months + 1} ${size} ${mode} "${title.trim()}" (fit ${cs[0]?.fit})`;
            g.check(!bad.length, `${where}: every mixed answer shows its Helps and its Hurts${bad.length ? ` [${bad.map((c) => `"${c.aria.split('.')[0]}" shows "${c.text.slice(0, 80)}"`).slice(0, 2).join('; ')}]` : ''}`);
            const cut = cs.filter((c) => c.cut);
            g.check(!cut.length, `${where}: no answer card is cut off${cut.length ? ` [${cut.map((c) => c.aria.split('.')[0]).join('; ')}]` : ''}`);
            if (months === 0 && size === '1366x768') await p.screenshot({ path: path.join(out, `m1-${size}-${mode}.png`) });
          }
        }
        g.check(!errors.length, `month ${months + 1} ${size}: no page errors (${errors.slice(0, 2).join(' | ')})`);
      } finally {
        await browser.close();
      }
    }
  }
  // The case QA saw: a mixed answer folded at a fit level that drops the detail lines
  g.check(mixedSeen > 0, `mixed answers were read (${mixedSeen})`);
  g.check([...fits].some((f) => /:(2|3)$/.test(f)), `a folded card was read (fit levels seen: ${[...fits].sort().join(', ')})`);
});
