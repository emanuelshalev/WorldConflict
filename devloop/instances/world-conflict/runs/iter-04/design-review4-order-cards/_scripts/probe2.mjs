// Review 4 follow-up: (a) the list at its very end, last row's face, Cancel: scrollTop / scrollHeight
// at each step, without and with the coach; (b) danger rows at the top of the visible stage (just under
// the desk tabs), no target and Russia; (c) a search hit opened on the phone; (d) where on the screen
// an Add button falls under the coach bubble (scan every available row's Add band).
//   node probe2.mjs <evidenceDir> <width> <height>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const W = Number(process.argv[3] ?? 390);
const H = Number(process.argv[4] ?? 844);
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-r4-p2-${W}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `r4-p2-${W}`, device: 'phone', out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
await p.setViewportSize({ width: W, height: H });
await p.waitForTimeout(600);
const tag = `${W}x${H}`;
const shot = (n) => p.screenshot({ path: path.join(ev, `${n}.jpg`), type: 'jpeg', quality: 70 });
const sel = (id) => `[data-order-catalog] .ord-wrap[data-order-id="${id}"]`;
const state = (id) => p.locator(sel(id)).first().getAttribute('data-order-state').catch(() => 'absent');
const geo = () =>
  p.evaluate(() => {
    const st = document.querySelector('#desk-stage');
    return `top ${Math.round(st.scrollTop)} height ${st.scrollHeight} client ${st.clientHeight} max ${st.scrollHeight - st.clientHeight}`;
  });
const tapAt = async (q) => {
  const r = await p.locator(q).first().boundingBox();
  await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  return r;
};
const facts = () =>
  p.evaluate(() => {
    const f = document.querySelector('.ord-confirm');
    if (!f) return 'NO FACE';
    const st = document.querySelector('#desk-stage').getBoundingClientRect();
    const fr = f.getBoundingClientRect();
    const t = f.querySelector('[data-confirm-title], h3, h4, .ord-confirm-q')?.getBoundingClientRect();
    const one = (q) => {
      const b = f.querySelector(q);
      const r = b.getBoundingClientRect();
      const ok = [
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + 3, r.top + 3],
        [r.right - 3, r.top + 3],
        [r.left + 3, r.bottom - 3],
        [r.right - 3, r.bottom - 3],
      ].map(([x, y]) => (b.contains(document.elementFromPoint(x, y)) ? 1 : 0)).join('');
      return `${b.innerText.trim()} y${Math.round(r.top)}..${Math.round(r.bottom)} uncovered(c,tl,tr,bl,br)=${ok}`;
    };
    return `face ${Math.round(fr.top)}..${Math.round(fr.bottom)} (stage top ${Math.round(st.top)}), title top ${t ? Math.round(t.top) : '-'} | ${one('[data-confirm-cancel]')} | ${one('[data-confirm-go]')}`;
  });
const removeIfQueued = async (id) => {
  if ((await state(id)) === 'queued') {
    await p.evaluate((q) => document.querySelector(`${q} .ord-act`).click(), sel(id));
    await p.waitForTimeout(600);
  }
};
async function endOfList(label) {
  await p.evaluate(() => {
    const st = document.querySelector('#desk-stage');
    st.scrollTop = st.scrollHeight;
  });
  await p.waitForTimeout(400);
  const a = await geo();
  await tapAt(`${sel('policing-hard')} .ord-act`);
  await p.waitForTimeout(1000);
  const b = await geo();
  const f = await facts();
  await tapAt('.ord-confirm [data-confirm-cancel]');
  await p.waitForTimeout(150);
  const c1 = await geo();
  await p.waitForTimeout(900);
  const c = await geo();
  await shot(`i6-end-of-list-after-cancel-${label}-${tag}`);
  log(`${tag} ${label} end of list, Hard crackdown (last row): before [${a}] face [${b}] 150 ms after Cancel [${c1}] 1 s after [${c}]\n   ${f}`);
}
async function topRow(id, label) {
  if ((await state(id)) !== 'available') return log(`${tag} ${id}: ${await state(id)}`);
  for (const how of ['Cancel', 'Give']) {
    await p.evaluate((q) => {
      const st = document.querySelector('#desk-stage');
      const w = document.querySelector(q);
      st.scrollTop += w.getBoundingClientRect().top - (st.getBoundingClientRect().top + 14);
    }, sel(id));
    await p.waitForTimeout(350);
    const before = await geo();
    const r = await tapAt(`${sel(id)} .ord-act`);
    await p.waitForTimeout(1000);
    const f = await facts();
    const open = await geo();
    if (how === 'Give') await shot(`i1-top-${label}-${id}-${tag}`);
    if (f !== 'NO FACE') await tapAt(`.ord-confirm [data-confirm-${how === 'Cancel' ? 'cancel' : 'go'}]`);
    await p.waitForTimeout(1000);
    const after = await geo();
    const cb = await p.evaluate(() => {
      const c = document.querySelector('.coach-bubble');
      return c ? `${Math.round(c.getBoundingClientRect().top)} ${getComputedStyle(c).visibility}` : 'none';
    });
    log(`${tag} top row ${label} ${id} Add y${Math.round(r.y)}: before [${before}] face [${open}] after ${how} [${after}] -> ${await state(id)}; coach ${cb}\n   ${f}`);
    await removeIfQueued(id);
  }
}
async function scanBand() {
  // Every Add y position (top) from the stage top to the bar, 4 px steps, for one row: covered or not
  const r = await p.evaluate(async () => {
    const st = document.querySelector('#desk-stage');
    const w = document.querySelector('[data-order-catalog] .ord-wrap[data-order-id="policing-soft"]');
    const a = w.querySelector('.ord-act');
    const bar = document.querySelector('aside.cmd-bar').getBoundingClientRect().top;
    const s0 = st.getBoundingClientRect().top;
    const res = { full: 0, part: 0, clear: 0, pos: 0, firstHit: null, lastHit: null };
    for (let y = s0; y + 44 <= bar; y += 4) {
      st.scrollTop += a.getBoundingClientRect().top - y;
      const ar = a.getBoundingClientRect();
      if (Math.abs(ar.top - y) > 1) continue;
      let cov = 0;
      let tot = 0;
      for (let x = ar.left + 1; x < ar.right; x += 3)
        for (let yy = ar.top + 1; yy < ar.bottom; yy += 3) {
          tot++;
          if (!a.contains(document.elementFromPoint(x, yy))) cov++;
        }
      res.pos++;
      const centre = a.contains(document.elementFromPoint(ar.left + ar.width / 2, ar.top + ar.height / 2));
      if (cov === tot) res.full++;
      else if (!centre) res.part++;
      else res.clear++;
      if (!centre) {
        res.firstHit ??= Math.round(y);
        res.lastHit = Math.round(y);
      }
    }
    return { ...res, s0: Math.round(s0), bar: Math.round(bar) };
  });
  log(`${tag} Add-band scan (Add top from stage top ${r.s0} to bar ${r.bar}, 4 px steps, ${r.pos} positions): centre unpressable at ${r.full + r.part} positions (${Math.round(((r.full + r.part) / r.pos) * 100)}%), of which wholly covered ${r.full}; unpressable band Add top y ${r.firstHit}..${r.lastHit}`);
}

