// Design review "Your call": Quarantine as China, months 1 and 2 at one size: where "Court Taiwan"
// (the mission move, a Your call in the engine) appears in Orders to consider, against the three
// upkeep proposals. Screenshot of the list and its text, before and after "Show n more".
//   node chn-orders.mjs <evidenceDir> <WxH>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const [W, H] = process.argv[3].split('x').map(Number);
const SEAT = { flashpointId: 'quarantine', countryId: 'CHN', title: 'Quarantine', seed: 4242 };
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `yc-chnord-${W}x${H}`, device: `${W}x${H}`, out: path.join(process.env.TEMP ?? '/tmp', `wc-yc-chnord-${W}`), base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
async function look(tag) {
  await p.getByRole('tab', { name: /Full desk/i }).first().click().catch(() => {});
  await p.waitForTimeout(800);
  const head = p.getByText(/^Orders to consider/).first();
  await head.scrollIntoViewIfNeeded().catch(() => {});
  await p.waitForTimeout(500);
  const list = await p.evaluate(() => {
    const h = [...document.querySelectorAll('h2, h3')].find((e) => /^Orders to consider/.test(e.innerText));
    const sec = h?.closest('section') ?? h?.parentElement?.parentElement;
    return sec ? sec.innerText.replace(/\s+/g, ' ').slice(0, 1500) : 'no Orders to consider section';
  });
  log(`=== ${tag} Orders to consider: ${list}`);
  await p.screenshot({ path: path.join(ev, `chn-orders-${tag}-${W}x${H}.jpg`), type: 'jpeg', quality: 70 });
  if (await s.click(/^Show \d+ more/i, { timeout: 1200 })) {
    await p.waitForTimeout(600);
    const all = await p.evaluate(() => document.body.innerText.match(/[^\n]*Court Taiwan[^\n]*/g)?.join(' | ') ?? 'none');
    log(`${tag} after Show more, lines with Court Taiwan: ${all}`);
  }
}
await look('m1');
await s.click(/Execute month/i, { timeout: 12000 });
await p.locator('.result-card .rc-next').first().waitFor({ state: 'visible', timeout: 30000 });
const exec = p.getByRole('button', { name: /Execute month/i }).first();
for (let i = 0; i < 14; i++) {
  if (await exec.click({ trial: true, timeout: 800 }).then(() => true, () => false)) break;
  const moved = (await s.click(/To your desk|Next month|Continue|Done/i, { timeout: 800 })) || (await p.locator('button.primary, .wc-btn.primary').last().click({ timeout: 1200 }).then(() => true, () => false));
  if (!moved) await s.key('Escape');
}
await p.waitForTimeout(2500);
await look('m2');
log(`page errors: ${s.errors.join(' | ') || 'none'}`);
fs.writeFileSync(path.join(ev, `probe-chn-orders-${W}x${H}.txt`), out.join('\n'));
await s.close();
