// Design review "Your call" (D-81 on build-your-call): drive one seat through month 1 and month 2
// in one browser session, resize through the given viewports, and at each size save a JPEG and a
// probe of what the player is told: goal line, mission sentence, Recommended panel, Accept all
// label, the primary crisis card, the strip note. The engine's advice (calls, routine, cabinet
// picks, default answers) is read from the /api/new-game and /api/turn responses.
//   node seat.mjs <evidenceDir> <name> <device> <WxH,WxH,...> <seatJson>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const NAME = process.argv[3];
const DEVICE = process.argv[4];
const SIZES = process.argv[5].split(',').map((s) => s.split('x').map(Number));
const SEAT = JSON.parse(process.argv[6]);
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-yc-${NAME}-${DEVICE}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const responses = [];

const s = await startGame({
  variant: `yc-${NAME}-${DEVICE}`,
  device: DEVICE,
  out: tmp,
  base: 'http://localhost:5173/',
  seat: SEAT,
});
const p = s.page;
// The new-game response arrived before we could listen; reload state from the API by catching the
// next ones, and fetch the current save once through the page
p.on('response', async (r) => {
  if (/\/api\/(turn|new-game|load\/)/.test(r.url()) && r.request().method() !== 'OPTIONS') {
    try {
      responses.push({ url: r.url(), json: await r.json() });
    } catch {}
  }
});

function adviceSummary(j, label) {
  const a = j?.advice;
  const w = j?.worldState ?? j?.state ?? j?.world;
  const pend = j?.pendingDecisions ?? w?.pendingDecisions ?? [];
  log(`--- engine advice ${label}`);
  if (!a) {
    log(`(no advice in response; keys: ${Object.keys(j ?? {}).join(',')})`);
    return;
  }
  for (const d of pend) {
    log(`crisis ${d.id} "${d.title}" default=${d.defaultOptionId} cabinetPick=${a.cabinetPicks?.[d.id]} missionPick=${a.missionPicks?.[d.id]} options=${d.options.map((o) => `${o.id}[${o.label}]`).join(' | ')}`);
  }
  for (const c of a.calls ?? []) {
    log(`CALL ${c.kind} ${c.id} "${c.title}" mission=${c.missionCard} calm=${c.calmCard} chief=${c.chiefPick} trade=${c.trade} skip=${JSON.stringify(c.skip)}`);
    log(`  guide: ${c.guide}`);
    for (const k of c.cards) log(`  card ${k.id} "${k.label}" side=${k.side} advisers=${k.advisers.join('+')} pc=${k.pc} price=${k.price} helps=${k.helps.join(';')} hurts=${k.hurts.join(';')} breaks=${k.breaks.join(';')} why=${k.why}`);
  }
  log(`routine (${(a.routine ?? []).length}): ${(a.routine ?? []).map((r) => `${r.kind}:${r.label}`).join(' | ')}`);
  log(`staffOrders: ${(a.staffOrders ?? []).map((o) => `${o.action?.type}${o.action?.targetId ? `>${o.action.targetId}` : ''}`).join(' | ')} reserve=${a.reserve}`);
  log(`chief: ${JSON.stringify(a.chief ? { decisions: a.chief.decisions, orders: a.chief.orders?.map((o) => o.action?.type + '>' + o.action?.targetId) } : null)}`);
  if (a.missionNotes) log(`missionNotes: ${JSON.stringify(a.missionNotes).slice(0, 1200)}`);
}

