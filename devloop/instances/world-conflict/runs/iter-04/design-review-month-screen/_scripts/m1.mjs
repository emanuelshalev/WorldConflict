// Newcomer: title to first Execute, coach on, at a size.
import { browser, openTitle, shot, facts, text, log, SEATS } from './lib.mjs';
const size = process.argv[2] ?? '3440x1440';
const seatKey = process.argv[3] ?? 'hc';
const L = `log-m1-${seatKey}-${size}.txt`;
const b = await browser();
const { page } = await openTitle(b, size, SEATS[seatKey]);
const tag = `${seatKey}-${size}`;
await shot(page, `m1-${tag}-01-title`);
await page.getByRole('button', { name: /^Take office/i }).first().click({ timeout: 15000 });
await page.waitForTimeout(2500);
await shot(page, `m1-${tag}-02-after-take-office`);
log(L, 'after take office', (await text(page)).slice(0, 600));
for (let i = 0; i < 4; i++) {
  const ok = await page.getByRole('button', { name: /^(Take office|Begin|Start|To the desk|Go to the desk|Continue)/i }).first().click({ timeout: 1500 }).then(() => true, () => false);
  if (!ok) break;
  await page.waitForTimeout(1800);
  await shot(page, `m1-${tag}-03-step${i}`);
  log(L, `step ${i}`, (await text(page)).slice(0, 400));
}
await page.waitForTimeout(1500);
await shot(page, `m1-${tag}-04-desk`);
log(L, 'desk facts', await facts(page));
log(L, 'desk text', (await text(page)).slice(0, 2500));
log(L, 'errors', page.errors);
await b.close();
