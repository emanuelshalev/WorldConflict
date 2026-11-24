import { browser, newSave, openSave, shot, facts, text, log, SEATS } from './lib.mjs';
import { openThing } from 'file:///C:/MyData/git/WorldConflict-agenda/devloop/instances/world-conflict/scenarios-qa/regressions/_lib.mjs';
const L = 'log-misc.txt';
const b = await browser();
const term = { countryId: 'USA', mode: 'TERM', scenarioId: '2026', seed: 4242 };
// 1 Quarantine China month 1 and month 2 at 3440 and 390
for (const [size, months] of [['3440x1440', 0], ['3440x1440', 1], ['390x844', 1]]) {
  const sv = await newSave(SEATS.qu, months);
  const { page: p, ctx } = await openSave(b, size, sv);
  await shot(p, `x-qu-m${months + 1}-${size}`);
  log(L, `qu m${months + 1} ${size}`, (await text(p, '[data-region="item"]')).slice(0, 900), '| plan', (await text(p, '[data-region="plan"]')).slice(0, 500), '| facts', await facts(p));
  await ctx.close();
}
// 2 Term game month 1 and 4 at 3440 and 1366
for (const [size, months] of [['3440x1440', 0], ['3440x1440', 3], ['1366x768', 3]]) {
  let sv;
  try { sv = await newSave(term, months); } catch (e) { log(L, 'term save fail', e.message); break; }
  const { page: p, ctx } = await openSave(b, size, sv);
  await shot(p, `x-term-m${months + 1}-${size}`);
  log(L, `term m${months + 1} ${size}`, (await text(p, '[data-region="state"]')).slice(0, 300), '| bar', (await text(p, '.month-bar')).slice(0, 200), '| facts', await facts(p));
  await ctx.close();
}
// 3 chief setting on, HC month 1 and 2 at 1440
for (const months of [0, 1]) {
  const sv = await newSave(SEATS.hc, months);
  const { page: p, ctx } = await openSave(b, '1440x900', sv, { chief: true });
  await shot(p, `x-hc-chief-m${months + 1}-1440x900`);
  log(L, `chief m${months + 1}`, (await text(p, '[data-region="item"]')).slice(0, 900), '| plan', (await text(p, '[data-region="plan"]')).slice(0, 700));
  await ctx.close();
}
// 4 deputy badge on phone: HC month 2, open a meeting
{
  const sv = await newSave(SEATS.hc, 1);
  const { page: p, ctx } = await openSave(b, '390x844', sv);
  const ok = await openThing(p, 'Prime Minister Donald Tusk calls');
  await p.waitForTimeout(600);
  const badge = await p.evaluate(() => { const e = document.querySelector('article.thing .sel-badge'); if (!e) return null; const r = e.getBoundingClientRect(); return { t: e.textContent.trim(), box: `${Math.round(r.left)}..${Math.round(r.right)} y${Math.round(r.top)}`, vw: innerWidth }; });
  log(L, 'meeting opened', ok, badge);
  await shot(p, 'x-hc-m2-390x844-meeting');
  // choose all then look again for "A deputy goes"
  await p.evaluate(() => document.querySelector('.game')?.scrollTo({ top: 0 }));
  const all = await p.evaluate(() => [...document.querySelectorAll('.sel-badge')].map((e) => e.textContent.trim()));
  log(L, 'badges', all);
  await ctx.close();
}
log(L, 'done');
await b.close();
