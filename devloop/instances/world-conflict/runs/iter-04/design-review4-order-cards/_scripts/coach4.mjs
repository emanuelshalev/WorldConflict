// Review 4 (D-81), build-order-cards at 2ec6478. Phone desk catalogue, month 1, with the coach on
// step 3 ("When you are ready, run the month") after the player adds Mobilize:
//  item 1: danger faces at top / middle / 70% / lowest rows, no target and Russia: answers uncovered
//          (elementFromPoint centre + 4 corners), touch tap on Give queues; coach hidden while open and
//          back in the same place after; list position before / face / after (item 6)
//  item 2: how much of the stage the bubble covers; an Add button under it; a tap there
//  item 4: opened row and opened search hit geometry; item 5: hint line with / without target
//   node coach4.mjs <evidenceDir> <width> <height>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const W = Number(process.argv[3] ?? 390);
const H = Number(process.argv[4] ?? 844);
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-r4-coach-${W}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `r4-coach-${W}`, device: 'phone', out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
await p.setViewportSize({ width: W, height: H });
await p.waitForTimeout(600);
const tag = `${W}x${H}`;
const shot = (n) => p.screenshot({ path: path.join(ev, `${n}.jpg`), type: 'jpeg', quality: 70 });
const stageTop = () => p.evaluate(() => Math.round(document.querySelector('#desk-stage').scrollTop));
const sel = (id) => `[data-order-catalog] .ord-wrap[data-order-id="${id}"]`;
const state = (id) => p.locator(sel(id)).first().getAttribute('data-order-state').catch(() => 'absent');

const coachBox = () =>
  p.evaluate(() => {
    const c = document.querySelector('.coach-bubble');
    if (!c) return 'none';
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    return `${c.dataset.coach} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} vis=${cs.visibility} pe=${cs.pointerEvents}`;
  });

const facts = () =>
  p.evaluate(() => {
    const f = document.querySelector('.ord-confirm');
    if (!f) return 'NO FACE';
    const bar = document.querySelector('aside.cmd-bar')?.getBoundingClientRect();
    const fr = f.getBoundingClientRect();
    const one = (q) => {
      const b = f.querySelector(q);
      const r = b.getBoundingClientRect();
      const pts = [
        ['c', r.left + r.width / 2, r.top + r.height / 2],
        ['tl', r.left + 3, r.top + 3],
        ['tr', r.right - 3, r.top + 3],
        ['bl', r.left + 3, r.bottom - 3],
        ['br', r.right - 3, r.bottom - 3],
      ].map(([n, x, y]) => {
        const at = document.elementFromPoint(x, y);
        return `${n}:${at && b.contains(at) ? 'ok' : at ? (at.closest('.coach-bubble') ? 'COACH' : at.closest('aside.cmd-bar') ? 'BAR' : at.className?.toString().split(' ')[0] || at.tagName) : 'off'}`;
      });
      return `${b.innerText.trim()} ${Math.round(r.left)},${Math.round(r.top)}..${Math.round(r.bottom)} [${pts.join(' ')}]`;
    };
    return `face ${Math.round(fr.top)}..${Math.round(fr.bottom)} h${Math.round(fr.height)} | ${one('[data-confirm-cancel]')} | ${one('[data-confirm-go]')} | bar top ${bar ? Math.round(bar.top) : '-'}`;
  });

// Place the row: a fraction of the viewport for its top, or 'lowest' = Add's bottom 4 px above the
// coach bubble (the lowest an uncovered Add can be), or 'bar' = row bottom just above the bar.
const place = (id, where) =>
  p.evaluate(
    ([q, where]) => {
      const st = document.querySelector('#desk-stage');
      const w = document.querySelector(q);
      const act = w.querySelector('.ord-act');
      const bar = document.querySelector('aside.cmd-bar').getBoundingClientRect().top;
      const cb = document.querySelector('.coach-bubble')?.getBoundingClientRect();
      if (where === 'lowest') st.scrollTop += act.getBoundingClientRect().bottom - ((cb ? cb.top : bar) - 4);
      else if (where === 'bar') st.scrollTop += w.getBoundingClientRect().bottom - (bar - 2);
      else st.scrollTop += w.getBoundingClientRect().top - innerHeight * where;
      return Math.round(w.getBoundingClientRect().top);
    },
    [sel(id), where],
  );
