// Review 3 (D-81), build-order-cards at ee3b69a. Phone desk catalogue: S2 (danger face answers above
// the fixed bar), page never scrolls, list restored after Cancel / Escape / Give; C2 (tap opens the
// forecast); C4 (rows per screen). Touch taps (the phone profile has touch).
//   node phone.mjs <full|focus> <evidenceDir>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const mode = process.argv[2] ?? 'full';
const ev = path.resolve(process.argv[3]);
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const VPS = [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
];
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-r3-phone-${mode}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `r3-phone-${mode}`, device: 'phone', out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
const shot = (name) => p.screenshot({ path: path.join(ev, `${name}.jpg`), type: 'jpeg', quality: 70 });

const scrolls = () =>
  p.evaluate(() => {
    const st = document.querySelector('#desk-stage');
    const anc = [];
    let e = document.querySelector('[data-order-catalog]');
    while (e) {
      if (e.scrollTop) anc.push(`${e.id || e.className?.toString().split(' ')[0] || e.tagName}=${Math.round(e.scrollTop)}`);
      e = e.parentElement;
    }
    return { stage: Math.round(st?.scrollTop ?? -1), page: Math.round(document.scrollingElement.scrollTop), winY: Math.round(scrollY), anc: anc.join(',') };
  });

const faceFacts = () =>
  p.evaluate(() => {
    const f = document.querySelector('.ord-confirm');
    if (!f) return null;
    const bar = document.querySelector('aside.cmd-bar')?.getBoundingClientRect();
    const chk = (sel) => {
      const b = f.querySelector(sel);
      const r = b.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const at = cy >= 0 && cy <= innerHeight ? document.elementFromPoint(cx, cy) : null;
      const who = at ? (b.contains(at) ? 'BUTTON' : `${at.closest('button')?.innerText?.trim().slice(0, 20) || at.className?.toString().split(' ')[0] || at.tagName}`) : 'off-screen';
      // corners too: wholly uncovered?
      const corners = [
        [r.left + 2, r.top + 2],
        [r.right - 2, r.top + 2],
        [r.left + 2, r.bottom - 2],
        [r.right - 2, r.bottom - 2],
      ].map(([x, y]) => (y >= 0 && y <= innerHeight && b.contains(document.elementFromPoint(x, y)) ? 1 : 0)).join('');
      return `${b.innerText.trim()} ${Math.round(r.left)},${Math.round(r.top)}..${Math.round(r.bottom)} ${Math.round(r.width)}x${Math.round(r.height)} centre:${who} corners:${corners} clearOfBar:${bar ? r.bottom <= bar.top : 'nobar'}`;
    };
    return { txt: `Cancel[${chk('[data-confirm-cancel]')}] Give[${chk('[data-confirm-go]')}] barTop ${bar ? Math.round(bar.top) : 'n/a'}`, title: f.querySelector('[data-confirm-title]')?.innerText ?? f.innerText.slice(0, 80) };
  });

async function openCatalog() {
  let opened = false;
  if (mode === 'full') {
    if (await s.click(/^Full desk/i, { timeout: 2000 })) opened = await s.click(/^All orders/i, { timeout: 3000 });
  } else {
    await s.click(/^Focus$/i, { timeout: 1500 });
    opened = await s.click(/^All orders/i, { timeout: 3000 });
  }
  if (!opened) opened = await s.click(/All orders/i, { timeout: 3000 });
  await p.waitForTimeout(900);
  const vis = await p.locator('[data-order-catalog]').first().isVisible().catch(() => false);
  const seg = await p.evaluate(() => [...document.querySelectorAll('[aria-pressed="true"], [aria-selected="true"]')].map((e) => e.innerText.trim().slice(0, 20)).join(' | '));
  log(`mode ${mode}: catalogue visible ${vis}; pressed/selected controls: ${seg}`);
  return vis;
}

async function setTarget(name) {
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type(name);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
}

