// Iteration 4, design-layout (D-80, RS-008): screenshots the layout mocks at the eight sizes and runs the
// layout audit on each (the same measures the kit's layoutAudit guard will take, AC-L1 to AC-L8).
//   python3 devloop/instances/world-conflict/runs/iter-04/concepts/layout-build.py
//   node devloop/instances/world-conflict/runs/iter-04/layout-shots.mjs [name ...]
// Writes concepts/<name>-<w>x<h>.png (390 also -full.png) and concepts/layout-audit.json; exits 1 on a failure.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync, writeFileSync } from 'node:fs';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'concepts');
const only = process.argv.slice(2);
const pages = readdirSync(dir).filter((f) => /^layout-.*\.html$/.test(f)).map((f) => f.replace(/\.html$/, '')).filter((n) => !only.length || only.includes(n));
const SIZES = [[390, 844], [1024, 768], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440], [3440, 1440], [3840, 2160]];

// The audit runs in the page. Exported shape is what design-layout.md section 7 defines.
function audit() {
  const W = innerWidth, H = innerHeight;
  const vis = (el) => {
    for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; }
    const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  };
  const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60);
  const all = [...document.querySelectorAll('body *')];
  // AC-L1: inner scroll regions (overflow auto/scroll with more content than room), except reading regions
  const scrollers = all.filter((el) => { if (!vis(el)) return false; const s = getComputedStyle(el);
    return (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) || (/(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1); });
  const badScrollers = scrollers.filter((el) => !el.closest('[data-scroll="reading"]'));
  // AC-L4: content clipped by overflow hidden (a region taller than its box hides things silently)
  const clippers = all.filter((el) => { if (!vis(el)) return false; const s = getComputedStyle(el);
    if (!/(hidden|clip)/.test(s.overflowY + s.overflowX)) return false; if (el.closest('svg') || el.matches('svg, .hero, .ctxmap, .ph-map, .mapmain, .app')) return false;
    return el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2; });
  const inter = all.filter((el) => el.matches('button, a[href], [role=button], [role=tab], input, select, summary') && vis(el));
  const out = inter.filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > H + 0.5 || r.right > W + 0.5 || r.top < -0.5 || r.left < -0.5; });
  const covered = inter.filter((el) => { if (out.includes(el)) return false; const r = el.getBoundingClientRect();
    const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 4, r.top + 4], [r.right - 4, r.bottom - 4]];
    return pts.some(([x, y]) => { const hit = document.elementFromPoint(x, y); return hit && !el.contains(hit) && !hit.contains(el) && !hit.closest('[aria-hidden="true"]'); }); });
  const inScroll = inter.filter((el) => badScrollers.some((s) => s.contains(el)));
  const docScroll = document.documentElement.scrollHeight > H + 1;
  const hScroll = document.documentElement.scrollWidth > W + 1;
  // AC-L3: horizontal coverage of the main area (below the state band): share of viewport columns covered by
  // at least one visible content box: a text line box, a control, an image or svg, a card (button).
  const main = document.querySelector(W <= 700 ? '.ph' : '[data-region="main"]');
  const cols = new Uint8Array(W);
  const mark = (r) => { if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > H) return; for (let x = Math.max(0, Math.floor(r.left)); x < Math.min(W, Math.ceil(r.right)); x++) cols[x] = 1; };
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) { if (!n.textContent.trim() || !vis(n.parentElement)) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) mark(r); }
  for (const el of main.querySelectorAll('button, img, svg:not(.world), canvas, input, select')) if (vis(el)) mark(el.getBoundingClientRect());
  let panelW = 0; for (const c of cols) panelW += c;
  // Map mode: the world map is the content of the main area (it fills it); panelCoverage keeps the panels alone
  const worldMap = !!main.querySelector('svg.world') && vis(main.querySelector('svg.world'));
  if (worldMap) mark(main.querySelector('svg.world').getBoundingClientRect());
  let covW = 0; for (const c of cols) covW += c;
  // extent: leftmost to rightmost content
  let lo = W, hi = 0; for (let x = 0; x < W; x++) if (cols[x]) { lo = Math.min(lo, x); hi = x; }
  // AC-L2: state band present, visible, inside the viewport, not covered
  const st = document.querySelector(W <= 700 ? '.ph [data-region="state"]' : '.app [data-region="state"]');
  const sr = st && st.getBoundingClientRect();
  const stateOk = !!st && vis(st) && sr.top >= -0.5 && sr.bottom <= H;
  const stateText = st ? st.textContent.replace(/\s+/g, ' ') : '';
  const stateFields = { capital: /◆ ?3 of 6/.test(stateText), month: /Month \d+/.test(stateText), orders: /Orders/.test(stateText) || /Things/.test(stateText) };
  // AC-L5: phone cue: when an answer is below the fold (or under the bottom bar), a visible cue says how many
  let cue = null;
  if (W <= 700) {
    const bar = document.querySelector('.ph .ph-bottom'); const limit = bar ? bar.getBoundingClientRect().top : H;
    const below = [...document.querySelectorAll('.ph [data-answer]')].filter((el) => el.getBoundingClientRect().bottom > limit + 1);
    const c = document.querySelector('.ph .below');
    cue = { below: below.length, cueVisible: !!c && vis(c) && !c.hidden, cueText: c ? c.textContent : '' };
  }
  // AC-L6: the month's must-act controls in view (Execute, Accept all or Review n recommended, every answer card)
  const must = [...document.querySelectorAll(W <= 700 ? '.ph .exec, .ph .btn.big' : '.app .exec, .app .execmap, .app [data-answer]')].filter(vis);
  const acc = [...document.querySelectorAll('.app button')].filter((b) => vis(b) && /^(Accept all recommended|☰ Review \d+ recommended)/.test(b.textContent.trim()));
  const mustOut = W <= 700 ? [] : must.concat(acc).filter((el) => out.includes(el) || covered.includes(el)).map(name);
  // AC-L7: text floor 15 px on visible text
  const small = [];
  const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w2.nextNode(); n; n = w2.nextNode()) { if (!n.textContent.trim() || !vis(n.parentElement) || n.parentElement.closest('svg')) continue; const fs = parseFloat(getComputedStyle(n.parentElement).fontSize); if (fs < 14.9) small.push(`${fs}px ${n.textContent.trim().slice(0, 30)}`); }
  // AC-L8: no truncated button text
  const trunc = inter.filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible').map(name);
  // AC-L11: no two controls overlap (a squeezed column draws rows over each other)
  const overlaps = [];
  // phone: the sticky bars cover the page as it scrolls by design (what is under them counts as below the fold)
  const boxes = inter.filter((el) => !out.includes(el) && !el.closest('.ph-bottom, .ph-state')).map((el) => [el, el.getBoundingClientRect()]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a, ra] = boxes[i], [b, rb] = boxes[j]; if (a.contains(b) || b.contains(a)) continue;
    const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 2 && h > 2) overlaps.push(`${name(a).slice(0, 25)} / ${name(b).slice(0, 25)}`);
  }
  // text that spills out of its control (rows squeezed below their content height)
  const spill = inter.filter((el) => el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0 && !el.matches('.seg')).map(name);
  // AC-L9: exactly one visible Execute button
  const execs = [...document.querySelectorAll('button')].filter((b) => vis(b) && /^Execute month/.test(b.textContent.trim())).length;
  // AC-L10 fill (1600 wide and 900 tall or more): each region's lowest content reaches within 15 % of its bottom
  const fill = {};
  if (W > 700) for (const r of document.querySelectorAll('.app [data-region="list"], .app [data-region="item"], .app [data-region="plan"]')) {
    if (!vis(r)) continue; const rb = r.getBoundingClientRect(); let low = rb.top;
    for (const el of r.querySelectorAll('*')) { if (!vis(el) || el.children.length) continue; low = Math.max(low, el.getBoundingClientRect().bottom); }
    fill[r.dataset.region + (r.classList.contains('mapcard') ? '(card)' : '')] = +((low - rb.top) / rb.height).toFixed(2);
  }
  // folds applied by the fit rule (L-10)
  const folded = [...document.querySelectorAll('.app .psec.folded')].filter((s) => vis(s.parentElement)).map((s) => s.querySelector('.h').textContent.trim());
  return {
    W, H, rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
    innerScroll: badScrollers.map((e) => e.className || e.tagName), interactiveInScroll: inScroll.map(name),
    readingScroll: scrollers.length - badScrollers.length,
    docScroll, hScroll, clipped: clippers.map((e) => `${e.className} ${e.scrollHeight}>${e.clientHeight}`),
    interactiveOut: out.map(name), interactiveCovered: covered.map(name), mustOut,
    coverage: +(covW / W).toFixed(3), panelCoverage: +(panelW / W).toFixed(3), extent: +((hi - lo + 1) / W).toFixed(3), worldMap,
    stateOk, stateFields, cue, execs, fill, overlaps, spill, small: small.slice(0, 5), truncated: trunc, folded,
  };
}

