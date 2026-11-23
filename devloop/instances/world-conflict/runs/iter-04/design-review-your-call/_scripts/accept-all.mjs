// Design review "Your call": what Accept all recommended does with a "Your call" crisis in THIS
// build. For months 1 and 2 on one seat: the engine's calls and picks, the desk's words before and
// after Accept all, the decisions the client actually sends in POST /api/turn, and what the turn
// report says the crisis resolved to.
//   node accept-all.mjs <evidenceDir> <name> <WxH> <seatJson> [months=2]
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const NAME = process.argv[3];
const [W, H] = process.argv[4].split('x').map(Number);
const SEAT = JSON.parse(process.argv[5]);
const MONTHS = Number(process.argv[6] ?? 2);
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-yc-aa-${NAME}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `yc-aa-${NAME}-${W}x${H}`, device: `${W}x${H}`, out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
await p.setViewportSize({ width: W, height: H });
let lastReq = null;
let lastTurn = null;
p.on('request', (r) => {
  if (/\/api\/turn$/.test(r.url()) && r.method() === 'POST') lastReq = JSON.parse(r.postData() ?? '{}');
});
p.on('response', async (r) => {
  if (/\/api\/turn$/.test(r.url()) && r.request().method() === 'POST') lastTurn = await r.json().catch(() => null);
});
const shot = (n) => p.screenshot({ path: path.join(ev, `${n}.jpg`), type: 'jpeg', quality: 70 });
const txt = (q) => p.evaluate((q) => [...document.querySelectorAll(q)].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean), q);
const sid = await p.evaluate(() => localStorage.getItem('worldconflict.lastSave'));
let month = await p.evaluate(async (id) => (await fetch(`http://localhost:8080/api/load/${id}`)).json().catch(() => null), sid);

for (let m = 1; m <= MONTHS; m++) {
  const a = month?.advice ?? {};
  const pend = month?.pendingDecisions ?? [];
  log(`######## month ${m}`);
  const calls = (a.calls ?? []).filter((c) => c.kind === 'crisis');
  for (const d of pend) {
    const c = calls.find((x) => x.id === d.id);
    log(`crisis ${d.id} "${d.title}" ${c ? 'IS A CALL' : 'routine'} default=${d.defaultOptionId} cabinetPick=${a.cabinetPicks?.[d.id]} call.mission=${c?.missionCard} call.calm=${c?.calmCard} skip=${c?.skip?.optionId} | ${d.options.map((o) => `${o.id}=${o.label}`).join(' ; ')}`);
    if (c) log(`  guide: ${c.guide} || skip text: ${c.skip.text}`);
  }
  log(`routine n=${(a.routine ?? []).length}`);
  await p.waitForTimeout(800);
  await shot(`${NAME}-aa-m${m}-before-${W}x${H}`);
  log(`before: main=${(await txt('.sp-main')).join(' || ')} | count=${(await txt('.sp-count')).join(',')} | items=${(await txt('.sp-item .sp-name')).join(' || ')}`);
  log(`before: strip/bar=${(await txt('.strip-note, .bar-plan, .readiness')).join(' || ')}`);
  log(`before: crisis rec line=${(await txt('.move-card .rec-line, [class*="recommend"]')).slice(0, 4).join(' || ')}`);
  // Unfold if folded, then Accept all
  await s.click(/^Review \d+ recommended/i, { timeout: 1000 });
  await p.waitForTimeout(700);
  const pressed = await s.click(/^Accept all recommended/i, { timeout: 2000 });
  log(`Accept all pressed: ${pressed}`);
  await p.waitForTimeout(1200);
  await shot(`${NAME}-aa-m${m}-after-${W}x${H}`);
  log(`after: main=${(await txt('.sp-main')).join(' || ')} | count=${(await txt('.sp-count')).join(',')} | items=${(await txt('.sp-item .sp-name')).join(' || ')}`);
  log(`after: strip/bar=${(await txt('.strip-note, .bar-plan, .readiness')).join(' || ')}`);
  log(`after: Recommended words on the screen=${(await p.evaluate(() => (document.body.innerText.match(/Recommended:[^\n]{0,60}/g) ?? []).join(' | ')))}`);
  log(`after: "Your call" on screen: ${await p.evaluate(() => /your call/i.test(document.body.innerText))}`);
  lastReq = null;
  if (!(await s.click(/Execute month/i, { timeout: 12000 }))) log('Execute not clickable');
  await p.locator('.result-card .rc-next').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => log('no result card'));
  await p.waitForTimeout(1200);
  const sent = Object.fromEntries((lastReq?.decisions ?? []).map((d) => [d.decisionId, d.optionId]));
  for (const d of pend) {
    const c = calls.find((x) => x.id === d.id);
    const used = sent[d.id] ?? `(none sent: engine default ${d.defaultOptionId})`;
    log(`SENT ${d.id}: ${used} | desk said Recommended: ${a.cabinetPicks?.[d.id]} | ${c ? 'call' : 'routine'}${sent[d.id] === undefined && a.cabinetPicks?.[d.id] !== d.defaultOptionId ? '  <== DESK SAID ONE ANSWER, ENGINE RESOLVES ANOTHER' : ''}`);
  }
  for (const r of lastTurn?.worldState?.turnReport?.decisions ?? []) {
    if (r.kind && r.kind !== 'CRISIS') continue;
    log(`REPORT crisis "${r.title}": choice="${r.choice}" optionId=${r.optionId} headline=${r.headline ?? ''}`);
  }
  log(`result card: ${(await txt('.result-card')).join(' ').slice(0, 600)}`);
  await shot(`${NAME}-aa-m${m}-result-${W}x${H}`);
  if (m === MONTHS) break;
  const exec = p.getByRole('button', { name: /Execute month/i }).first();
  for (let i = 0; i < 14; i++) {
    if (await exec.click({ trial: true, timeout: 800 }).then(() => true, () => false)) break;
    const moved =
      (await s.click(/To your desk|Next month|Continue|Done/i, { timeout: 800 })) ||
      (await p.locator('button.primary, .wc-btn.primary').last().click({ timeout: 1200 }).then(() => true, () => false));
    if (!moved) await s.key('Escape');
  }
  await p.waitForTimeout(2500);
  month = lastTurn;
}
log(`page errors: ${s.errors.join(' | ') || 'none'}`);
fs.writeFileSync(path.join(ev, `probe-accept-all-${NAME}.txt`), out.join('\n'));
await s.close();
