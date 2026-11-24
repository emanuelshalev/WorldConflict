// DR-INT-1 (design-review-integrated.md, carried S2-4): at 1920x1080 "Recommended orders" and "The
// move for your mission" put their answer cards in the answers column beside an empty header box:
// columns of 200 to 280 px, bottom-aligned under 350 px of nothing, the adviser quote and the order
// name one or two words per line, the Choose face over the title, after Choose the "Your choice"
// face over the order name, Remove and Undo floating between the cards.
// Rule: on these two things the cards use the Thing's width from the top: every card is at least
// 380 px wide, starts right under its question, its order name and recommendation are whole and
// nothing (the face included) covers them, the name runs on at most two lines, and Undo / Remove
// sit under their own card inside its left and right edges. No page scroll.
// Scenes: Hormuz Convoy as the United States (seed 4242), months 1 and 2, 1920x1080, before and
// after choosing (the move's first card; Choose all recommended for the orders). Fixed and floating
// elements on the month screen: the state band and month bar (top), the List (left column), the
// Plan rail with Execute (right), the ticker (bottom); none is moved by this guard.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-INT-1.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { WHOLE_JS, apiSave, args, openSaved, openThing, run } from './_lib.mjs';

const { out, base, api } = args('DR-INT-1');
const SIZE = process.env.DRINT1_SIZE ?? '1920x1080';

/** Measure the cards of the Thing on screen. */
async function measure(p) {
  return p.evaluate((wholeSrc) => {
    // eslint-disable-next-line no-new-func
    const whole = new Function(`return ${wholeSrc}`)();
    const thing = document.querySelector('article.thing');
    const ask = thing?.querySelector('.ask')?.getBoundingClientRect();
    const bad = [];
    const cards = [...(thing?.querySelectorAll('.opts .opt') ?? [])];
    const box = (el) => el.getBoundingClientRect();
    const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    let top = Infinity;
    for (const c of cards) {
      const r = box(c);
      top = Math.min(top, r.top);
      const name = c.querySelector('.opt-name');
      const label = (name?.textContent ?? '').trim().slice(0, 40);
      if (r.width < 380) bad.push(`"${label}" is ${Math.round(r.width)} px wide`);
      for (const part of [name, c.querySelector('.opt-rec')].filter(Boolean)) {
        const why = whole(part);
        if (why) bad.push(`"${label}" ${part.className}: ${why}`);
        const face = c.querySelector('.face');
        if (face && hit(box(face), box(part))) bad.push(`"${label}": the face (${face.textContent}) covers ${part.className}`);
      }
      if (name) {
        const lh = parseFloat(getComputedStyle(name).lineHeight) || 22;
        const lines = Math.round(box(name).height / lh);
        if (lines > 2) bad.push(`"${label}": the order name runs on ${lines} lines`);
      }
    }
    for (const pair of thing?.querySelectorAll('.opt-pair') ?? []) {
      const card = box(pair.querySelector('.opt'));
      for (const b of pair.querySelectorAll(':scope > .wc-btn')) {
        const r = box(b);
        if (r.left < card.left - 1 || r.right > card.right + 1 || r.top < card.bottom - 1) bad.push(`${b.textContent} is not under its card (${Math.round(r.left)}..${Math.round(r.right)} beside ${Math.round(card.left)}..${Math.round(card.right)})`);
      }
    }
    const gap = ask && cards.length ? Math.round(top - ask.bottom) : null;
    if (gap !== null && gap > 80) bad.push(`the cards start ${gap} px below their question`);
    return { n: cards.length, gap, bad, scroll: document.scrollingElement.scrollHeight > innerHeight + 1 };
  }, WHOLE_JS);
}

await run('DR-INT-1', async (g) => {
  for (const months of [0, 1]) {
    const sv = await apiSave(api, months, undefined, 'drint1');
    const { browser, page: p, errors } = await openSaved(base, SIZE, sv);
    try {
      for (const [title, choose] of [
        ['The move for your mission', async () => p.locator('article.thing .opts .opt-pair > .opt').first().click()],
        ['Recommended orders', async () => p.locator('[data-choose-all]').first().click()],
      ]) {
        // "Recommended orders (n)": the row's title carries its count
        const row = await p.locator('.lrow .lrow-t > b').filter({ hasText: title }).first().innerText().catch(() => title);
        if (!(await openThing(p, row.trim()))) {
          g.check(title !== 'The move for your mission' || months > 0, `month ${months + 1}: "${title}" is on the List`);
          continue;
        }
        for (const when of ['before', 'after']) {
          if (when === 'after') {
            await choose().catch(() => {});
            await p.waitForTimeout(700);
            await openThing(p, row.trim());
            await p.waitForTimeout(500);
          }
          const m = await measure(p);
          const where = `month ${months + 1} "${title}" ${when} choosing`;
          g.check(m.n >= 1, `${where}: its cards are read (${m.n})`);
          g.check(!m.bad.length, `${where}: cards wide, from the top, nothing covered (gap ${m.gap} px)${m.bad.length ? ` [${m.bad.slice(0, 4).join('; ')}]` : ''}`);
          g.check(!m.scroll, `${where}: no page scroll`);
          await p.screenshot({ path: path.join(out, `m${months + 1}-${title.split(' ')[0].toLowerCase()}-${when}.png`) });
        }
      }
      g.check(!errors.length, `month ${months + 1}: no page errors (${errors.slice(0, 2).join(' | ')})`);
    } finally {
      await browser.close();
    }
  }
});
