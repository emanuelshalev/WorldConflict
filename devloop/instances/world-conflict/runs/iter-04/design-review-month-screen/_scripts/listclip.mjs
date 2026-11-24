import { browser, newSave, openSave, shot, log, SEATS } from './lib.mjs';
const b = await browser();
for (const [size, months] of [['1920x1080', 1], ['1920x1080', 4], ['2560x1440', 4]]) {
  const sv = await newSave(SEATS.hc, months);
  const { page: p, ctx } = await openSave(b, size, sv);
  const probe = () => p.evaluate(() => {
    const L = document.querySelector('[data-region="list"]');
    if (!L) return 'no list';
    const r = L.getBoundingClientRect();
    const rows = [...L.querySelectorAll('.lrow')];
    const last = rows.at(-1)?.getBoundingClientRect();
    const s = getComputedStyle(L);
    const tick = document.querySelector('.ticker')?.getBoundingClientRect();
    return { list: `${Math.round(r.top)}..${Math.round(r.bottom)} oy=${s.overflowY} sh=${L.scrollHeight} ch=${L.clientHeight}`, rows: rows.length, last: last ? `${Math.round(last.top)}..${Math.round(last.bottom)}` : null, ticker: tick ? Math.round(tick.top) : null, form: L.dataset.form };
  });
  log('log-listclip.txt', size, `m${months + 1}`, 'before', await probe());
  await p.getByRole('button', { name: /^Choose all recommended/ }).first().click({ timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(900);
  log('log-listclip.txt', size, `m${months + 1}`, 'after choose all', await probe());
  await shot(p, `l-${size}-m${months + 1}-after-choose-all`);
  await ctx.close();
}
await b.close();
