// Capabilities check on a month 2 save (Hormuz, United States): own orders, search, mission, explain,
// your country, menu (advisers, cabinet, codex), Everything view, See all in Map, map country click.
import { browser, newSave, openSave, shot, facts, text, buttons, mkLog, clicker } from './lib.mjs';
const log = mkLog('log-extras.txt');
const b = await browser();
const sv = await newSave({ flashpointId: 'hormuz-convoy', countryId: 'USA', seed: 4242, mode: 'FLASHPOINT' }, 1);
const { page } = await openSave(b, sv);
const c = clicker(page, log);
const NAV = /^(Mission:|Explain|Your country|Score|Desk|Map @|Some help|Sound|Menu|Whole world|Zoom|Hide)/;
const dump = async (tag, n = 1500) => { await shot(page, `x-${tag}`); log(`--- ${tag} text`, (await text(page)).slice(0, n)); log(`${tag} buttons`, (await buttons(page)).filter((x) => !NAV.test(x)).slice(0, 60)); log(`${tag} facts`, await facts(page)); };
await dump('01-desk-m2', 400);
await c(/^Your own orders/); await page.waitForTimeout(1500);
await dump('02-own-orders', 2500);
// search
const s = page.getByPlaceholder(/Search/).first();
if (await s.isVisible().catch(() => false)) { await s.fill('sanction'); await page.waitForTimeout(1200); await dump('03-search-sanction', 1500); await s.fill(''); }
await c(/^Back to the month/); await page.waitForTimeout(800);
// Everything view on the desk
await c(/^Everything$/); await page.waitForTimeout(1500);
await dump('04-desk-everything', 2500);
await c(/^One at a time$/); await page.waitForTimeout(1000);
// Mission
await page.locator('button', { hasText: /^Mission:/ }).first().click().catch((e) => log('MISS mission', e.message.split('\n')[0]));
await page.waitForTimeout(1200);
await dump('05-mission', 1500);
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
await c(/^Explain$/); await page.waitForTimeout(1000);
await dump('06-explain', 1200);
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
await c(/^Your country/); await page.waitForTimeout(1000);
await dump('07-your-country', 1200);
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
await c(/^Menu$/); await page.waitForTimeout(1000);
await dump('08-menu', 1200);
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
// Map: See all, click on Iran region via country picker in map? click the "Whole world" then a country label
await c(/^Map$/); await page.waitForTimeout(3500);
await c(/^See all/); await page.waitForTimeout(1200);
await dump('09-map-seeall', 1200);
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
log('errors', page.errors);
await b.close();
