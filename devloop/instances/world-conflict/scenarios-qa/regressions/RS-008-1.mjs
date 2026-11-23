// RS-008-1 (D-80, D-81, design-layout.md section 10): the World Conflict extras of the layout guard
// that the generic kit audit (RS-008.mjs) does not measure, on the real month: AC-L2 state band,
// AC-L3 width, AC-L6 must-act controls in view, AC-L7 15 px floor, AC-L8 no truncation, AC-L9 one
// Execute, AC-L10 fill, AC-L11 no overlap or spill, AC-L12 fit rule with 7 recommended (Show opens a
// folded section, no scroll), AC-L13 breakpoint forms, AC-L14 root size; and the agenda's acceptance
// criteria (design-agenda.md 0.10 and 0.12): AC-2 progress words, AC-5 / D1 / D5 / D9 answer cards
// with a Choose face, one plain "Recommended by" line and Skip as the last card with its
// consequence, AC-21 phones have one Execute and only on the review screen, AC-25 the map bar's one
// primary is Execute and its list button reads "Review n recommended", AC-26 the Skip card is in
// view without overlap, AC-27 no "Accept" on any button, AF-14 the recommendation line is not
// styled as a control, auto-advance after Choose, Skip and Undo.
// Seat: Hormuz Convoy as the United States, seed 4242 (_lib SEAT); month 1, and month 4 (three
// months resolved with no orders and the default answers: a call on the desk and 7 recommended).
// Sizes: the CEO's 3440x1440 first, then 3840x2160, 2560x1440, 1920x1080, 1599x900, 1440x900,
// 1366x820, 1366x768, 1024x768 and 390x844.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/RS-008-1.mjs <outDir> <baseUrl> <apiUrl>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { deviceFor } from '../../../../kit/kit.mjs';
import { SEAT, args, guard } from './_lib.mjs';

const { out, base, api } = args('RS-008-1');
const g = guard('RS-008-1');
const SIZES = (process.env.RS0081_SIZES ?? '3440x1440,3840x2160,2560x1440,1920x1080,1599x900,1440x900,1366x820,1366x768,1024x768,390x844').split(',');

