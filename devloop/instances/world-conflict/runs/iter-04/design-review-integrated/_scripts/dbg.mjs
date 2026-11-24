import { browser, openTitle } from './lib.mjs';
const b = await browser();
const { page } = await openTitle(b);
const c = (re) => page.getByRole('button', { name: re }).first().click({ timeout: 6000 }).catch((e) => console.log(String(re), e.message.split('\n').slice(0, 14).join('\n')));
await c(/^Take office/); await page.waitForTimeout(2500);
await c(/^Take office/); await page.waitForTimeout(2500);
await c(/^All orders/); await page.waitForTimeout(1500);
await c(/^Military \d/);
await b.close();
