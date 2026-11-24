// Month 4 desk, See all, Map, Review, Execute, result, paper, everything at one size.
import { browser, newSave, openSave, shot, facts, text, log, SEATS } from './lib.mjs';
const size = process.argv[2] ?? '3440x1440';
const seatKey = process.argv[3] ?? 'hc';
const months = Number(process.argv[4] ?? 3);
const tag = `${seatKey}-m${months + 1}-${size}`;
const L = `log-tour-${tag}.txt`;
const phone = Number(size.split('x')[0]) <= 700;
const b = await browser();
const sv = await newSave(SEATS[seatKey], months);
const { page } = await openSave(b, size, sv);
const btn = (re) => page.getByRole('button', { name: re }).first();
const tryClick = async (re, t = 2000) => btn(re).click({ timeout: t }).then(() => true, () => false);
await shot(page, `t-${tag}-01-desk`);
log(L, 'desk facts', await facts(page));
log(L, 'desk text', (await text(page)).slice(0, 3000));
if (phone) await shot(page, `t-${tag}-01b-desk-full`, { full: true });
// See all / list
if (await page.locator('.see-all').first().isVisible().catch(() => false)) {
  await page.locator('.see-all').first().click().catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, `t-${tag}-02-seeall`);
  log(L, 'seeall facts', await facts(page));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}
// Map mode
if (await page.getByRole('tab', { name: /Map/ }).first().click({ timeout: 2000 }).then(() => true, () => false)) {
  await page.waitForTimeout(2500);
  await shot(page, `t-${tag}-03-map`);
  log(L, 'map facts', await facts(page));
  log(L, 'map text', (await text(page)).slice(0, 1500));
  await page.getByRole('tab', { name: /Desk/ }).first().click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
// Review
if (phone) {
  for (let i = 0; i < 12; i++) {
    if (await btn(/^(Check and execute|Review your month)/).isVisible().catch(() => false)) break;
    if (!(await page.locator('.ph-bottom .ph-next').first().click({ timeout: 1000 }).then(() => true, () => false))) break;
    await page.waitForTimeout(400);
  }
}
if (await tryClick(/^(Check and execute|Review your month)/)) {
  await page.waitForTimeout(900);
  await shot(page, `t-${tag}-04-review`);
  log(L, 'review facts', await facts(page));
  log(L, 'review text', (await text(page)).slice(0, 2500));
  if (phone) await shot(page, `t-${tag}-04b-review-full`, { full: true });
}
// Execute
if (await tryClick(/^Execute month/, 5000)) {
  await page.waitForTimeout(6000);
  await shot(page, `t-${tag}-05-result`);
  log(L, 'result facts', await facts(page));
  log(L, 'result text', (await text(page)).slice(0, 2500));
  for (const [re, nm] of [[/^(Details|See everything)/, '06-details'], [/See everything/, '07-everything']]) {
    if (await tryClick(re)) {
      await page.waitForTimeout(1500);
      await shot(page, `t-${tag}-${nm}`);
      log(L, `${nm} text`, (await text(page)).slice(0, 2500));
      log(L, `${nm} facts`, await facts(page));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }
  if (await tryClick(/^(Next: the paper|Next|Read the paper|The paper)/)) {
    await page.waitForTimeout(2000);
    await shot(page, `t-${tag}-08-paper`);
    log(L, 'paper facts', await facts(page));
    log(L, 'paper text', (await text(page)).slice(0, 1500));
  }
}
log(L, 'errors', page.errors);
await b.close();
