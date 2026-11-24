// Title -> Take office -> whatever comes, dumping each screen.
import { browser, openTitle, shot, facts, text, buttons, mkLog } from './lib.mjs';
const log = mkLog('log-explore2.txt');
const b = await browser();
const { page } = await openTitle(b);
await page.getByRole('button', { name: /^Take office/ }).click();
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(3500);
  await shot(page, `x02-step${i}`);
  log(`--- step ${i} text`, (await text(page)).slice(0, 2500));
  log(`step ${i} buttons`, await buttons(page));
  log(`step ${i} facts`, await facts(page));
  const next = page.getByRole('button', { name: /^(Begin|Start|Continue|Next|Got it|Enter|To the desk|Take your seat)/ }).first();
  if (!(await next.isVisible().catch(() => false))) break;
  log('clicking', await next.innerText());
  await next.click();
}
log('errors', page.errors);
await b.close();