/** Rows per screen and the chrome above the list (C4). */
async function rowsPerScreen(label) {
  await p.evaluate(() => {
    document.querySelector('#desk-stage').scrollTop = 0;
  });
  await p.waitForTimeout(300);
  const at0 = await p.evaluate(() => {
    const bar = document.querySelector('aside.cmd-bar').getBoundingClientRect();
    const first = document.querySelector('[data-order-catalog] .ord-wrap').getBoundingClientRect();
    const cat = document.querySelector('[data-order-catalog]').getBoundingClientRect();
    const hint = document.querySelector('[data-cat-hint]');
    return `first row top ${Math.round(first.top)}; catalogue top ${Math.round(cat.top)}; bar top ${Math.round(bar.top)}; hint ${hint ? `${Math.round(hint.getBoundingClientRect().height)} px "${hint.innerText.trim()}"` : 'none'}`;
  });
  // Steady state: scroll the list so a row's top sits at the stage's visible top, count whole rows above the bar
  const counts = [];
  for (const id of ['spy', 'mobilize', 'sanctions', 'national-address']) {
    const c = await p.evaluate((id) => {
      const st = document.querySelector('#desk-stage');
      const w = document.querySelector(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`);
      if (!w) return null;
      const sTop = Math.max(st.getBoundingClientRect().top, 0);
      st.scrollTop += w.getBoundingClientRect().top - sTop - 4;
      const bar = document.querySelector('aside.cmd-bar').getBoundingClientRect().top;
      const rows = [...document.querySelectorAll('[data-order-catalog] .ord-wrap')].filter((r) => {
        const b = r.getBoundingClientRect();
        return b.height > 0 && b.top >= sTop - 0.5 && b.bottom <= bar + 0.5;
      });
      return `${id}: stage visible ${Math.round(sTop)}..${Math.round(bar)} (${Math.round(bar - sTop)} px), whole rows ${rows.length}`;
    }, id);
    if (c) counts.push(c);
  }
  await p.evaluate(() => {
    document.querySelector('#desk-stage').scrollTop = 0;
  });
  log(`C4 ${label} ${p.viewportSize().width}x${p.viewportSize().height}: at top: ${at0}\n   ${counts.join('\n   ')}`);
}

/** Find danger rows: press Add on every available row, record which open a face. */
async function findDanger() {
  const ids = await p.$$eval('[data-order-catalog] .ord-wrap[data-order-state="available"]', (ws) => ws.map((w) => w.dataset.orderId));
  const danger = [];
  for (const id of ids) {
    const act = p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"] .ord-act`).first();
    if (!(await act.count())) continue;
    await act.scrollIntoViewIfNeeded();
    await act.tap();
    await p.waitForTimeout(900);
    if (await p.locator('.ord-confirm').count()) {
      danger.push(id);
      await p.keyboard.press('Escape');
      await p.waitForTimeout(400);
    } else {
      const st = await p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`).first().getAttribute('data-order-state');
      if (st === 'queued') {
        await p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"] .ord-act`).first().tap();
        await p.waitForTimeout(500);
      }
    }
  }
  return { ids, danger };
}

const place = (id, frac) =>
  p.evaluate(
    ([id, frac]) => {
      const st = document.querySelector('#desk-stage');
      const w = document.querySelector(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`);
      st.scrollTop += w.getBoundingClientRect().top - innerHeight * frac;
      return Math.round(w.getBoundingClientRect().top);
    },
    [id, frac],
  );

let closeIdx = 0;
async function probeReach(tag, id, frac, shotName) {
  const top = frac === 'last' ? await place(id, 0.99) : await place(id, frac);
  await p.waitForTimeout(300);
  const before = await scrolls();
  await p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"] .ord-act`).first().tap();
  await p.waitForTimeout(1100);
  const f = await faceFacts();
  const during = await scrolls();
  if (!f) {
    log(`${tag} ${id} @${frac} top=${top}: NO FACE (state ${await p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`).first().getAttribute('data-order-state')})`);
    return;
  }
  if (shotName) await shot(shotName);
  const how = ['Cancel', 'Escape', 'Give'][closeIdx++ % 3];
  if (how === 'Cancel') await p.locator('.ord-confirm [data-confirm-cancel]').first().tap();
  else if (how === 'Escape') await p.keyboard.press('Escape');
  else await p.locator('.ord-confirm [data-confirm-go]').first().tap();
  await p.waitForTimeout(800);
  const after = await scrolls();
  const state = await p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`).first().getAttribute('data-order-state');
  log(`${tag} ${id} @${frac} rowTop=${top}: ${f.txt}\n   scroll before ${JSON.stringify(before)} during ${JSON.stringify(during)} after ${how} ${JSON.stringify(after)} restored:${after.stage === before.stage} state:${state}`);
  if (state === 'queued') {
    await p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"] .ord-act`).first().tap();
    await p.waitForTimeout(500);
  }
}