const tapAt = async (q) => {
  const r = await p.locator(q).first().boundingBox();
  await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  return r;
};
const removeIfQueued = async (id) => {
  if ((await state(id)) === 'queued') {
    await p.evaluate((q) => document.querySelector(`${q} .ord-act`).click(), sel(id));
    await p.waitForTimeout(600);
  }
};

async function trial(id, where, how, shotName) {
  if ((await state(id)) !== 'available') {
    log(`${tag} ${id} @${where}: state ${await state(id)}, skipped`);
    return;
  }
  const top = await place(id, where);
  await p.waitForTimeout(350);
  const cbBefore = await coachBox();
  const before = await stageTop();
  const r = await tapAt(`${sel(id)} .ord-act`);
  await p.waitForTimeout(1000);
  const f = await facts();
  const cbDuring = await coachBox();
  const open = await stageTop();
  const page = await p.evaluate(() => Math.round(document.scrollingElement.scrollTop));
  if (shotName) await shot(shotName);
  if (f === 'NO FACE') {
    log(`${tag} ${id} @${where} rowTop ${top} Add y ${Math.round(r.y)}: NO FACE after tap on Add; coach ${cbBefore}; state ${await state(id)}`);
    await removeIfQueued(id);
    return;
  }
  if (how === 'Cancel') await tapAt('.ord-confirm [data-confirm-cancel]');
  else if (how === 'Escape') await p.keyboard.press('Escape');
  else await tapAt('.ord-confirm [data-confirm-go]');
  await p.waitForTimeout(1000);
  const after = await stageTop();
  const cbAfter = await coachBox();
  const st = await state(id);
  log(
    `${tag} ${id} @${where} rowTop ${top} Add y ${Math.round(r.y)}..${Math.round(r.y + r.height)}\n   ${f}\n   coach before: ${cbBefore} | during: ${cbDuring} | after ${how}: ${cbAfter} | same place: ${cbBefore.split(' vis')[0] === cbAfter.split(' vis')[0]}\n   list ${before} -> ${open} (face) -> ${after} after ${how}; restored ${after === before}; page ${page}; then face open ${await p.locator('.ord-confirm').count()}, order ${st}`,
  );
  await removeIfQueued(id);
}

