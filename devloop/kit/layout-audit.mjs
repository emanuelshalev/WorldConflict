#!/usr/bin/env node
// Layout audit: measures whether a screen uses the space it has and shows what the player must see
// or act on without hidden scrolling. Product-agnostic; selectors and thresholds come from a config.
// Method: devloop/method/layout-audit.md.
//
//   node devloop/kit/layout-audit.mjs <url> --config <config.json|.mjs> [--viewports 1366x768,1920x1080]
//                                     [--out dir] [--name label] [--wait ms]
//
// Library use (a guard that drives the product into a state first):
//   import { auditViewports, printAudit } from 'devloop/kit/layout-audit.mjs';
//   const rows = await auditViewports(page, { config, viewports, out, name: 'month-1' });
//   // a viewport may carry a label ({ width: 3440, height: 1440, label: 'CEO' }), shown in the table
//   printAudit(rows);   // table; rows[i].violations lists the rule breaks
//
// Per viewport it measures (measureLayout, run inside the page):
//   (a) scroll regions: elements with overflow auto/scroll whose scrollHeight > clientHeight + 2 and
//       that contain an interactive element or a listed region (exempt scrollers are reported, never ruled);
//   (b) interactive or listed elements below the fold of the page or of their scroll container;
//   (c) page-level vertical scroll;
//   (d) used width: the union of the content boxes' horizontal extents vs the viewport width, and
//       the empty side margins;
//   (e) controls cut off by a clipping ancestor or covered at their centre (elementFromPoint).
// and each listed region's state: expanded (on screen), collapsed (a visible summary with a count) or missing.
//
// Config:
//   {
//     regions:  [{ id: 'actions', selector: '.rail .execute', summary: '.bar-plan' }],  // must be visible
//     content:  ['.panel', '.rail'],          // boxes whose union is the used width
//     interactive: 'button, a[href], ...',    // optional, default below
//     ignore:   ['.ticker'],                  // subtrees left out of every measure
//     exempt:   ['.chat-log'],                // scrollers allowed to scroll (a log, a long list by design)
//     root:     '.dialog',                    // optional: measure only inside it (a modal over the page)
//     rules: [                                // each rule applies when its `when` matches the viewport
//       { id: 'no-inner-scroll', check: 'inner-scroll', when: { minWidth: 1366, minHeight: 768 } },
//       { id: 'no-page-scroll',  check: 'page-scroll',  when: { minWidth: 1366, minHeight: 768 } },
//       { id: 'no-hidden-items', check: 'below-fold',   when: { minWidth: 1366, minHeight: 768 }, max: 0 },
//       { id: 'use-the-width',   check: 'used-width',   when: { minWidth: 1920 }, min: 0.85 },
//       { id: 'collapsed-not-hidden', check: 'collapsed-not-hidden', when: { widths: [390, 1024] } },
//       { id: 'not-covered',     check: 'occluded', max: 0 },
//     ],
//   }
// `when`: minWidth, maxWidth, minHeight, maxHeight, widths (exact list); no `when` = every viewport.
// `max` is the allowed count (default 0); `min` the minimum used-width ratio (default 0.85).
// `regions` limits a check to some region ids (collapsed-not-hidden, below-fold).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_INTERACTIVE =
  'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="option"], [role="menuitem"], [role="switch"], [role="checkbox"], [role="link"]';

export const DEFAULT_RULES = [
  { id: 'no-inner-scroll', check: 'inner-scroll', when: { minWidth: 1366, minHeight: 768 } },
  { id: 'no-page-scroll', check: 'page-scroll', when: { minWidth: 1366, minHeight: 768 } },
  { id: 'no-hidden-items', check: 'below-fold', when: { minWidth: 1366, minHeight: 768 } },
  { id: 'use-the-width', check: 'used-width', when: { minWidth: 1920 }, min: 0.85 },
  { id: 'collapsed-not-hidden', check: 'collapsed-not-hidden', when: { widths: [390, 1024] } },
  { id: 'not-covered', check: 'occluded' },
];

