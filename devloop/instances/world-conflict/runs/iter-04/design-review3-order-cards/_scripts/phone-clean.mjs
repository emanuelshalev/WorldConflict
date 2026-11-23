// Review 3: S2 again with touch taps at coordinates (no Playwright auto-scroll), the list position
// before the tap, right after it, with the face open and after each way out; then the same with the
// month 1 coach on its "run the month" step (it appears once the player adds an order of their own).
//   node phone-clean.mjs <evidenceDir> [width height]
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const W = Number(process.argv[3] ?? 390);
const H = Number(process.argv[4] ?? 844);
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-r3-clean-${W}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `r3-clean-${W}`, device: 'phone', out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
await p.setViewportSize({ width: W, height: H });
const tag = `${W}x${H}`;
const stageTop = () => p.evaluate(() => Math.round(document.querySelector('#desk-stage').scrollTop));
const coach = () => p.evaluate(() => document.querySelector('.coach-bubble')?.dataset.coach ?? 'none');

const facts = () =>
  p.evaluate(() => {
    const f = document.querySelector('.ord-confirm');
    if (!f) return 'no face';
    const bar = document.querySelector('aside.cmd-bar')?.getBoundingClientRect();
    const cb = document.querySelector('.coach-bubble')?.getBoundingClientRect();
    const one = (sel) => {
      const b = f.querySelector(sel);
      const r = b.getBoundingClientRect();
      const pts = [
        ['centre', r.left + r.width / 2, r.top + r.height / 2],
        ['left', r.left + 12, r.top + r.height / 2],
        ['right', r.right - 12, r.top + r.height / 2],
        ['top', r.left + r.width / 2, r.top + 6],
        ['bottom', r.left + r.width / 2, r.bottom - 6],
      ].map(([n, x, y]) => {
        const at = document.elementFromPoint(x, y);
        return `${n}:${at && b.contains(at) ? 'ok' : at ? at.closest('.coach-bubble') ? 'COACH' : at.closest('aside.cmd-bar') ? 'BAR' : (at.className?.toString().split(' ')[0] || at.tagName) : 'off'}`;
      });
      return `${b.innerText.trim()} y ${Math.round(r.top)}..${Math.round(r.bottom)} [${pts.join(' ')}]`;
    };
    return `${one('[data-confirm-cancel]')} | ${one('[data-confirm-go]')} | bar top ${bar ? Math.round(bar.top) : '-'} | coach ${cb ? `${Math.round(cb.left)},${Math.round(cb.top)}..${Math.round(cb.bottom)}` : 'none'}`;
  });

async function place(id, frac) {
  return p.evaluate(
    ([id, frac]) => {
      const st = document.querySelector('#desk-stage');
      const w = document.querySelector(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`);
      // 'bottom': the row's bottom edge just above the fixed bar (the lowest a player can press it)
      const bar = document.querySelector('aside.cmd-bar').getBoundingClientRect().top;
      if (frac === 'bottom') st.scrollTop += w.getBoundingClientRect().bottom - (bar - 2);
      else st.scrollTop += w.getBoundingClientRect().top - innerHeight * frac;
      return Math.round(w.getBoundingClientRect().top);
    },
    [id, frac],
  );
}
async function tapAdd(id) {
  const r = await p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"] .ord-act`).first().boundingBox();
  await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  return r;
}

async function run(id, frac, how, shotName) {
  const top = await place(id, frac);
  await p.waitForTimeout(300);
  const before = await stageTop();
  const r = await tapAdd(id);
  await p.waitForTimeout(40);
  const just = await stageTop();
  await p.waitForTimeout(1000);
  const f = await facts();
  const open = await stageTop();
  const page = await p.evaluate(() => document.scrollingElement.scrollTop);
  if (shotName) await p.screenshot({ path: path.join(ev, `${shotName}.jpg`), type: 'jpeg', quality: 70 });
  let result = '';
  if (how === 'Cancel') await p.locator('.ord-confirm [data-confirm-cancel]').first().tap();
  else if (how === 'Escape') await p.keyboard.press('Escape');
  else if (how === 'Give' || how === 'tap-give-centre') {
    // A finger on the centre of Give the order, whatever lies on top
    const g = await p.locator('.ord-confirm [data-confirm-go]').first().boundingBox();
    await p.touchscreen.tap(g.x + g.width / 2, g.y + g.height / 2);
  }
  await p.waitForTimeout(900);
  const after = await stageTop();
  const state = await p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`).first().getAttribute('data-order-state');
  result = `face still open ${await p.locator('.ord-confirm').count()}, order ${state}`;
  log(`${tag} coach=${await coach()} ${id} @${frac} rowTop ${top} Add at y ${Math.round(r.y)}: list ${before} -> ${just} (40 ms) -> ${open} (face) -> ${after} after ${how}; restored ${after === before}; page ${page}\n   ${f}\n   then: ${result}`);
  if (state === 'queued') {
    await p.evaluate((id) => document.querySelector(`[data-order-catalog] .ord-wrap[data-order-id="${id}"] .ord-act`).click(), id);
    await p.waitForTimeout(600);
  }
}

try {
  if (await s.click(/^Full desk/i, { timeout: 2000 })) await s.click(/^All orders/i, { timeout: 3000 });
  await p.waitForTimeout(900);
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type('Russia');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  log(`coach at start: ${await coach()}`);
  // Phase A: no order of the player's own yet
  for (const id of ['airstrike-military', 'policing-hard']) {
    let i = 0;
    for (const frac of [0.4, 0.7, 'bottom']) {
      await run(id, frac, ['Cancel', 'Escape', 'Give'][i++], frac === 0.7 ? `s2-clean-${id}-70pct-${tag}` : null);
    }
  }
  // Phase B: the player adds Mobilize first (the coach moves on to "run the month")
  await place('mobilize', 0.4);
  await tapAdd('mobilize');
  await p.waitForTimeout(900);
  log(`after adding Mobilize: coach ${await coach()}; Mobilize ${await p.locator('[data-order-catalog] .ord-wrap[data-order-id="mobilize"]').first().getAttribute('data-order-state')}`);
  await run('airstrike-military', 0.7, 'Cancel', `s2-coach-airstrike-military-70pct-${tag}`);
  await run('policing-hard', 'bottom', 'Cancel', `s2-coach-policing-hard-bottom-${tag}`);
  await run('airstrike-military', 0.4, 'Cancel', `s2-coach-airstrike-military-40pct-${tag}`);
  await run('policing-hard', 'bottom', 'tap-give-centre', null);
  log(`page errors: ${s.errors.slice(0, 4).join(' | ') || 'none'}`);
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
} finally {
  fs.writeFileSync(path.join(ev, `probe-phone-clean-${tag}.txt`), `${out.join('\n')}\n`);
  await s.close();
}
