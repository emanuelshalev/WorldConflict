// Probe month 1 of the newcomer path: each step dumps text, buttons, facts.
import { browser, openTitle, shot, facts, text, buttons, mkLog } from './lib.mjs';
const log = mkLog('log-probe.txt');
const b = await browser();
const { page } = await openTitle(b);
const btn = (re) => page.getByRole('button', { name: re }).first();
const tryClick = async (re, t = 3000) => btn(re).click({ timeout: t }).then(() => true, (e) => { log('MISS', String(re), e.message.split('\n')[0]); return false; });
const dump = async (tag, n = 2500) => { await shot(page, `p-${tag}`); log(`--- ${tag} text`, (await text(page)).slice(0, n)); log(`${tag} buttons`, await buttons(page)); log(`${tag} facts`, await facts(page)); };
await tryClick(/^Take office/);
await page.waitForTimeout(3000);
// briefing overlay top
await page.evaluate(() => document.querySelector('.briefing-overlay')?.scrollTo(0, 0));
await dump('01-briefing-top', 600);
await tryClick(/^Take office/);
await page.waitForTimeout(3000);
await dump('02-desk-m1');
// "Ask your staff" and "How much?" on the call
await tryClick(/^How much\?/);
await page.waitForTimeout(800);
await dump('03-howmuch', 1500);
await page.keyboard.press('Escape');
await tryClick(/^Ask your staff/);
await page.waitForTimeout(1500);
await dump('04-askstaff', 1500);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
log('errors', page.errors);
await b.close();
