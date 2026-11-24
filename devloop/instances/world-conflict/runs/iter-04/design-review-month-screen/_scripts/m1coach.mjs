import { browser, newSave, openSave, shot, facts, text, log, SEATS } from './lib.mjs';
const seatKey = process.argv[2] ?? 'hc';
const sizes = (process.argv[3] ?? '1920x1080,1440x900,1366x768,1024x768').split(',');
const b = await browser();
const coachInfo = (p) => p.evaluate(() => {
  const c = [...document.querySelectorAll('.coach-bubble')].find((e) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== 'hidden');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  const hits = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4,button,a[href],[role=tab],.opt,.prow,.lrow')) {
    if (c.contains(el)) continue;
    const q = el.getBoundingClientRect();
    if (q.width === 0 || q.height === 0) continue;
    const ix = Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left));
    const iy = Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top));
    if (ix * iy > 4) hits.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 30)}" ${Math.round((ix * iy) / (q.width * q.height) * 100)}%`);
  }
  return { text: c.innerText.replace(/\s+/g, ' ').slice(0, 70), box: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`, covers: hits };
});
for (const size of sizes) {
  const L = `log-m1coach-${seatKey}-${size}.txt`;
  const sv = await newSave(SEATS[seatKey], 0);
  const { page: p, ctx } = await openSave(b, size, sv, { coach: true });
  await shot(p, `m1c-${seatKey}-${size}-1`);
  log(L, 'step1', await coachInfo(p));
  log(L, 'facts', await facts(p));
  // choose first answer
  await p.getByRole('button', { name: /^Choose$/ }).first().click({ timeout: 3000 }).catch((e) => log(L, 'choose fail', e.message.split('\n')[0]));
  await p.waitForTimeout(1200);
  await shot(p, `m1c-${seatKey}-${size}-2`);
  log(L, 'after choose', await coachInfo(p), (await text(p, '.month-bar')).slice(0, 200));
  log(L, 'state', (await text(p, '[data-region="state"]')).slice(0, 250));
  // go to the recommended orders thing
  for (let i = 0; i < 3; i++) {
    await p.getByRole('button', { name: /^Next/ }).first().click({ timeout: 2000 }).catch(() => {});
    await p.waitForTimeout(900);
    log(L, `next ${i}`, (await text(p, '.month-bar')).slice(0, 120), await coachInfo(p));
    await shot(p, `m1c-${seatKey}-${size}-3-${i}`);
  }
  await ctx.close();
}
await b.close();