function verdict(a) {
  const f = [];
  const big = a.W >= 1366 && a.H >= 768;
  if (a.hScroll) f.push('horizontal scroll');
  if (!a.stateOk || !Object.values(a.stateFields).every(Boolean)) f.push('state band');
  if (a.small.length) f.push('text under 15 px');
  if (a.overlaps.length) f.push(`overlapping controls: ${a.overlaps.slice(0, 3).join('; ')}`);
  if (a.spill.length) f.push(`text spills out of: ${a.spill.slice(0, 3).join('; ')}`);
  if (a.truncated.length) f.push('truncated button');
  if (a.W > 700) {
    if (a.innerScroll.length) f.push('inner scroll region');
    if (a.docScroll) f.push('page scrolls');
    if (a.interactiveOut.length || a.interactiveCovered.length) f.push('control out of view or covered');
    if (a.mustOut.length) f.push('must-act control out of view');
    if (a.clipped.length) f.push('clipped region');
  } else {
    if (a.innerScroll.length) f.push('inner scroll region on phone');
    if (a.cue.below > 0 && !a.cue.cueVisible) f.push('answers below the fold without a cue');
  }
  // phone desk: Execute lives on the review screen only (AC-21), so 0 is right there; everywhere else exactly 1
  if (a.W <= 700 ? a.execs > 1 : a.execs !== 1) f.push(`${a.execs} Execute buttons`);
  if (a.W >= 1600 && a.H >= 900) for (const [k, v] of Object.entries(a.fill)) if (k !== 'item(card)' && v < 0.85) f.push(`${k} fill ${v} < 0.85`);
  if (a.W >= 1920 && a.coverage < 0.85) f.push(`coverage ${a.coverage} < 0.85`);
  if (big && a.interactiveInScroll.length) f.push('month control inside a scroll region');
  return f;
}