try {
  if (await s.click(/^Full desk/i, { timeout: 2000 })) await s.click(/^All orders/i, { timeout: 3000 });
  await p.waitForTimeout(1000);
  await endOfList('no-coach-notarget');
  await p.locator(sel('mobilize')).first().scrollIntoViewIfNeeded();
  await p.evaluate((q) => {
    const st = document.querySelector('#desk-stage');
    st.scrollTop += document.querySelector(q).getBoundingClientRect().top - 400;
  }, sel('mobilize'));
  await p.waitForTimeout(300);
  await tapAt(`${sel('mobilize')} .ord-act`);
  await p.waitForTimeout(1200);
  log(`${tag} Mobilize ${await state('mobilize')}`);
  await endOfList('coach-notarget');
  await scanBand();
  await topRow('fund-nuclear', 'notarget');
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type('Russia');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  await topRow('deploy-border', 'russia');
  await topRow('airstrike-military', 'russia');
  await endOfList('coach-russia');
  // Search hit, opened by a tap on the row
  const input = p.locator('[data-order-catalog] input').first();
  await p.evaluate(() => (document.querySelector('#desk-stage').scrollTop = 0));
  await p.waitForTimeout(300);
  await input.tap();
  await p.keyboard.type('sanction');
  await p.waitForTimeout(900);
  await p.evaluate(() => document.activeElement?.blur());
  await p.waitForTimeout(500);
  const n = await p.locator('#ord-hits .ord-wrap').count();
  if (!n) {
    await shot(`c4-search-nohits-${tag}`);
    log(`${tag} search "sanction": no hits`);
  } else {
    const hit = p.locator('#ord-hits .ord-wrap').first();
    await hit.scrollIntoViewIfNeeded();
    const hb = await hit.locator('.wc-card').first().boundingBox();
    const id = await hit.getAttribute('data-order-id');
    const st0 = await hit.getAttribute('data-order-state');
    await p.touchscreen.tap(hb.x + 120, hb.y + 22);
    await p.waitForTimeout(900);
    const hg = await p.evaluate(() => {
      const w = document.querySelector('#ord-hits .ord-wrap');
      const card = w.querySelector('.wc-card').getBoundingClientRect();
      const foot = w.querySelector('.wc-card-foot')?.getBoundingClientRect();
      const a = w.querySelector('.ord-act').getBoundingClientRect();
      return `state ${w.dataset.orderState} open ${w.classList.contains('is-open')}; card ${Math.round(card.width)}x${Math.round(card.height)}; foot ${foot ? `w${Math.round(foot.width)}` : 'none'}; Add +${Math.round(a.top - card.top)} ${a.width}x${a.height}; faces ${document.querySelectorAll('.ord-confirm').length}`;
    });
    await shot(`c4-search-hit-opened-${tag}`);
    await hit.screenshot({ path: path.join(ev, `c4-search-hit-row-${tag}.jpg`), type: 'jpeg', quality: 72 }).catch(() => {});
    log(`${tag} search "sanction" ${n} hits; first ${id} (${st0}) tapped on the row: ${hg}`);
  }
  log(`page errors: ${s.errors.slice(0, 4).join(' | ') || 'none'}`);
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
  await shot(`failure-p2-${tag}`).catch(() => {});
} finally {
  fs.writeFileSync(path.join(ev, `probe-p2-${tag}.txt`), `${out.join('\n')}\n`);
  await s.close();
}
