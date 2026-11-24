import { browser, newSave, openSave, shot, log, SEATS } from './lib.mjs';
import { openThing } from 'file:///C:/MyData/git/WorldConflict-agenda/devloop/instances/world-conflict/scenarios-qa/regressions/_lib.mjs';
const b = await browser();
for (const size of ['390x844', '360x740']) {
  const sv = await newSave(SEATS.hc, 1);
  const { page: p, ctx } = await openSave(b, size, sv);
  await openThing(p, 'Prime Minister Donald Tusk calls');
  const skip = p.locator('article.thing button.opt').last();
  await skip.scrollIntoViewIfNeeded().catch(() => {});
  await skip.click().catch((e) => log('log-deputy.txt', 'skip fail', e.message.split('\n')[0]));
  await p.waitForTimeout(900);
  await openThing(p, 'Prime Minister Donald Tusk calls');
  await p.waitForTimeout(500);
  const info = await p.evaluate(() => { const e = document.querySelector('article.thing .sel-badge'); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); let clip = false; for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.overflowX !== 'visible') { const q = a.getBoundingClientRect(); if (r.right > q.right + 1 || r.left < q.left - 1) clip = true; } } return { t: e.textContent.trim(), l: Math.round(r.left), r: Math.round(r.right), h: Math.round(r.height), vw: innerWidth, clip }; });
  log('log-deputy.txt', size, info);
  await shot(p, `d-${size}-meeting-skipped`);
  await ctx.close();
}
await b.close();