/** Parse "1366x768,1920x1080" into [{ width, height }]. */
export function parseViewports(spec) {
  return String(spec)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => {
      const m = /^(\d+)x(\d+)$/.exec(v);
      if (!m) throw new Error(`bad viewport "${v}" (want WIDTHxHEIGHT)`);
      return { width: Number(m[1]), height: Number(m[2]) };
    });
}

/**
 * Runs inside the page (page.evaluate(measureLayout, cfg)): it must stay self-contained.
 * Returns the raw measurements for the current viewport; evaluateRules turns them into violations.
 */
export function measureLayout(cfg = {}) {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const interactiveSel = cfg.interactive || 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="option"], [role="menuitem"], [role="switch"], [role="checkbox"], [role="link"]';
  const ignore = (cfg.ignore || []).join(', ');
  const exempt = (cfg.exempt || []).join(', ');
  // root: measure only inside these elements (a dialog over the page); the page scroll stays global
  const roots = cfg.root ? [...document.querySelectorAll(cfg.root)] : null;
  const ignored = (el) => (!!ignore && !!el.closest(ignore)) || (!!roots && !roots.some((r) => r === el || r.contains(el)));

  const label = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
    const sel = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls.map((c) => `.${c}`).join('')}`;
    const text = (el.getAttribute('aria-label') || el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return text ? `${sel} "${text}"` : sel;
  };
  const visible = (el) => {
    if (!el.getClientRects().length) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const st = getComputedStyle(e);
      if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return false;
    }
    return true;
  };
  const isScroller = (el) => {
    if (el === document.documentElement || el === document.body) return false;
    const st = getComputedStyle(el);
    return /(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 2;
  };
  const clips = (el) => {
    const st = getComputedStyle(el);
    return st.overflowY !== 'visible' || st.overflowX !== 'visible';
  };
  /**
   * The visible window of an element: the viewport cut by every clipping ancestor. `scroller` and
   * `clipper` are the nearest scrolling / non-scrolling ancestors whose client area leaves the
   * element's centre out (null when the centre is inside them).
   */
  const clipOf = (el) => {
    const r0 = el.getBoundingClientRect();
    const cx = r0.left + r0.width / 2;
    const cy = r0.top + r0.height / 2;
    let box = { left: 0, top: 0, right: vw, bottom: vh };
    let scroller = null;
    let clipper = null;
    let partClipper = null;
    let nearest = null;
    let inScroller = false;
    let fixed = getComputedStyle(el).position === 'fixed';
    for (let e = el.parentElement; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      if (fixed) break; // a fixed element escapes its ancestors' clipping (no transformed ancestors assumed)
      if (getComputedStyle(e).position === 'fixed') fixed = true;
      if (!clips(e)) continue;
      const r = e.getBoundingClientRect();
      // the client area (inside borders, without the scrollbar)
      const c = { left: r.left + e.clientLeft, top: r.top + e.clientTop };
      c.right = c.left + e.clientWidth;
      c.bottom = c.top + e.clientHeight;
      const scrolls = isScroller(e);
      if (scrolls) inScroller = true;
      if (cx < c.left || cx > c.right || cy < c.top || cy > c.bottom) {
        if (scrolls) scroller = scroller || e;
        else clipper = clipper || e;
        // the nearest culprit decides: inside a scroll list clipped again by its panel, scrolling reveals it
        if (!nearest) nearest = scrolls ? 'scroller' : 'clipper';
      }
      const outY = Math.max(0, c.top - r0.top) + Math.max(0, r0.bottom - c.bottom);
      const outX = Math.max(0, c.left - r0.left) + Math.max(0, r0.right - c.right);
      if (!scrolls && !partClipper && !inScroller && (outY > r0.height * 0.25 || outX > r0.width * 0.25)) partClipper = e;
      box = { left: Math.max(box.left, c.left), top: Math.max(box.top, c.top), right: Math.min(box.right, c.right), bottom: Math.min(box.bottom, c.bottom) };
    }
    return { box, scroller, clipper, partClipper, nearest, inScroller };
  };

  const interactive = [...document.querySelectorAll(interactiveSel)].filter((el) => !ignored(el) && visible(el) && !el.closest('[inert]'));
  const regionEls = (cfg.regions || []).map((r) => ({ ...r, els: [...document.querySelectorAll(r.selector)].filter((el) => !ignored(el) && visible(el)) }));
  const regionOf = (el) => regionEls.filter((r) => r.els.some((x) => x === el || x.contains(el))).map((r) => r.id);

  // (b) + (e): where each interactive element sits
  const hidden = [];
  const hiddenEls = new Set();
  const cutoff = [];
  const occluded = [];
  let inView = 0;
  const pageScrolls = document.documentElement.scrollHeight > vh + 2 && getComputedStyle(document.documentElement).overflowY !== 'hidden' && getComputedStyle(document.body).overflowY !== 'hidden';
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    const { box, scroller, clipper, partClipper, nearest, inScroller } = clipOf(el);
    const cy = r.top + r.height / 2;
    const cx = r.left + r.width / 2;
    const centreIn = cy >= box.top && cy <= box.bottom && cx >= box.left && cx <= box.right;
    if (!centreIn) {
      const where = nearest === 'scroller' ? 'container' : nearest === 'clipper' ? 'clipped' : cy > vh && pageScrolls ? 'page' : 'offscreen';
      const entry = { label: label(el), where, y: Math.round(r.top), regions: regionOf(el), container: scroller ? label(scroller) : null };
      if (where === 'container' || where === 'page') {
        hidden.push(entry);
        hiddenEls.add(el);
      }
      else cutoff.push({ ...entry, by: clipper ? label(clipper) : 'viewport' });
      continue;
    }
    inView++;
    // Partly cut: a non-scrolling ancestor (or the viewport) hides more than a quarter of the box
    const outVp = Math.max(0, r.bottom - vh) > r.height * 0.25 || Math.max(0, r.right - vw) > r.width * 0.25;
    if (partClipper || (outVp && !pageScrolls && !inScroller)) cutoff.push({ label: label(el), where: 'partly', y: Math.round(r.top), regions: regionOf(el), by: partClipper ? label(partClipper) : 'viewport' });
    const hit = document.elementFromPoint(Math.min(vw - 1, Math.max(0, cx)), Math.min(vh - 1, Math.max(0, cy)));
    if (hit && hit !== el && !el.contains(hit) && !hit.contains(el) && !(hit.tagName === 'LABEL' && hit.control === el) && !(ignore && hit.closest(ignore) && !el.closest(ignore))) {
      occluded.push({ label: label(el), by: label(hit), y: Math.round(r.top), regions: regionOf(el) });
    }
  }

  // listed regions below the fold (their top edge is out of view)
  for (const r of regionEls) {
    for (const el of r.els) {
      if (hiddenEls.has(el)) continue; // already counted as a control
      const b = el.getBoundingClientRect();
      const { box, scroller } = clipOf(el);
      if (b.top >= box.bottom - 1 && (scroller || pageScrolls)) hidden.push({ label: label(el), where: scroller ? 'container' : 'page', y: Math.round(b.top), regions: [r.id], region: true, container: scroller ? label(scroller) : null });
    }
  }

  // (a) scroll regions
  const scrollers = [];
  for (const el of document.querySelectorAll('body *')) {
    if (ignored(el) || !visible(el) || !isScroller(el)) continue;
    const kids = interactive.filter((x) => el.contains(x));
    const regs = regionEls.filter((r) => r.els.some((x) => el.contains(x) || x === el)).map((r) => r.id);
    if (!kids.length && !regs.length) continue;
    const b = el.getBoundingClientRect();
    const top = b.top + el.clientTop;
    const bottom = top + el.clientHeight;
    const out = kids.filter((x) => {
      const r = x.getBoundingClientRect();
      const c = r.top + r.height / 2;
      return c > bottom || c < top;
    });
    scrollers.push({
      label: label(el),
      box: [b.left, b.top, b.width, b.height].map(Math.round),
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      hiddenPx: el.scrollHeight - el.clientHeight,
      interactive: kids.length,
      hiddenInteractive: out.length,
      regions: regs,
      exempt: !!exempt && !!el.closest(exempt),
    });
  }

  // (d) used width
  const intervals = [];
  for (const sel of cfg.content || []) {
    for (const el of document.querySelectorAll(sel)) {
      if (ignored(el) || !visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= vh) continue;
      const a = Math.max(0, r.left);
      const z = Math.min(vw, r.right);
      if (z - a >= 1) intervals.push([a, z]);
    }
  }
  intervals.sort((p, q) => p[0] - q[0]);
  const merged = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1] + 1) last[1] = Math.max(last[1], iv[1]);
    else merged.push([...iv]);
  }
  const covered = merged.reduce((s, [a, z]) => s + (z - a), 0);
  let gap = 0;
  for (let i = 1; i < merged.length; i++) gap = Math.max(gap, merged[i][0] - merged[i - 1][1]);
  const width = merged.length
    ? { ratio: covered / vw, span: (merged[merged.length - 1][1] - merged[0][0]) / vw, left: Math.round(merged[0][0]), right: Math.round(vw - merged[merged.length - 1][1]), largestGap: Math.round(gap), intervals: merged.map((iv) => iv.map(Math.round)) }
    : { ratio: 0, span: 0, left: vw, right: 0, largestGap: 0, intervals: [] };

  // region states: expanded on screen, collapsed into a visible counted summary, or missing
  const regions = regionEls.map((r) => {
    const onScreen = r.els.some((el) => {
      const b = el.getBoundingClientRect();
      const { box } = clipOf(el);
      const top = Math.max(b.top, box.top);
      const bottom = Math.min(b.bottom, box.bottom);
      // in view: its first 40 px (or the whole of a smaller element) are inside its window
      return bottom - top >= Math.min(40, b.height) - 1 && b.top < box.bottom && b.left < box.right && b.right > box.left;
    });
    let summary = null;
    if (r.summary) {
      for (const el of document.querySelectorAll(r.summary)) {
        if (ignored(el) || !visible(el)) continue;
        const b = el.getBoundingClientRect();
        const { box } = clipOf(el);
        const cy = b.top + b.height / 2;
        if (cy < box.top || cy > box.bottom) continue;
        // What the player reads (innerText) counts; the accessible name too, for icon-only summaries
        const text = `${el.innerText || ''} ${el.getAttribute('aria-label') || ''}`.replace(/\s+/g, ' ').trim();
        summary = { text: text.slice(0, 60), counted: /\d/.test(text) };
        if (summary.counted) break;
      }
    }
    const state = onScreen ? 'expanded' : summary?.counted ? 'collapsed' : r.els.length ? 'below' : 'missing';
    return { id: r.id, state, present: r.els.length > 0, summary };
  });

  return {
    viewport: { width: vw, height: vh },
    page: { scrolls: pageScrolls, scrollHeight: document.documentElement.scrollHeight, overflowPx: Math.max(0, document.documentElement.scrollHeight - vh) },
    interactive: { total: interactive.length, inView },
    scrollers,
    hidden,
    cutoff,
    occluded,
    width,
    regions,
  };
}

/** Does a rule's `when` match this viewport? */
export function applies(when, { width, height }) {
  if (!when) return true;
  if (when.widths && !when.widths.includes(width)) return false;
  if (when.minWidth != null && width < when.minWidth) return false;
  if (when.maxWidth != null && width > when.maxWidth) return false;
  if (when.minHeight != null && height < when.minHeight) return false;
  if (when.maxHeight != null && height > when.maxHeight) return false;
  return true;
}

const inRegions = (rule, item) => !rule.regions || (item.regions ?? []).some((r) => rule.regions.includes(r));

/** Turn a measurement into rule violations [{ rule, check, message, items }]. Pure. */
export function evaluateRules(m, rules = DEFAULT_RULES) {
  const out = [];
  const vp = m.viewport;
  for (const rule of rules) {
    if (!applies(rule.when, vp)) continue;
    const max = rule.max ?? 0;
    const add = (message, items = []) => out.push({ rule: rule.id, check: rule.check, message, items });
    if (rule.check === 'inner-scroll') {
      const bad = m.scrollers.filter((s) => !s.exempt && (!rule.regions || s.regions.some((r) => rule.regions.includes(r))));
      if (bad.length > max) add(`${bad.length} inner scroll region(s) hold controls or listed regions: ${bad.map((s) => `${s.label} (${s.hiddenPx}px hidden, ${s.hiddenInteractive} control(s) out of view)`).join('; ')}`, bad);
    } else if (rule.check === 'page-scroll') {
      if (m.page.scrolls && m.page.overflowPx > (rule.maxPx ?? 0)) add(`the page scrolls ${m.page.overflowPx}px`);
    } else if (rule.check === 'below-fold') {
      const bad = m.hidden.filter((h) => inRegions(rule, h) && !(rule.regionsOnly && !h.region));
      if (bad.length > max) add(`${bad.length} control(s) or region(s) below the fold: ${bad.slice(0, 6).map((h) => `${h.label} (${h.where})`).join('; ')}${bad.length > 6 ? ' ...' : ''}`, bad);
    } else if (rule.check === 'used-width') {
      const min = rule.min ?? 0.85;
      if (m.width.ratio < min) add(`used width ${m.width.ratio.toFixed(2)} < ${min} (empty left ${m.width.left}px, right ${m.width.right}px, largest gap ${m.width.largestGap}px)`);
    } else if (rule.check === 'collapsed-not-hidden') {
      const bad = m.regions.filter((r) => (!rule.regions || rule.regions.includes(r.id)) && r.state !== 'expanded' && r.state !== 'collapsed');
      if (bad.length > max) add(`region(s) neither on screen nor collapsed into a visible counted summary: ${bad.map((r) => `${r.id} (${r.state})`).join(', ')}`, bad);
    } else if (rule.check === 'occluded') {
      const bad = m.occluded.filter((o) => inRegions(rule, o));
      if (bad.length > max) add(`${bad.length} control(s) covered at their centre: ${bad.slice(0, 4).map((o) => `${o.label} under ${o.by}`).join('; ')}`, bad);
    } else if (rule.check === 'cutoff') {
      const bad = m.cutoff.filter((c) => inRegions(rule, c));
      if (bad.length > max) add(`${bad.length} control(s) cut off: ${bad.slice(0, 4).map((c) => `${c.label} by ${c.by}`).join('; ')}`, bad);
    } else throw new Error(`unknown layout check "${rule.check}" in rule ${rule.id}`);
  }
  return out;
}

/** One summary row per measurement, for tables and baselines. */
export function summarize(m) {
  const inner = m.scrollers.filter((s) => !s.exempt);
  return {
    viewport: `${m.viewport.width}x${m.viewport.height}`,
    pageScrollPx: m.page.scrolls ? m.page.overflowPx : 0,
    innerScrollers: inner.length,
    innerHiddenPx: inner.reduce((s, x) => s + x.hiddenPx, 0),
    belowFold: m.hidden.length,
    usedWidth: Number(m.width.ratio.toFixed(2)),
    emptyLeft: m.width.left,
    emptyRight: m.width.right,
    cutoff: m.cutoff.length,
    occluded: m.occluded.length,
    regions: m.regions.map((r) => `${r.id}:${r.state[0]}`).join(' '),
  };
}

/**
 * Measure the current page at each viewport (resizing it), screenshot each, evaluate the rules.
 * `before(page, viewport)` runs after each resize (e.g. scroll to top, close a toast).
 */
export async function auditViewports(page, { config, viewports, out = null, name = 'page', settleMs = 600, before = null } = {}) {
  const rows = [];
  if (out) fs.mkdirSync(out, { recursive: true });
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(settleMs);
    if (before) await before(page, vp);
    // Measure what a player sees first: the page and every scroller at their top
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      for (const el of document.querySelectorAll('body *')) if (el.scrollTop > 0) el.scrollTop = 0;
    });
    const m = await page.evaluate(measureLayout, { regions: config.regions, content: config.content, interactive: config.interactive, ignore: config.ignore, exempt: config.exempt, root: config.root });
    const violations = evaluateRules(m, config.rules ?? DEFAULT_RULES);
    let screenshot = null;
    if (out) {
      screenshot = path.join(out, `${name}-${vp.width}x${vp.height}${vp.label ? `-${vp.label}` : ''}.png`);
      await page.screenshot({ path: screenshot, scale: 'css' });
    }
    rows.push({ name, ...summarize(m), ...(vp.label ? { label: vp.label } : {}), violations, screenshot, measurement: m });
  }
  return rows;
}

/** Readable table of audit rows; returns the number of violations. */
export function printAudit(rows, log = console.log) {
  const cols = [
    ['state', (r) => r.name, 14],
    ['viewport', (r) => `${r.viewport}${r.label ? ` ${r.label}` : ''}`, 14],
    ['pageScr', (r) => r.pageScrollPx, 7],
    ['inner', (r) => r.innerScrollers, 5],
    ['innerPx', (r) => r.innerHiddenPx, 7],
    ['below', (r) => r.belowFold, 5],
    ['width', (r) => r.usedWidth.toFixed(2), 5],
    ['L/R px', (r) => `${r.emptyLeft}/${r.emptyRight}`, 9],
    ['cut', (r) => r.cutoff, 3],
    ['cover', (r) => r.occluded, 5],
    ['fails', (r) => r.violations.length, 5],
    ['regions (e=expanded c=collapsed b=below m=missing)', (r) => r.regions, 0],
  ];
  const cell = (v, w) => (w ? String(v).padEnd(w) : String(v));
  log(cols.map(([h, , w]) => cell(h, w)).join('  '));
  log('-'.repeat(120));
  let n = 0;
  for (const r of rows) {
    log(cols.map(([, f, w]) => cell(f(r), w)).join('  '));
    for (const v of r.violations) log(`    ${v.rule}: ${v.message}`.slice(0, 400));
    n += r.violations.length;
  }
  log(`\n${rows.length} measurement(s), ${n} violation(s)`);
  return n;
}

/** Write the JSON report (measurements included) and the table. */
export function writeReport(rows, out) {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'layout-audit.json'), `${JSON.stringify({ at: new Date().toISOString(), rows }, null, 2)}\n`);
  const lines = [];
  printAudit(rows, (l) => lines.push(l));
  fs.writeFileSync(path.join(out, 'layout-audit.txt'), `${lines.join('\n')}\n`);
}

export async function loadConfig(file) {
  const abs = path.resolve(file);
  if (/\.m?js$/.test(abs)) return (await import(pathToFileURL(abs).href)).default;
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

// ---------------------------------------------------------------------------------------------
// CLI: audit one URL at several viewports (a fresh load per viewport)
// ---------------------------------------------------------------------------------------------

function opt(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const url = process.argv[2];
  if (!url || url.startsWith('--')) {
    console.error('usage: node devloop/kit/layout-audit.mjs <url> --config <file> [--viewports 1366x768,...] [--out dir] [--name label] [--wait ms]');
    process.exit(2);
  }
  const config = opt('config') ? await loadConfig(opt('config')) : { rules: DEFAULT_RULES };
  const viewports = parseViewports(opt('viewports') ?? config.viewports?.join?.(',') ?? '390x844,1024x768,1366x768,1440x900,1920x1080,2560x1440');
  const out = path.resolve(opt('out', '.verify/layout-audit'));
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const rows = [];
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: vp });
    const target = /^https?:|^file:/.test(url) ? url : pathToFileURL(path.resolve(url)).href;
    await page.goto(target);
    await page.waitForTimeout(Number(opt('wait', 800)));
    rows.push(...(await auditViewports(page, { config, viewports: [vp], out, name: opt('name', 'page') })));
    await page.close();
  }
  await browser.close();
  writeReport(rows, out);
  const n = printAudit(rows);
  console.log(`report: ${path.join(out, 'layout-audit.json')}`);
  process.exitCode = n ? 1 : 0;
}