async function probe(tag) {
  const r = await p.evaluate(() => {
    const t = (q) => [...document.querySelectorAll(q)].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const box = (q) => {
      const e = document.querySelector(q);
      if (!e) return 'absent';
      const b = e.getBoundingClientRect();
      return `x${Math.round(b.left)} y${Math.round(b.top)} w${Math.round(b.width)} h${Math.round(b.height)} scrollW${e.scrollWidth} clientW${e.clientWidth}`;
    };
    const gl = document.querySelector('.goal-line');
    const glKids = gl ? [...gl.children].map((c) => { const b = c.getBoundingClientRect(); return `${c.className.split(' ')[0]}:${Math.round(b.left)}-${Math.round(b.right)}/y${Math.round(b.top)}h${Math.round(b.height)} sw${c.scrollWidth}cw${c.clientWidth}`; }) : [];
    return {
      goalLine: t('.goal-line'),
      goalBox: box('.goal-line'),
      glKids,
      segs: document.querySelectorAll('.goal-line .gseg').length,
      dots: document.querySelectorAll('.goal-line .gdot').length,
      mission: t('[data-mission-sentence]'),
      missionBox: box('[data-mission-sentence]'),
      railMission: t('.rail .mission, .rail [data-point="mission"], .rail .goals, .mission-list').slice(0, 3),
      rec: t('[data-staff-picks]'),
      recCount: t('.sp-count'),
      main: t('.sp-main'),
      items: t('.sp-item .sp-name'),
      stripNote: t('.strip-note'),
      primary: t('.move-card, .stage.is-primary').slice(0, 2),
      slots: t('.slot-card').slice(0, 10),
      barPlan: t('.bar-plan, .readiness'),
      pageW: document.documentElement.scrollWidth,
      vw: window.innerWidth,
    };
  });
  log(`=== ${tag}`);
  for (const [k, v] of Object.entries(r)) log(`${k}: ${Array.isArray(v) ? v.map((x) => String(x).slice(0, 900)).join(' || ') : v}`);
}

const shot = async (n, full = false) => p.screenshot({ path: path.join(ev, `${n}.jpg`), type: 'jpeg', quality: 70, fullPage: full });

async function eachSize(state) {
  for (const [w, h] of SIZES) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(900);
    const tag = `${NAME}-${state}-${w}x${h}`;
    await shot(tag);
    await probe(tag);
  }
}

// Month 1: the engine's month comes from the save
const sid = await p.evaluate(() => localStorage.getItem('worldconflict.lastSave'));
log(`save: ${sid}`);
if (sid) {
  const j = await p.evaluate(async (id) => (await fetch(`http://localhost:8080/api/load/${id}`)).json().catch(() => null), sid);
  adviceSummary(j, 'month 1 (load)');
}
await eachSize('m1');
// Accept all: what it says, then what is left
const acc = p.getByRole('button', { name: /^Accept all recommended|^Review \d+ recommended/i }).first();
const accText = await acc.innerText().catch(() => 'NO ACCEPT ALL BUTTON');
log(`Accept all button before: ${accText.replace(/\s+/g, ' ')}`);
if (/^Review/i.test(accText)) {
  await acc.click();
  await p.waitForTimeout(800);
}
await s.click(/^Accept all recommended/i, { timeout: 2000 });
await p.waitForTimeout(1200);
const [lw, lh] = SIZES[0];
await p.setViewportSize({ width: lw, height: lh });
await p.waitForTimeout(600);
await shot(`${NAME}-m1-after-accept-${lw}x${lh}`);
await probe(`${NAME}-m1-after-accept-${lw}x${lh}`);
// Execute and the month 2 desk
if (!(await s.click(/Execute month/i, { timeout: 12000 }))) log('Execute month not clickable');
await p.locator('.result-card .rc-next').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => log('no result card'));
await p.waitForTimeout(1500);
await shot(`${NAME}-result-${lw}x${lh}`);
log(`result card: ${(await p.locator('.result-card').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1500)}`);
const exec = p.getByRole('button', { name: /Execute month/i }).first();
for (let i = 0; i < 14; i++) {
  if (await exec.click({ trial: true, timeout: 800 }).then(() => true, () => false)) break;
  const moved =
    (await s.click(/To your desk|Next month|Continue|Done/i, { timeout: 800 })) ||
    (await p.locator('button.primary, .wc-btn.primary').last().click({ timeout: 1200 }).then(() => true, () => false));
  if (!moved) await s.key('Escape');
}
await p.waitForTimeout(2500);
const t = responses.filter((r) => /\/turn/.test(r.url)).at(-1);
if (t) adviceSummary(t.json, 'month 2 (turn response)');
else log('no /turn response captured');
await eachSize('m2');
log(`page errors: ${s.errors.join(' | ') || 'none'}`);
fs.writeFileSync(path.join(ev, `probe-${NAME}-${DEVICE}.txt`), out.join('\n'));
await s.close();
