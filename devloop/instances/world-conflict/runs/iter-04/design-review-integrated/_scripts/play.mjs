// Newcomer path: title, default Flashpoint (Hormuz Convoy, United States), months 1 to N, one browser page.
import { browser, openTitle, shot, facts, text, buttons, mkLog, clicker } from './lib.mjs';
const MONTHS = Number(process.argv[2] ?? 4);
const P = process.argv[3] ?? 'h';
const log = mkLog(`log-play-${P}.txt`);
const b = await browser();
const { page } = await openTitle(b);
const c = clicker(page, log);
const NAV = /^(Mission:|Explain|Your country|Score|Desk|Map @|Some help|Sound|Menu|Whole world|Zoom|Relations @|Regimes|Military @1439|Economic|Stability @|Intel|Nuclear @1747|Guide|Hide)/;
const dump = async (tag, n = 2600, from = 0) => { await shot(page, `${P}-${tag}`); const t = await text(page); log(`--- ${tag} text`, t.slice(from, from + n)); log(`${tag} buttons`, (await buttons(page)).filter((x) => !NAV.test(x))); log(`${tag} facts`, await facts(page)); return t; };
const stateLine = async () => (await page.locator('[data-region="state"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');

if (process.argv[4] === 'term') {
  await page.getByText('One Term', { exact: true }).first().click().catch((e) => log('MISS term tab', e.message.split('\n')[0]));
  await page.waitForTimeout(2500);
  await shot(page, `${P}-00-title-term`);
  log('term title text', (await text(page)).slice(0, 2500));
  log('term title buttons', await buttons(page));
}
await c(/^(Take office|Begin|Start)/); await page.waitForTimeout(2500);
await shot(page, `${P}-00-briefing`);
await c(/^Take office/); await page.waitForTimeout(3000);

for (let m = 1; m <= MONTHS; m++) {
  const M = `m${m}`;
  log(`=========== MONTH ${m}`);
  await dump(`${M}-01-desk`);
  // List items
  const items = await page.evaluate(() => [...document.querySelectorAll('button, [role=button]')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter((t) => / Open$/.test(t)));
  log('list items', items);
  const calls = items.filter((t) => /Your call/.test(t));
  // answer the first call: open it, choose its first answer card (not Skip)
  if (calls.length) {
    const name = calls[0].split(' Your call')[0];
    await page.getByRole('button', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first().click().catch((e) => log('MISS open call', e.message.split('\n')[0]));
    await page.waitForTimeout(1200);
    const opts = page.locator('.opts > button, .opts [role=button], .opts .opt button');
    const n = await opts.count();
    log('call option count', n, await opts.allInnerTexts().catch(() => []));
    await shot(page, `${P}-${M}-02-call`);
    // pick the last non-skip answer that is enabled
    let picked = false;
    for (let i = 0; i < n && !picked; i++) {
      const o = opts.nth(i);
      const t = (await o.innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (/^(Leave it open|Hold this month|Skip)/.test(t) || (await o.isDisabled().catch(() => true))) continue;
      if (i === 0 && n > 2) continue; // prefer a middle answer
      picked = await o.click({ timeout: 4000 }).then(() => true, () => false);
      if (picked) log('answered', name, '->', t.slice(0, 80));
    }
    await page.waitForTimeout(1000);
    await dump(`${M}-03-after-answer`, 1200, 0);
  }
  // recommended orders: open then Choose all recommended
  await c(/^Recommended orders/, 4000); await page.waitForTimeout(1000);
  if (m === 1 || m === 3) await shot(page, `${P}-${M}-04-recommended`);
  const ca = page.getByRole('button', { name: /^Choose all recommended/ }).first();
  log('choose-all label', await ca.innerText().catch(() => null), 'disabled', await ca.isDisabled().catch(() => null));
  await ca.click({ timeout: 4000 }).catch(() => log('choose all not clicked'));
  await page.waitForTimeout(1200);
  await dump(`${M}-05-after-choose-all`, 3000, 0);
  // All orders: two families, a targeted order, a danger order to its confirmation
  if (!(await page.getByRole('button', { name: /^All orders/ }).first().isVisible().catch(() => false))) { await c(/^Your own orders/); await page.waitForTimeout(1200); if (m === 2) await dump(`${M}-05b-own-orders`, 1500, 0); }
  await c(/^All orders/); await page.waitForTimeout(1200);
  const trig = page.locator('[aria-label^="Target country:"]').first();
  const tl = (await trig.getAttribute('aria-label').catch(() => '')) ?? '';
  log('target trigger', tl);
  if (!/Iran/.test(tl)) {
    await trig.click({ timeout: 4000 }).catch((e) => log('MISS trig', e.message.split('\n')[0]));
    await page.waitForTimeout(700);
    await page.locator('[role=listbox][aria-label=Countries] [role=option]', { hasText: 'Iran' }).first().click({ timeout: 4000 }).catch((e) => log('MISS iran opt', e.message.split('\n')[0]));
    await page.waitForTimeout(900);
  }
  await c(/^Military \d/); await page.waitForTimeout(900);
  if (m === 2) await shot(page, `${P}-${M}-06-military`);
  await c(/^Covert \d/); await page.waitForTimeout(900);
  if (m <= 2) await dump(`${M}-07-covert`, 600, 0);
  await c(/^Diplomacy \d/); await page.waitForTimeout(800);
  await page.locator('[aria-label^="Denounce Iran"]').first().click({ timeout: 4000 }).then(() => log('denounce added'), (e) => log('MISS denounce', e.message.split('\n')[0]));
  await page.waitForTimeout(900);
  // danger: Strike nuclear sites in Iran
  await c(/^Military \d/); await page.waitForTimeout(800);
  const strike = page.locator('[aria-label^="Strike nuclear sites in Iran"]').first();
  log('strike label', await strike.getAttribute('aria-label').catch(() => null));
  await strike.click({ timeout: 4000 }).catch((e) => log('MISS strike', e.message.split('\n')[0]));
  await page.waitForTimeout(1200);
  await dump(`${M}-08-danger`, 1500, 0);
  // back out of the confirmation without confirming
  const back = page.locator('[data-confirm-cancel]').first();
  if (await back.isVisible().catch(() => false)) { log('cancel via', await back.innerText()); await back.click().catch(() => {}); } else log('no confirmation face');
  await page.waitForTimeout(800);
  await c(/^Back to the month/); await page.waitForTimeout(1000);
  // Map mode, from the month's crisis
  await page.locator('button', { hasText: /Your call/ }).first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
  await c(/^Map$/); await page.waitForTimeout(3500);
  await dump(`${M}-09-map`, 1500, 0);
  if (m === 1) {
    // do one thing: open the second thing on the map (Next) and screenshot
    await c(/^Next:/); await page.waitForTimeout(2500);
    await dump(`${M}-10-map-next`, 800, 0);
  } else {
    await c(/^Relations$/); await page.waitForTimeout(1500);
    await shot(page, `${P}-${M}-10-map-lens`);
  }
  await c(/^Desk$/); await page.waitForTimeout(1500);
  // review
  await c(/^Check and execute/); await page.waitForTimeout(1500);
  const before = await stateLine();
  await dump(`${M}-11-review`, 3000, 0);
  // execute
  await c(/^Execute month/); await page.waitForTimeout(9000);
  await dump(`${M}-12-result`, 3000, 0);
  log('state before', before);
  log('state after', await stateLine());
  // details / see everything
  if (m === 2 && (await c(/^(See everything|Details)/, 3000))) { await page.waitForTimeout(1500); await dump(`${M}-13-everything`, 2500, 0); await page.keyboard.press('Escape'); await page.waitForTimeout(600); }
  // paper
  if (await c(/^Read the paper/, 4000)) { await page.waitForTimeout(3000); await dump(`${M}-14-paper`, 2000, 0); }
  // next month
  if (!(await c(/^Next month/, 5000))) { await page.keyboard.press('Escape'); await page.waitForTimeout(800); await c(/^Next month/, 4000); }
  await page.waitForTimeout(4000);
}
log('errors', page.errors);
await b.close();