const browser = await chromium.launch();
const results = [];
let failed = 0;
for (const name of pages) {
  for (const [w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(join(dir, `${name}.html`)).href);
    await page.waitForTimeout(200);
    const a = await page.evaluate(audit);
    const f = verdict(a);
    const shot = `${name}-${w}x${h}.png`;
    await page.screenshot({ path: join(dir, shot) });
    if (w <= 700) await page.screenshot({ path: join(dir, `${name}-${w}x${h}-full.png`), fullPage: true });
    results.push({ page: name, size: `${w}x${h}`, shot, pass: !f.length, failures: f, ...a });
    if (f.length) failed++;
    console.log(`${f.length ? 'FAIL' : 'ok  '} ${shot.padEnd(34)} root ${a.rootPx.toFixed(1)}px  coverage ${a.coverage}  extent ${a.extent}  fill ${JSON.stringify(a.fill)}${a.folded.length ? `  folded: ${a.folded.join(' | ')}` : ''}${a.cue ? `  below ${a.cue.below} cue "${a.cue.cueText}"` : ''}${f.length ? `\n     ${f.join('; ')} ${JSON.stringify({ o: a.interactiveOut, c: a.interactiveCovered, s: a.innerScroll, cl: a.clipped, sm: a.small, t: a.truncated })}` : ''}`);
    await page.close();
  }
}
await browser.close();
writeFileSync(join(dir, 'layout-audit.json'), `${JSON.stringify(results, null, 1)}\n`);
console.log(`${results.length - failed} of ${results.length} pass`);
process.exit(failed ? 1 : 0);