// Item 2: the bubble's share of the visible stage, and an Add under it
async function coverage(label) {
  const g = await p.evaluate(() => {
    const st = document.querySelector('#desk-stage').getBoundingClientRect();
    const bar = document.querySelector('aside.cmd-bar').getBoundingClientRect();
    const c = document.querySelector('.coach-bubble')?.getBoundingClientRect();
    const top = Math.max(st.top, 0);
    const free = bar.top - top;
    if (!c) return { txt: `stage visible ${Math.round(top)}..${Math.round(bar.top)} = ${Math.round(free)} px; no bubble` };
    const ov = Math.max(0, Math.min(c.bottom, bar.top) - Math.max(c.top, top)) * Math.max(0, Math.min(c.right, st.right) - Math.max(c.left, st.left));
    const cs = getComputedStyle(document.querySelector('#desk-stage'));
    return {
      txt: `stage visible ${Math.round(top)}..${Math.round(bar.top)} = ${Math.round(free)} px tall x ${Math.round(st.width)}; bubble ${Math.round(c.left)},${Math.round(c.top)}..${Math.round(c.right)},${Math.round(c.bottom)} (${Math.round(c.width)}x${Math.round(c.height)}); bubble over stage ${Math.round(Math.max(0, bar.top - c.top))} px of height (${Math.round((Math.max(0, bar.top - c.top) / free) * 100)}%), ${Math.round((ov / (free * st.width)) * 100)}% of the visible stage area; stage padding-bottom ${cs.paddingBottom}; --cmd-cover-h ${getComputedStyle(document.documentElement).getPropertyValue('--cmd-cover-h')} --cmd-bar-h ${getComputedStyle(document.documentElement).getPropertyValue('--cmd-bar-h')}`,
    };
  });
  log(`${tag} ${label} coverage: ${g.txt}`);
}
async function addUnderBubble(id) {
  // Scroll so Add's centre sits on the bubble's centre-right, then probe and tap
  const r = await p.evaluate((q) => {
    const st = document.querySelector('#desk-stage');
    const w = document.querySelector(q);
    const a = w.querySelector('.ord-act');
    const c = document.querySelector('.coach-bubble').getBoundingClientRect();
    st.scrollTop += a.getBoundingClientRect().top + a.getBoundingClientRect().height / 2 - (c.top + c.height / 2);
    const ar = a.getBoundingClientRect();
    let cov = 0;
    let tot = 0;
    for (let x = ar.left + 1; x < ar.right; x += 3)
      for (let y = ar.top + 1; y < ar.bottom; y += 3) {
        tot++;
        if (!a.contains(document.elementFromPoint(x, y))) cov++;
      }
    return { cov: Math.round((cov / tot) * 100), box: `${Math.round(ar.left)},${Math.round(ar.top)} ${Math.round(ar.width)}x${Math.round(ar.height)}`, c: `${Math.round(c.left)}..${Math.round(c.right)}`, last: st.scrollTop + st.clientHeight >= st.scrollHeight - 1 };
  }, sel(id));
  await p.waitForTimeout(300);
  await shot(`c2-add-under-bubble-${id}-${tag}`);
  const before = await state(id);
  await tapAt(`${sel(id)} .ord-act`);
  await p.waitForTimeout(900);
  const faces = await p.locator('.ord-confirm').count();
  const after = await state(id);
  log(`${tag} caveat A: ${id} Add ${r.box} under bubble x ${r.c}: ${r.cov}% of Add covered; a tap on Add's centre -> state ${before} -> ${after}, face open ${faces}, coach ${await coachBox()}`);
  if (faces) await p.keyboard.press('Escape');
  await removeIfQueued(id);
  await p.waitForTimeout(400);
}
async function lastRowClear() {
  const g = await p.evaluate(() => {
    const st = document.querySelector('#desk-stage');
    st.scrollTop = st.scrollHeight;
    const rows = [...document.querySelectorAll('[data-order-catalog] .ord-wrap')];
    const last = rows.at(-1);
    const a = last.querySelector('.ord-act').getBoundingClientRect();
    const c = document.querySelector('.coach-bubble')?.getBoundingClientRect();
    const pager = document.querySelector('#desk-stage .desk-pager, #desk-stage [class*="pager"]');
    return `last row ${last.dataset.orderId} Add ${Math.round(a.top)}..${Math.round(a.bottom)}, bubble top ${c ? Math.round(c.top) : '-'}: clear ${c ? a.bottom <= c.top : 'n/a'}; Add centre on top: ${last.querySelector('.ord-act').contains(document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2))}`;
  });
  await p.waitForTimeout(300);
  await shot(`c2-list-end-${tag}`);
  log(`${tag} list scrolled to the end: ${g}`);
}

async function setTarget(name) {
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type(name);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
}
const hint = async (label) => {
  const h = await p.evaluate(() => {
    const e = document.querySelector('[data-cat-hint]');
    if (!e) return 'no hint element';
    const r = e.getBoundingClientRect();
    return `hint "${e.innerText.trim()}" h${Math.round(r.height)}`;
  });
  const first = await p.evaluate(() => {
    const cat = document.querySelector('[data-order-catalog]');
    const sib = [...cat.querySelectorAll(':scope > *')].map((e) => e.className?.toString().split(' ')[0] || e.tagName).slice(0, 6);
    return sib.join(' > ');
  });
  log(`${tag} ${label}: ${h}; catalogue children ${first}`);
};

