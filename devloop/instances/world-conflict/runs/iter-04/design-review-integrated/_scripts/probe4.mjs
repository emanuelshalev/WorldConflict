// Probe: catalogue target, families, add order, danger confirmation, map, review, execute, result, paper.
import { browser, openTitle, shot, facts, text, buttons, mkLog, clicker } from './lib.mjs';
const log = mkLog('log-probe4.txt');
const b = await browser();
const { page } = await openTitle(b);
const c = clicker(page, log);
const NAV = /^(Mission:|Explain|Your country|Score|Desk|Map @|Some help|Sound|Menu|Whole world|Zoom|Relations @|Regimes|Military @1439|Economic|Stability @|Intel|Nuclear @1747|Guide|Hide|The January clock|The move for|Recommended orders|See the meetings|All orders @30)/;
const dump = async (tag, from = 0, n = 1800) => { await shot(page, `p-${tag}`); const t = await text(page); log(`--- ${tag} text`, t.slice(from, from + n)); log(`${tag} buttons`, (await buttons(page)).filter((x) => !NAV.test(x))); log(`${tag} facts`, await facts(page)); };
await c(/^Take office/); await page.waitForTimeout(2500);
await c(/^Take office/); await page.waitForTimeout(2500);
await c(/Reply via Muscat/); await page.waitForTimeout(800);
await c(/^All orders/); await page.waitForTimeout(1200);
await c(/^Target: choose a country/); await page.waitForTimeout(900);
await dump('30-target-open', 700);
await c(/^Iran\b/); await page.waitForTimeout(1200);
await dump('31-target-iran', 700);
await c(/^Military \d/); await page.waitForTimeout(1000);
await dump('32-military', 700);
await c(/^Economy \d/); await page.waitForTimeout(1000);
await dump('33-economy', 700);
await c(/^Diplomacy \d/); await page.waitForTimeout(800);
// add Denounce Iran (free)
const den = page.locator('[aria-label^="Denounce"]').first();
log('denounce label', await den.getAttribute('aria-label').catch(() => null));
await den.click({ timeout: 5000 }).catch((e) => log('MISS den', e.message.split('\n')[0]));
await page.waitForTimeout(1200);
await dump('34-denounce-click', 700);
log('errors', page.errors);
await b.close();
