import { browser, newSave, openSave, shot, facts, text, log, SEATS } from './lib.mjs';
const size = process.argv[2] ?? '390x844';
const seatKey = process.argv[3] ?? 'hc';
const months = Number(process.argv[4] ?? 3);
const tag = `${seatKey}-m${months + 1}-${size}`;
const L = `log-phone-${tag}.txt`;
const b = await browser();
const sv = await newSave(SEATS[seatKey], months);
const { page } = await openSave(b, size, sv, { coach: months === 0 });
const bar = () => page.evaluate(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return `${Math.round(b.top)}..${Math.round(b.bottom)}`; }; return { top: r('.game-top'), bottom: r('.ph-bottom'), sheet: r('.ph-sheet'), close: r('.ph-sheet .al-close, .ph-sheet button'), leave: r('.ph-leave'), badge: r('article.thing .sel-badge'), coach: r('.coach-bubble') }; });
log(L, 'desk', await facts(page), await bar());
await shot(page, `p-${tag}-01-desk`);
// See all sheet
await page.getByRole('button', { name: /^See all/ }).first().click().catch(() => {});
await page.waitForTimeout(700);
log(L, 'sheet', await bar());
await shot(page, `p-${tag}-02-sheet-open`);
await page.evaluate(() => document.querySelector('.game')?.scrollBy(0, 400));
await page.waitForTimeout(400);
log(L, 'sheet scrolled', await bar());
await shot(page, `p-${tag}-02b-sheet-scrolled`);
await page.getByRole('button', { name: /^See all/ }).first().click().catch(() => {});
await page.waitForTimeout(500);
log(L, 'after See all again', await bar());
// State sheet
await page.getByRole('button', { name: /^State/ }).first().click().catch(() => {});
await page.waitForTimeout(600);
await shot(page, `p-${tag}-03-state`);
log(L, 'state sheet', (await text(page, '.sb-sheet')).slice(0, 600));
await page.getByRole('button', { name: /^State/ }).first().click().catch(() => {});
await page.waitForTimeout(400);
// Walk through things with Next, screenshot each
for (let i = 0; i < 12; i++) {
  const nx = page.locator('.ph-bottom .ph-next').first();
  const t = (await nx.innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (!t) break;
  await nx.click().catch(() => {});
  await page.waitForTimeout(700);
  log(L, `next ${i}: ${t}`, await bar());
  await shot(page, `p-${tag}-04-thing${i}`);
  if (/Review your month/.test(t)) break;
}
log(L, 'review', await facts(page), (await text(page)).slice(0, 1500));
await shot(page, `p-${tag}-05-review`);
await shot(page, `p-${tag}-05b-review-full`, { full: true });
if (await page.getByRole('button', { name: /^Execute month/ }).first().click({ timeout: 4000 }).then(() => true, () => false)) {
  await page.waitForTimeout(6000);
  await shot(page, `p-${tag}-06-result`);
  log(L, 'result', await facts(page), (await text(page)).slice(0, 1500));
  await page.evaluate(() => document.querySelector('.game')?.scrollBy(0, 800));
  await page.waitForTimeout(400);
  await shot(page, `p-${tag}-06b-result-scrolled`);
}
log(L, 'errors', page.errors);
await b.close();