async function openedRow(id, label) {
  await place(id, 0.35);
  await p.waitForTimeout(300);
  const box = await p.locator(`${sel(id)} .wc-card`).first().boundingBox();
  await p.touchscreen.tap(box.x + 120, box.y + 22);
  await p.waitForTimeout(800);
  const g = await p.evaluate((q) => {
    const w = document.querySelector(q);
    const card = w.querySelector('.wc-card').getBoundingClientRect();
    const foot = w.querySelector('.wc-card-foot')?.getBoundingClientRect();
    const exp = w.querySelector('.ord-expand')?.getBoundingClientRect();
    const t = w.querySelector('.wc-card-title, h3, h4')?.getBoundingClientRect();
    const a = w.querySelector('.ord-act').getBoundingClientRect();
    const art = w.querySelector('.wc-card-art svg, .wc-card-art > *')?.getBoundingClientRect();
    return `open ${w.classList.contains('is-open')}; card ${Math.round(card.width)}x${Math.round(card.height)} at y${Math.round(card.top)}; foot ${foot ? `${Math.round(foot.left)}..${Math.round(foot.right)} w${Math.round(foot.width)}` : 'none'}; expand w${exp ? Math.round(exp.width) : '-'}; title top ${t ? Math.round(t.top) : '-'}; Add top ${Math.round(a.top)} (row top +${Math.round(a.top - card.top)}); plate top ${art ? Math.round(art.top) : '-'} (+${art ? Math.round(art.top - card.top) : '-'}); state ${w.dataset.orderState}`;
  }, sel(id));
  await p.locator(sel(id)).first().screenshot({ path: path.join(ev, `c4-opened-row-${label}-${tag}.jpg`), type: 'jpeg', quality: 72 });
  await shot(`c4-opened-row-screen-${label}-${tag}`);
  log(`${tag} opened row ${id} (${label}): ${g}`);
  await p.touchscreen.tap(box.x + 120, box.y + 22);
  await p.waitForTimeout(500);
}