async function newSave(months, guest) {
  const post = (p, body) => fetch(`${api}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
  const d = await post('/new-game', { playerCountryId: SEAT.countryId, flashpointId: SEAT.flashpointId, mode: 'FLASHPOINT', seed: SEAT.seed, playerId: guest, saveName: 'RS-008-1' });
  if (!d.success) throw new Error(`new game: ${JSON.stringify(d).slice(0, 200)}`);
  for (let i = 0; i < months; i++) {
    const t = await post('/turn', { saveId: d.saveId, playerActions: [], decisions: [] });
    if (!t.success) throw new Error(`turn: ${JSON.stringify(t).slice(0, 200)}`);
  }
  return d.saveId;
}

/** Runs in the page: the measures of design-layout.md section 9 on the real selectors. */
function audit() {
  const W = innerWidth, H = innerHeight;
  const vis = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 50);
  const ignore = (el) => !!el.closest('.ticker, .map-stage, .maplibregl-map, svg, [data-scroll="reading"], .wc-coach, [class*="coach"]');
  const region = (r) => document.querySelector(`[data-region="${r}"]`);
  const inter = [...document.querySelectorAll('button, a[href], [role=button], [role=tab], input, select, summary')].filter((el) => vis(el) && !ignore(el));
  const out = inter.filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > H + 0.5 || r.right > W + 0.5 || r.top < -0.5 || r.left < -0.5; });
  const covered = (el) => {
    const r = el.getBoundingClientRect();
    return [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 5, r.top + 5], [r.right - 5, r.bottom - 5]].some(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit && !el.contains(hit) && !hit.contains(el) && !hit.closest('.wc-coach, [class*="coach"]');
    });
  };
  const phone = W <= 700;
  const st = region('state');
  const sr = st?.getBoundingClientRect();
  const stateText = st ? st.textContent.replace(/\s+/g, ' ') : '';
  const stateOk = !!st && vis(st) && sr.top >= -0.5 && sr.bottom <= H + 0.5 && !covered(st.querySelector('.sb-s, .sb-line') ?? st);
  const answers = [...document.querySelectorAll('[data-region="item"] .thing .opt')].filter(vis);
  const execs = [...document.querySelectorAll('button')].filter((b) => vis(b) && /^Execute month \d+/.test(b.textContent.trim()));
  const choose = [...document.querySelectorAll('button')].filter((b) => vis(b) && /^(Choose all recommended \(\d+\)|Review \d+ recommended)/.test(b.textContent.trim()));
  const must = [...answers, ...execs, ...choose];
  const mustOut = phone ? [] : must.filter((el) => out.includes(el) || covered(el)).map(name);
  // AC-L7: visible text under 15 px inside the game screen's regions
  const small = [];
  for (const r of document.querySelectorAll('[data-region]')) {
    const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const p = n.parentElement;
      if (!n.textContent.trim() || !p || !vis(p) || ignore(p) || p.closest('kbd, .scene')) continue;
      const fs = parseFloat(getComputedStyle(p).fontSize);
      if (fs < 14.9) small.push(`${fs}px "${n.textContent.trim().slice(0, 24)}"`);
    }
  }
  const truncated = inter.filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible' && getComputedStyle(el).textOverflow === 'ellipsis').map(name);
  const boxes = inter.filter((el) => !out.includes(el) && !el.closest('.ph-bottom, .game-top') && !el.matches('.lx-info')).map((el) => [el, el.getBoundingClientRect()]);
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, ra] = boxes[i];
      const [b, rb] = boxes[j];
      if (a.contains(b) || b.contains(a)) continue;
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w > 2 && h > 2) overlaps.push(`${name(a).slice(0, 22)} / ${name(b).slice(0, 22)}`);
    }
  // (the paragraph explain mark draws a 44 px hit area with ::after on purpose: not a spill)
  const spill = inter.filter((el) => el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0 && !el.matches('.seg, .seg *, .lx-info')).map(name);
  const fill = {};
  for (const id of ['list', 'item', 'plan']) {
    const r = region(id);
    if (!r || !vis(r)) continue;
    const rb = r.getBoundingClientRect();
    let low = rb.top;
    for (const el of r.querySelectorAll('*')) if (vis(el) && !el.children.length) low = Math.max(low, el.getBoundingClientRect().bottom);
    fill[id] = +((low - rb.top) / rb.height).toFixed(2);
  }
  // AC-L3 coverage below the state band (text, controls, pictures); the world map counts in Map mode
  const cols = new Uint8Array(W);
  const mark = (r) => { if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > H) return; for (let x = Math.max(0, Math.floor(r.left)); x < Math.min(W, Math.ceil(r.right)); x++) cols[x] = 1; };
  const body = document.querySelector('.game-body');
  if (body) {
    const tw = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.textContent.trim() || !n.parentElement || !vis(n.parentElement)) continue;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) mark(r);
    }
    for (const el of body.querySelectorAll('button, img, svg, canvas, input, select, figure')) if (vis(el)) mark(el.getBoundingClientRect());
  }
  let cov = 0;
  for (const c of cols) cov += c;
  const scrollers = [...document.querySelectorAll('.game *')].filter((el) => {
    if (!vis(el) || el.closest('[data-scroll="reading"], .map-stage, .ticker')) return false;
    const s = getComputedStyle(el);
    return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
  }).map((e) => e.className.toString().slice(0, 40));
  const recLines = [...document.querySelectorAll('[data-rec]')].filter(vis);
  const recStyled = recLines.filter((el) => { const s = getComputedStyle(el); return s.borderStyle !== 'none' && parseFloat(s.borderWidth) > 0 || s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.boxShadow !== 'none' || s.cursor === 'pointer' && el.parentElement && getComputedStyle(el.parentElement).cursor !== 'pointer'; }).length;
  const accept = [...document.querySelectorAll('button')].filter((b) => vis(b) && /\bAccept\b/.test(b.textContent)).map(name);
  const bar = document.querySelector('.plan.f-bar');
  const barPrimaries = bar ? [...bar.querySelectorAll('button.primary')].filter(vis).map(name) : null;
  const barReview = bar ? [...bar.querySelectorAll('button')].filter(vis).some((b) => /^Review \d+ recommended/.test(b.textContent.trim())) : null;
  const skip = document.querySelector('[data-region="item"] .skipopt');
  const skipOk = !skip ? null : vis(skip) && !covered(skip) && (phone || !out.includes(skip));
  const answersFace = answers.every((a) => /^(Choose|Your choice|Skip)$/.test(a.querySelector('.face')?.textContent.trim() ?? ''));
  const lastIsSkip = answers.length ? answers.at(-1).classList.contains('skipopt') : null;
  const skipText = skip ? skip.textContent.replace(/\s+/g, ' ') : '';
  const where = document.querySelector('.month-bar .mb-where span, .ph-thingline .mb-where span')?.textContent ?? '';
  const cue = phone ? (() => {
    const b = document.querySelector('.ph-bottom');
    const limit = b ? b.getBoundingClientRect().top : H;
    const below = answers.filter((a) => a.getBoundingClientRect().bottom > limit + 1).length;
    const c = document.querySelector('.ph-bottom [data-below-cue]');
    return { below, visible: !!c && vis(c), text: c?.textContent ?? '' };
  })() : null;
  return {
    W, H, rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
    stateOk, stateText: stateText.slice(0, 200),
    listForm: region('list') && vis(region('list')) ? region('list').dataset.form : null,
    planForm: region('plan') ? region('plan').dataset.form : null,
    answers: answers.length, answersFace, lastIsSkip, skipText, skipOk, recLines: recLines.length, recStyled,
    execs: execs.length, choose: choose.map(name), mustOut, small: small.slice(0, 5), truncated, overlaps: overlaps.slice(0, 4), spill: spill.slice(0, 4),
    fill, coverage: +(cov / W).toFixed(2), scrollers, docScroll: document.documentElement.scrollHeight > H + 1, accept, barPrimaries, barReview, where, cue,
    folded: [...document.querySelectorAll('[data-region="plan"] .psec-tog')].filter(vis).length,
  };
}

const ROOT = { 1080: 16, 1440: 17.5, 2160: 20.6 };

function judge(a, label, { mode, month }) {
  const at = `${label}`;
  const desk = mode === 'desk';
  const phone = a.W <= 700;
  g.check(a.stateOk && /Month \d+/.test(a.stateText) && /◆ -?\d+ of 6/.test(a.stateText) && /Orders \d+ of 6/.test(a.stateText), `${at} AC-L2: the state band is in view with the month, ◆ n of 6 and Orders n of 6`);
  if (ROOT[a.H] && a.W >= 1920) g.check(Math.abs(a.rootPx - ROOT[a.H]) <= 0.3, `${at} AC-L14: root size ${a.rootPx} px (${ROOT[a.H]})`);
  g.check(!a.small.length, `${at} AC-L7: no text under 15 px (${a.small.join('; ')})`);
  g.check(!a.truncated.length, `${at} AC-L8: no truncated button text (${a.truncated.join('; ')})`);
  g.check(!a.accept.length, `${at} AC-27: no "Accept" on a button (${a.accept.join('; ')})`);
  g.check(a.recStyled === 0, `${at} AF-14: the "Recommended by" line has no border, background, shadow or cursor of its own`);
  if (phone) {
    g.check(desk ? a.execs === 0 : a.execs === 1, `${at} AC-21 / AC-L9: phone ${mode}: ${desk ? 'no Execute before the review screen' : 'one Execute'} (${a.execs})`);
    if (a.cue && a.cue.below > 0) g.check(a.cue.visible && /\d+ more answers?|Skip below/.test(a.cue.text), `${at} AC-L5: answers below the fold are announced ("${a.cue.text}")`);
    return;
  }
  g.check(a.execs === 1, `${at} AC-L9: exactly one Execute month button (${a.execs})`);
  g.check(!a.scrollers.length && !a.docScroll, `${at} AC-L1: no inner scroll, no page scroll (${a.scrollers.join(', ')}${a.docScroll ? ' page' : ''})`);
  g.check(!a.mustOut.length, `${at} AC-L6: every answer, Skip, Choose all / Review and Execute in view and not covered (${a.mustOut.join('; ')})`);
  g.check(!a.overlaps.length && !a.spill.length, `${at} AC-L11: no overlapping controls, no spill (${[...a.overlaps, ...a.spill].join('; ')})`);
  const listWant = desk ? (a.W >= 1600 ? 'column' : null) : a.W >= 2240 && a.H >= 1200 ? 'float' : null;
  const planWant = desk ? (a.W >= 1280 ? 'rail' : 'bar') : a.W >= 1600 ? 'float' : 'bar';
  g.check(a.planForm === planWant && (listWant === null ? a.listForm === null || a.listForm === 'column' : a.listForm === listWant), `${at} AC-L13: forms Plan ${a.planForm} (${planWant}), List ${a.listForm} (${listWant ?? 'See all'})`);
  if (a.W >= 1600 && a.H >= 900 && desk) for (const [k, v] of Object.entries(a.fill)) g.check(v >= 0.85, `${at} AC-L10: ${k} filled to ${v} of its height`);
  if (a.W >= 1920) g.check(a.coverage >= 0.85, `${at} AC-L3: coverage ${a.coverage}`);
  if (a.planForm === 'bar') g.check(a.barPrimaries?.length === 1 && /Execute month/.test(a.barPrimaries[0]) && a.barReview, `${at} AC-25 / D4: the bar's one primary is Execute and its list button reads "Review n recommended" (${a.barPrimaries?.join(', ')})`);
  if (a.answers) {
    g.check(a.answersFace && a.lastIsSkip, `${at} AC-5 / D5 / D9: each answer is one card with a Choose face, Skip is the last card`);
    g.check(/Free|Costs|Nothing happens|cabinet|answers|usual answer/.test(a.skipText), `${at} D5: the Skip card says what happens instead ("${a.skipText.slice(0, 70)}")`);
    if (month === 4) g.check(/^\d+ done, \d+ to go$/.test(a.where.trim()), `${at} AC-2: progress in words ("${a.where}")`);
  }
  if (a.W >= 1024 && a.H <= 900 && a.skipOk !== null) g.check(a.skipOk, `${at} AC-26: the Skip card is in view without overlap`);
}

const browser = await chromium.launch();
async function open(size, months, mode) {
  const guest = `guest-rs0081-${size}-${months}-${mode}-${Date.now()}`;
  const save = await newSave(months, guest);
  const dev = deviceFor(size);
  const ctx = await browser.newContext({ ...dev, ...(dev.viewport.width <= 700 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(([gu, s]) => {
    localStorage.setItem('worldconflict.guest', gu);
    localStorage.setItem('worldconflict.lastSave', s);
    localStorage.setItem('worldconflict.sound', JSON.stringify({ muted: true }));
    localStorage.setItem('worldconflict.coach', 'done');
  }, [guest, save]);
  await page.goto(base);
  await page.getByRole('button', { name: /^Continue/i }).first().click({ timeout: 30000 });
  await page.locator('[data-region="item"]').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1800);
  if (mode === 'map') {
    await page.keyboard.press('m');
    await page.locator('.map-month').first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(1500);
  }
  return { ctx, page, errors };
}

const shots = path.join(out, 'shots');
fs.mkdirSync(shots, { recursive: true });
try {
  for (const size of SIZES) {
    for (const [months, mode] of [[0, 'desk'], [3, 'desk'], [3, 'map']]) {
      const label = `${size}${size === '3440x1440' ? ' CEO' : ''} ${mode} month ${months + 1}`;
      const s = await open(size, months, mode);
      const a = await s.page.evaluate(audit);
      await s.page.screenshot({ path: path.join(shots, `${size}-${mode}-m${months + 1}.png`) });
      judge(a, label, { mode, month: months + 1 });
      // Interactions (design-layout 14.4) on the month-4 desk at the two sizes the checklist names
      if (months === 3 && mode === 'desk' && (size === '1366x768' || size === '3440x1440' || size === '1440x900')) {
        const p = s.page;
        const choose = p.getByRole('button', { name: /^Choose all recommended \((\d+)\)/ }).first();
        const n = Number(/\((\d+)\)/.exec((await choose.innerText().catch(() => '')) ?? '')?.[1] ?? 0);
        g.check(n >= 5, `${label}: month 4 has at least 5 recommended (${n})`);
        // AC-L12: folded sections show count, summary and Show; Show opens one with no scroll
        if (size !== '3440x1440') {
          g.check(a.folded > 0, `${label} AC-L12: the fit rule folds a section (${a.folded} folded)`);
          const show = p.locator('[data-region="plan"] .psec-tog').first();
          if (await show.isVisible().catch(() => false)) {
            const sum = (await p.locator('[data-region="plan"] .psec-sum').first().innerText().catch(() => '')).trim();
            g.check(sum.length > 0, `${label} AC-L12: the folded section has a summary ("${sum.slice(0, 50)}")`);
            await show.click();
            await p.waitForTimeout(500);
            const b = await p.evaluate(audit);
            g.check(!b.scrollers.length && !b.mustOut.length && b.choose.some((c) => /Choose all recommended \(\d+\)/.test(c)), `${label} AC-L12: Show opens it with no scroll; Choose all and Execute stay in view`);
          }
        }
        // Choose an answer: the Plan updates and the month moves on (One at a time)
        const before = (await p.locator('.month-bar .mb-where b').innerText()).trim();
        await p.locator('[data-region="item"] .thing .opt:not(.skipopt)').first().click();
        await p.waitForTimeout(600);
        const after = (await p.locator('.month-bar .mb-where b').innerText()).trim();
        g.check(after !== before, `${label}: Choose moves on to the next thing ("${before}" -> "${after}")`);
        g.check(/Decided \([1-9]/.test(await p.locator('[data-region="plan"]').innerText()), `${label}: the Plan counts the decision`);
        // Skip, then Undo
        const skip = p.locator('[data-region="item"] .skipopt').first();
        if (await skip.isVisible().catch(() => false)) {
          await skip.click();
          await p.waitForTimeout(500);
          const planText = await p.locator('[data-region="plan"]').innerText();
          g.check(/Skipped \(1\)/.test(planText), `${label}: Skip is listed under Skipped`);
          const undo = p.getByRole('button', { name: /^Undo/ }).first();
          if (await undo.isVisible().catch(() => false)) await undo.click();
          else {
            await p.locator('[data-region="plan"] .psec-tog').last().click().catch(() => {});
            await p.getByRole('button', { name: /^Undo/ }).first().click().catch(() => {});
          }
          await p.waitForTimeout(500);
          g.check(!/Skipped \(1\)/.test(await p.locator('[data-region="plan"]').innerText()), `${label}: Undo takes the skip back`);
        }
        const c = await p.evaluate(audit);
        g.check(!c.scrollers.length && !c.mustOut.length, `${label}: after Choose, Skip and Undo nothing scrolls and every must-act control is still in view`);
      }
      // Phones: the review screen holds the only Execute (AC-21)
      if (size === '390x844' && mode === 'desk') {
        const p = s.page;
        for (let i = 0; i < 10; i++) {
          const next = p.locator('.ph-bottom .ph-next').first();
          if (!(await next.isVisible().catch(() => false))) break;
          const t = await next.innerText();
          await next.click();
          await p.waitForTimeout(250);
          if (/Review/.test(t)) break;
        }
        const r = await p.evaluate(audit);
        g.check(r.execs === 1 && /Check what will happen/.test(await p.locator('[data-review]').innerText().catch(() => '')), `${label} AC-21: the review screen has the one Execute with "If you execute now"`);
      }
      g.check(s.errors.length === 0, `${label}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
      await s.ctx.close();
    }
  }
} catch (e) {
  g.check(false, `threw: ${e.message.split('\n')[0]}`);
} finally {
  await browser.close();
}
g.finish();