/** C2: tap a row; forecast and blurb open, nothing queued; second tap closes. */
async function probeTap(tag, id) {
  const w = p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`).first();
  await place(id, 0.4);
  await p.waitForTimeout(300);
  const queuedBefore = await p.locator('[data-order-catalog] .ord-wrap[data-order-state="queued"]').count();
  const geo = await w.evaluate((e) => {
    const hit = e.querySelector('.wc-card-hit')?.getBoundingClientRect();
    const act = e.querySelector('.ord-act')?.getBoundingClientRect();
    const fc = e.querySelector('.ord-meta-fc');
    return `row ${Math.round(e.getBoundingClientRect().height)} px; hit ${hit ? `${Math.round(hit.width)}x${Math.round(hit.height)}` : 'none'}; act ${act ? `${Math.round(act.width)}x${Math.round(act.height)} "${e.querySelector('.ord-act').innerText.trim()}"` : 'none'}; cue "${fc?.innerText.trim() ?? 'none'}" ${fc ? `${Math.round(fc.getBoundingClientRect().width)}x${Math.round(fc.getBoundingClientRect().height)} colour ${getComputedStyle(fc).color}` : ''}`;
  });
  // Tap the middle-left of the row (title area), as a thumb would
  const r = await w.boundingBox();
  await p.touchscreen.tap(r.x + r.width * 0.35, r.y + r.height / 2);
  await p.waitForTimeout(900);
  const open = await w.evaluate((e) => {
    const x = e.querySelector('.ord-expand');
    return x ? `open, row ${Math.round(e.getBoundingClientRect().height)} px; blurb "${x.querySelector('.ord-expand-blurb')?.innerText.trim() ?? 'none'}"; forecast "${x.innerText.replace(/\s+/g, ' ').slice(0, 220)}"; cue now "${e.querySelector('.ord-meta-fc')?.innerText.trim()}"` : 'NOT open';
  });
  const queuedAfter = await p.locator('[data-order-catalog] .ord-wrap[data-order-state="queued"]').count();
  const face = await p.locator('.ord-confirm').count();
  await w.screenshot({ path: path.join(ev, `c2-tap-${id}-${tag}.jpg`), type: 'jpeg', quality: 75 }).catch(() => {});
  if (id === 'mobilize') await shot(`c2-tap-${id}-screen-${tag}`);
  await p.touchscreen.tap(r.x + r.width * 0.35, r.y + 20);
  await p.waitForTimeout(700);
  const closed = await w.evaluate((e) => (e.querySelector('.ord-expand') ? 'still open' : 'closed'));
  const queuedAfter2 = await p.locator('[data-order-catalog] .ord-wrap[data-order-state="queued"]').count();
  log(`C2 ${tag} ${id}: ${geo}\n   first tap: ${open}; queued ${queuedBefore}->${queuedAfter}; face ${face}\n   second tap: ${closed}; queued ${queuedAfter2}`);
}

try {
  if (!(await openCatalog())) throw new Error('no catalogue');
  // ---- no target
  for (const v of VPS) {
    await p.setViewportSize(v);
    await p.waitForTimeout(800);
    await rowsPerScreen('no target');
    await shot(`phone-${mode}-catalog-notarget-${v.width}x${v.height}`);
  }
  await p.setViewportSize(VPS[0]);
  await p.waitForTimeout(600);
  const d0 = await findDanger();
  log(`no target: available rows ${d0.ids.length}; danger rows (open a face): ${d0.danger.join(', ') || 'none'}`);
  const tests = async (label, danger) => {
    const ordered = await p.$$eval('[data-order-catalog] .ord-wrap', (ws) => ws.map((w) => w.dataset.orderId));
    const lastDanger = danger.slice().sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b)).at(-1);
    const first = danger.slice().sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b))[0];
    for (const v of VPS) {
      await p.setViewportSize(v);
      await p.waitForTimeout(800);
      const tag = `${mode} ${label} ${v.width}x${v.height}`;
      for (const id of [...new Set([first, lastDanger])].filter(Boolean)) {
        for (const frac of [0.3, 0.7, 'last']) {
          const name = frac === 0.7 || frac === 'last' ? `s2-${mode}-${label}-${id}-${frac === 'last' ? 'bottom' : '70pct'}-${v.width}x${v.height}` : null;
          await probeReach(tag, id, frac, name);
        }
      }
    }
  };
  await tests('notarget', d0.danger);
  await p.setViewportSize(VPS[0]);
  await setTarget('Russia');
  for (const v of VPS) {
    await p.setViewportSize(v);
    await p.waitForTimeout(800);
    await rowsPerScreen('Russia');
    await shot(`phone-${mode}-catalog-russia-${v.width}x${v.height}`);
  }
  await p.setViewportSize(VPS[0]);
  await p.waitForTimeout(600);
  const d1 = await findDanger();
  log(`Russia: available rows ${d1.ids.length}; danger rows: ${d1.danger.join(', ') || 'none'}`);
  await tests('russia', d1.danger);
  if (mode === 'full') {
    await p.setViewportSize(VPS[0]);
    await p.waitForTimeout(600);
    for (const id of ['mobilize', 'spy', d1.danger[0]].filter(Boolean)) await probeTap('390x844', id);
    // invalid row: what does a tap do?
    const inv = await p.$$eval('[data-order-catalog] .ord-wrap[data-order-state="invalid"], [data-order-catalog] .ord-wrap[data-order-state="unavailable"]', (ws) => ws.map((w) => w.dataset.orderId));
    log(`unavailable rows: ${inv.join(', ')}`);
    if (inv[0]) await probeTap('390x844-unavailable', inv[0]);
  }
  log(`page errors: ${s.errors.slice(0, 4).join(' | ') || 'none'}`);
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
  await shot(`failure-phone-${mode}`).catch(() => {});
} finally {
  fs.writeFileSync(path.join(ev, `probe-phone-${mode}.txt`), `${out.join('\n')}\n`);
  await s.close();
}