try {
  if (await s.click(/^Full desk/i, { timeout: 2000 })) await s.click(/^All orders/i, { timeout: 3000 });
  await p.waitForTimeout(1000);
  log(`${tag} coach at start: ${await coachBox()}`);
  await hint('no target');
  await shot(`c5-catalog-top-notarget-${tag}`);
  // The player adds an order of their own: the coach moves to step 3
  await place('mobilize', 0.4);
  await p.waitForTimeout(300);
  await tapAt(`${sel('mobilize')} .ord-act`);
  await p.waitForTimeout(1200);
  log(`${tag} after Mobilize: state ${await state('mobilize')}; coach ${await coachBox()}`);
  await coverage('no target, coach step 3');
  await shot(`c2-coach-step3-${tag}`);
  // Item 1, no target
  await trial('fund-nuclear', 0.3, 'Give', `i1-notarget-fund-nuclear-30-${tag}`);
  await trial('policing-hard', 0.5, 'Cancel', null);
  await trial('policing-hard', 0.5, 'Give', `i1-notarget-policing-hard-50-${tag}`);
  await trial('fund-nuclear', 0.7, 'Cancel', null);
  await trial('fund-nuclear', 0.7, 'Give', `i1-notarget-fund-nuclear-70-${tag}`);
  await trial('policing-hard', 'lowest', 'Escape', null);
  await trial('policing-hard', 'lowest', 'Give', `i1-notarget-policing-hard-lowest-${tag}`);
  // Item 2, caveat A
  await addUnderBubble('policing-soft');
  await addUnderBubble('policing-hard');
  await lastRowClear();
  // Item 4: opened row, no target
  await openedRow('policing-soft', 'notarget');
  // Russia
  await setTarget('Russia');
  await hint('Russia');
  await shot(`c5-catalog-top-russia-${tag}`);
  await coverage('Russia, coach step 3');
  const danger = ['deploy-border', 'airstrike-military', 'airstrike-nuclear', 'fund-nuclear', 'arm-rebels', 'assassinate', 'coup', 'break-pact', 'declare-war', 'nuclear-strike', 'policing-hard'];
  const avail = [];
  for (const id of danger) avail.push(`${id}=${await state(id)}`);
  log(`${tag} Russia danger rows: ${avail.join(' ')}`);
  await trial('deploy-border', 0.3, 'Cancel', null);
  await trial('deploy-border', 0.3, 'Give', `i1-russia-deploy-border-30-${tag}`);
  await trial('airstrike-military', 0.5, 'Escape', null);
  await trial('airstrike-military', 0.5, 'Give', `i1-russia-airstrike-military-50-${tag}`);
  await trial('arm-rebels', 0.7, 'Cancel', null);
  await trial('arm-rebels', 0.7, 'Give', `i1-russia-arm-rebels-70-${tag}`);
  await trial('airstrike-nuclear', 0.7, 'Give', null);
  await trial('policing-hard', 'lowest', 'Cancel', null);
  await trial('policing-hard', 'lowest', 'Give', `i1-russia-policing-hard-lowest-${tag}`);
  await trial('airstrike-military', 'lowest', 'Give', `i1-russia-airstrike-military-lowest-${tag}`);
  // A row the face did not need to move (top of the screen) and one it did (lowest) for item 6
  await trial('airstrike-military', 0.25, 'Cancel', null);
  await addUnderBubble('airstrike-military');
  await lastRowClear();
  await openedRow('spy', 'russia').catch((e) => log(`opened row court: ${e.message.split('\n')[0]}`));
  // Item 4: a search hit
  const input = p.locator('[data-order-catalog] input').first();
  await input.scrollIntoViewIfNeeded();
  await input.tap();
  await p.keyboard.type('sanction');
  await p.waitForTimeout(800);
  const hit = p.locator('#ord-hits .ord-wrap').first();
  const hb = await hit.locator('.wc-card').first().boundingBox();
  const hid = await hit.getAttribute('data-order-id');
  await p.keyboard.press('Escape').catch(() => {});
  await p.evaluate(() => document.activeElement?.blur());
  await p.waitForTimeout(400);
  const hb2 = await p.locator('#ord-hits .ord-wrap').first().locator('.wc-card').first().boundingBox();
  const b = hb2 ?? hb;
  const st0 = await p.locator('#ord-hits .ord-wrap').first().getAttribute('data-order-state');
  await p.touchscreen.tap(b.x + 120, b.y + 22);
  await p.waitForTimeout(800);
  const hg = await p.evaluate(() => {
    const w = document.querySelector('#ord-hits .ord-wrap');
    if (!w) return 'no hit';
    const card = w.querySelector('.wc-card').getBoundingClientRect();
    const foot = w.querySelector('.wc-card-foot')?.getBoundingClientRect();
    const a = w.querySelector('.ord-act').getBoundingClientRect();
    return `${w.dataset.orderId} state ${w.dataset.orderState} open ${w.classList.contains('is-open')}; card ${Math.round(card.width)}x${Math.round(card.height)}; foot ${foot ? `w${Math.round(foot.width)}` : 'none'}; Add +${Math.round(a.top - card.top)}; faces ${document.querySelectorAll('.ord-confirm').length}`;
  });
  await shot(`c4-search-hit-opened-${tag}`);
  log(`${tag} search "sanction" first hit ${hid} (state ${st0}) tapped on the row: ${hg}`);
  log(`page errors: ${s.errors.slice(0, 4).join(' | ') || 'none'}`);
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
  await shot(`failure-coach4-${tag}`).catch(() => {});
} finally {
  fs.writeFileSync(path.join(ev, `probe-coach4-${tag}.txt`), `${out.join('\n')}\n`);
  await s.close();
}
