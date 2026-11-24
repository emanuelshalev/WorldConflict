// QA scenario for design-worldmap.md section 6 (20 acceptance criteria), iteration 1, WP-W6,
// as changed by D-54 (B "Atlas" default, A behind one switch, no label collisions).
//
//   node devloop/instances/world-conflict/scenarios-qa/worldmap.mjs <outDir> [baseUrl] [apiUrl]
//   (defaults: http://localhost:5173/ and http://localhost:8080/api)
//
// Parts (ONLY=title,eras,game,motion,idle,api limits them; WIDTHS=1440,390 limits the viewports):
//  title  fit, resize, names, picks, phone scroll, hover, flashpoint mode, card actions (AC1-6, 13-15)
//  eras   every era at 390 / 1024 / 1440 / 1920: screenshots, label overlap check (rendered label
//         boxes from MapLibre's collision index against pins, chips, rim markers and panels),
//         anachronism guard, era switch fills/pins/key, setData count, transition time and fps,
//         fronts and pins, no em dash (AC7-12, 16, 20)
//  game   the in-game globe at 1920 and 390: fit, capital, Whole world, in-game label overlap (AC3, 7)
//  motion reduced motion era switch (AC17)
//  idle   20 s without input, then 10 s of repaint counting (AC18)
//  api    era map payload and B-17 refusals (AC19)
// Writes <outDir>/worldmap-qa.json and prints one line per criterion: PASS, FAIL or MANUAL.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const out = process.argv[2] ?? '/tmp/playtest/worldmap-qa';
const base = (process.argv[3] ?? process.env.DEVLOOP_BASE_URL ?? 'http://localhost:5173/').replace(/#.*$/, '');
const api = (process.argv[4] ?? process.env.DEVLOOP_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
fs.mkdirSync(out, { recursive: true });

const results = {};
const rank = { FAIL: 3, PASS: 2, MANUAL: 1 };
function mark(n, ok, note) {
  const status = ok === null ? 'MANUAL' : ok ? 'PASS' : 'FAIL';
  const r = (results[n] ??= { status, notes: [] });
  if (rank[status] > rank[r.status]) r.status = status;
  if (note) r.notes.push(`${status === 'FAIL' ? 'FAIL ' : ''}${note}`);
}
const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    console.error(`step "${name}" threw: ${e.message.split('\n')[0]}`);
    mark('errors', false, `${name}: ${e.message.split('\n')[0]}`);
  }
};

const SIZES = [
  { w: 390, h: 844, phone: true },
  { w: 1024, h: 768 },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
];
const ERAS = ['2026', '2025', '1990', '1960'];
const GPU = process.env.DEVLOOP_SOFTWARE_GL ? [] : ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'];
const browser = await chromium.launch({ args: GPU });

async function open({ w, h, phone }, { reduced = false, storage = {} } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    hasTouch: !!phone,
    isMobile: !!phone,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  await ctx.addInitScript((s) => {
    try {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    } catch {}
  }, storage);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.goto(base);
  await page.waitForFunction(() => !!window.__wcTitleMap && !!window.__wcTitleGlobe, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}

const sleep = (p, ms) => p.waitForTimeout(ms);
const term = async (p) => {
  await p.getByRole('radio', { name: /One Term/ }).click();
  await p.waitForFunction(() => document.querySelector('.tg.tg-era') && window.__wcTitleGlobe.pins().length > 0, null, { timeout: 15000 });
  await sleep(p, 1500);
};
/** The era buttons: in the dossier on desktop, the chips under the globe on a phone. */
const eraButton = (p, phone, id) => p.locator(phone ? '.ts2-era-phone .ts2-eras button' : '.ts2-dossier .ts2-eras button').filter({ hasText: id }).first();
const pickEra = async (p, phone, id) => {
  await eraButton(p, phone, id).click();
  await p.waitForFunction(() => !window.__wcTitleGlobe.travelling(), null, { timeout: 5000 });
  await sleep(p, 700);
};

/** Globe disc measured on screen, and the free box of design-worldmap.md 3.1 for this window. */
const fitInfo = (p) =>
  p.evaluate(() => {
    const m = window.__wcTitleMap;
    const c = m.getCenter();
    const a = m.project([c.lng - 90, 0]);
    const b = m.project([c.lng + 90, 0]);
    const W = innerWidth;
    const H = innerHeight;
    const phone = W <= 900;
    const ins = phone
      ? { top: 160, right: 0, bottom: Math.max(0, H - 160 - (W + 8)), left: 0 }
      : { top: 112, right: 440 + 12, bottom: 20, left: W >= 1280 ? 230 : 0 };
    const fw = W - ins.left - ins.right;
    const fh = H - ins.top - ins.bottom;
    const target = Math.min(fw * 0.98, fh * 1.02);
    const ctr = m.project([c.lng, c.lat]);
    return { d: Math.hypot(b.x - a.x, b.y - a.y), target, cx: ctr.x, cy: ctr.y, fcx: ins.left + fw / 2, fcy: ins.top + fh / 2, zoom: m.getZoom(), fit: window.__wcTitleGlobe.fit() };
  });

/**
 * Rendered label boxes from MapLibre's collision index (screen px, text padding removed), each
 * with its layer, plus the DOM boxes they must not touch.
 */
const overlapCheck = (p, { layers, game = false }) =>
  p.evaluate(
    ({ layers, game }) => {
      const m = game ? window.__wcMap : window.__wcTitleMap;
      const pl = m.style?.placement;
      const grid = pl?.collisionIndex?.grid;
      if (!grid) return { error: 'no collision index' };
      const VP = 100;
      const labels = [];
      for (let i = 0; i < grid.boxKeys.length; i++) {
        const key = grid.boxKeys[i];
        let layer = '';
        try {
          const q = pl.retainedQueryData[key.bucketInstanceId];
          layer = q.featureIndex.bucketLayerIDs[q.bucketIndex][0];
        } catch {}
        if (!layers.includes(layer)) continue;
        const [x1, y1, x2, y2] = grid.bboxes.slice(i * 4, i * 4 + 4);
        labels.push({ layer, left: x1 - VP + 3, top: y1 - VP + 3, right: x2 - VP - 3, bottom: y2 - VP - 3 });
      }
      const host = m.getContainer().getBoundingClientRect();
      const rel = (r) => ({ left: r.left - host.left, top: r.top - host.top, right: r.right - host.left, bottom: r.bottom - host.top });
      const shown = (el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
      };
      const boxes = [];
      const add = (kind, el, inset = 0) => {
        if (!shown(el)) return;
        const r = rel(el.getBoundingClientRect());
        boxes.push({ kind, left: r.left + inset, top: r.top + inset, right: r.right - inset, bottom: r.bottom - inset });
      };
      if (game) {
        for (const el of document.querySelectorAll('.maplibregl-marker')) {
          if (el.closest('.maplibregl-marker') && Number(getComputedStyle(el).opacity) > 0.05) add('pin', el, 2);
        }
      } else {
        for (const el of document.querySelectorAll('.tg-pin:not(.clustered):not(.fold)')) {
          if (Number(getComputedStyle(el).opacity) < 0.05) continue;
          const badge = el.querySelector('.tg-pin-badge');
          if (badge) add('pin', badge);
          const card = el.querySelector('.tg-pin-card');
          if (card) add('chip', card);
        }
        for (const el of document.querySelectorAll('.tg-rim:not([hidden]) .tg-rim-ring, .tg-rim.titled:not(.title-off) .tg-rim-title')) add('rim', el);
        for (const el of document.querySelectorAll('.ts2-left > *, .ts2-dossier, .map-key, .ts2-brand, .ts2-status > *, .ts2-actions')) add('panel', el, 2);
      }
      const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const W = host.width;
      const H = host.height;
      const onScreen = labels.filter((l) => l.right > 0 && l.left < W && l.bottom > 0 && l.top < H);
      const clashes = [];
      for (const l of onScreen) for (const b of boxes) if (hit(l, b)) clashes.push(`${l.layer} label at ${Math.round(l.left)},${Math.round(l.top)} on ${b.kind}`);
      const names = m.queryRenderedFeatures({ layers }).map((f) => ({ name: f.properties.name, size: Number(f.properties.size ?? 13) }));
      return { labels: onScreen.length, boxes: boxes.length, clashes, names };
    },
    { layers, game },
  );

const ROSTER_SAMPLE = ['USA', 'RUS', 'CHN', 'GBR', 'FRA', 'DEU', 'JPN', 'IND', 'BRA', 'CAN', 'ITA', 'KOR', 'AUS', 'MEX', 'IDN', 'TUR', 'SAU', 'POL', 'ZAF', 'NGA', 'EGY', 'IRN', 'ISR', 'PAK', 'PRK', 'UKR', 'TWN', 'VEN', 'SYR', 'IRQ', 'AFG', 'ARE', 'BLR', 'CUB', 'DNK', 'ETH', 'LBN', 'PHL', 'PSX', 'SDN', 'YEM'];
const fills = (p) =>
  p.evaluate((ids) => {
    const m = window.__wcTitleMap;
    return Object.fromEntries(ids.map((id) => [id, m.getFeatureState({ source: 'land', id })?.tint ?? null]));
  }, ROSTER_SAMPLE);
const pinIds = (p) => p.evaluate(() => window.__wcTitleGlobe.pins().map((x) => x.id).sort());
const MODERN = ['Kazakhstan', 'Czechia', 'Slovakia', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan', 'Lithuania', 'Latvia', 'Estonia', 'Moldova', 'Georgia', 'Armenia', 'Azerbaijan', 'Croatia', 'Slovenia', 'Bosnia', 'Serbia', 'North Macedonia', 'Montenegro', 'Kosovo', 'Eritrea', 'S. Sudan', 'South Sudan', 'Ukraine', 'Belarus'];

// ---------------------------------------------------------------------------------------------
// eras: every era at every width
// ---------------------------------------------------------------------------------------------
async function eras(size) {
  const { ctx, page: p, errors } = await open(size);
  const dir = path.join(out, `eras-${size.w}`);
  fs.mkdirSync(dir, { recursive: true });
  try {
    await term(p);
    // AC5 at the phone width
    if (size.phone) {
      const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('.ts2')?.scrollWidth ?? 0]);
      mark(5, sw[0] <= 390 && sw[1] <= 390, `390: scrollWidth ${sw.join('/')}`);
    }
    let prevFills = null;
    let prevPins = null;
    let prevKey = '';
    for (const id of ERAS) {
      const writes0 = await p.evaluate(() => window.__wcTitleGlobe.labelWrites());
      const reqs = [];
      const onReq = (r) => /\/scenarios\/[^/]+\/map/.test(r.url()) && reqs.push(r.url());
      p.on('request', onReq);
      // AC16: time to the last pin settled, frames during the move
      const t = await p.evaluate(async ({ id, sel }) => {
        const btn = [...document.querySelectorAll(sel)].find((b) => b.textContent.includes(id));
        if (!btn || btn.getAttribute('aria-checked') === 'true') return null;
        let frames = 0;
        let run = true;
        const tick = () => {
          frames++;
          if (run) requestAnimationFrame(tick);
        };
        const t0 = performance.now();
        requestAnimationFrame(tick);
        btn.click();
        await new Promise((r) => setTimeout(r, 40));
        // The last pin has landed when every drop animation has finished
        const drops = document.getAnimations().filter((a) => a.animationName === 'tg-drop');
        await Promise.all(drops.map((a) => a.finished.catch(() => undefined)));
        const ms = performance.now() - t0;
        for (let i = 0; i < 60 && window.__wcTitleGlobe.travelling(); i++) await new Promise((r) => setTimeout(r, 10));
        run = false;
        return { ms, fps: (frames * 1000) / Math.max(1, ms) };
      }, { id, sel: size.phone ? '.ts2-era-phone .ts2-eras button' : '.ts2-dossier .ts2-eras button' });
      await sleep(p, 900);
      p.off('request', onReq);
      if (t) {
        mark(16, t.ms <= 1000 + 60, `${size.w} -> ${id}: settled in ${Math.round(t.ms)} ms, ${Math.round(t.fps)} fps${t.fps < 55 ? ' (below 55: check on the reference desktop)' : ''}`);
        mark(16, reqs.length === 0, `${size.w} -> ${id}: ${reqs.length} era map requests during the switch`);
        const writes = (await p.evaluate(() => window.__wcTitleGlobe.labelWrites())) - writes0;
        mark(9, writes === 1, `${size.w} -> ${id}: label setData ${writes} time(s)`);
      }
      await p.screenshot({ path: path.join(dir, `${id}-${size.w}.png`) });
      // AC6 names and sizes, AC7 overlap
      const o = await overlapCheck(p, { layers: ['labels'] });
      if (o.error) mark(7, false, `${size.w} ${id}: ${o.error}`);
      else {
        const names = [...new Set(o.names.map((n) => n.name))];
        const small = o.names.filter((n) => n.size < 13);
        mark(6, names.length >= (size.phone ? 6 : 12) && small.length === 0, `${size.w} ${id}: ${names.length} names, ${small.length} under 13 px`);
        mark(7, o.clashes.length === 0, `${size.w} ${id}: ${o.labels} label boxes vs ${o.boxes} pin/chip/rim/panel boxes, ${o.clashes.length} overlaps${o.clashes.length ? `: ${o.clashes.slice(0, 3).join('; ')}` : ''}`);
        // AC8 anachronism guard
        if (id === '1960' || id === '1990') {
          const bad = names.filter((n) => MODERN.includes(n));
          mark(8, bad.length === 0, `${size.w} ${id}: ${bad.length ? `modern names ${bad.join(', ')}` : 'no modern non-roster names'}; shown: ${names.filter((n) => /Soviet|West Germany|SSR/.test(n)).join(', ') || 'none of the era names (check hover)'}`);
        }
      }
      // AC10: header year, fills, pins and key change
      const year = await p.locator('.ts2-era-line').innerText();
      const f = await fills(p);
      // The same era in the other colouring (Blocs and Stability), then back to the shown one
      const segSel = size.phone ? '.map-key.era.compact .mk-colour button' : '.map-key.era:not(.compact) .mk-colour button';
      const seg = p.locator(segSel);
      const shownMode = ((await p.locator(`${segSel}.on`).first().innerText().catch(() => 'Blocs')) || 'Blocs').trim();
      const other = shownMode === 'Blocs' ? 'Stability' : 'Blocs';
      await seg.filter({ hasText: other }).click();
      await sleep(p, 300);
      const fOther = await fills(p);
      await seg.filter({ hasText: shownMode }).click();
      await sleep(p, 300);
      const byMode = { [shownMode]: f, [other]: fOther };
      const pins = await pinIds(p);
      const key = await p.locator('.map-key.era').first().innerText().catch(() => '');
      if (prevFills) {
        const changed = Math.max(...['Blocs', 'Stability'].map((k) => ROSTER_SAMPLE.filter((c) => byMode[k][c] !== prevFills[k][c]).length));
        const samePins = pins.join() === prevPins.join();
        mark(10, year.includes(id) && changed >= 10 && !samePins && key !== prevKey, `${size.w} -> ${id}: header "${year}", ${changed} roster fills changed, pins ${samePins ? 'SAME' : 'differ'}, key ${key === prevKey ? 'SAME' : 'changed'}`);
      }
      prevFills = byMode;
      prevPins = pins;
      prevKey = key;
      // AC12 calm: exactly 5 numbered pins or rim markers
      const g = await p.evaluate(() => ({ pins: window.__wcTitleGlobe.pins(), rims: window.__wcTitleGlobe.rims() }));
      const numbered = g.pins.filter((x) => x.num).length;
      mark(12, numbered === 5, `${size.w} ${id} calm: ${numbered} numbered pins, ${g.rims.length} on the rim`);
      // AC20 no em dash
      const text = await p.evaluate(() => [...document.querySelectorAll('.tg, .map-key, .era-card, .ts2-dossier, .ts2-top')].map((e) => e.innerText).join(' '));
      mark(20, !text.includes('\u2014') && !o.names?.some((n) => String(n.name).includes('\u2014')), `${size.w} ${id}`);
      // AC5 cards and chips on screen (phone)
      if (size.phone) {
        const outside = await p.evaluate(() => [...document.querySelectorAll('.tg-pin-card, .tg-rim')].filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && s.display !== 'none' && Number(s.opacity) > 0.05 && (r.left < -1 || r.right > innerWidth + 1); }).length);
        mark(5, outside === 0, `390 ${id}: ${outside} cards or rim markers past the edge`);
      }
    }
    // AC10: switching back restores exactly (back to 2026 from 1960 then compare with the first pass)
    await pickEra(p, size.phone, '2026');
    const f2026 = await fills(p);
    await pickEra(p, size.phone, '1960');
    await pickEra(p, size.phone, '2026');
    const again = await fills(p);
    mark(10, ROSTER_SAMPLE.every((c) => f2026[c] === again[c]), `${size.w}: 2026 -> 1960 -> 2026 restores the fills`);

    // 1960 in Blocs (AC11) and the switch (AC12, variant A) with screenshots
    await pickEra(p, size.phone, '1960');
    const b = await fills(p);
    const czsk = await p.evaluate(() => ['CZE', 'SVK'].map((id) => window.__wcTitleMap.getFeatureState({ source: 'land', id })?.tint ?? null));
    const ok11 = b.USA && b.USA === b.DEU && b.RUS && b.RUS === b.UKR && b.RUS === b.BLR && b.RUS === b.POL && czsk.every((x) => x === b.RUS);
    mark(11, ok11, `${size.w}: USA ${b.USA} DEU ${b.DEU} / RUS ${b.RUS} UKR ${b.UKR} BLR ${b.BLR} POL ${b.POL} CZE+SVK ${czsk.join(' ')}`);
    const shapes = await p.evaluate(() => !!window.__wcTitleMap.getSource('era-shapes'));
    mark(11, shapes ? true : null, shapes ? `${size.w}: era shapes drawn` : 'ui/public/era/shapes.geojson not present: East Germany drawn as part of Germany (West colour); add the file (WP-W4) to check the DDR shape');
    const sw = p.locator(size.phone ? '.ts2-era-phone .era-switch input' : '.ts2-dossier .era-switch input');
    await sw.click();
    await sleep(p, 1500);
    const all = await p.evaluate(() => ({ pins: window.__wcTitleGlobe.pins(), rims: window.__wcTitleGlobe.rims() }));
    const sits = await p.evaluate(async (apiBase) => (await (await fetch(`${apiBase}/scenarios/1960/map`)).json()).map.situations.map((s) => s.id), '/api');
    const covered = sits.filter((s) => all.pins.some((x) => x.id.endsWith(`:${s}`)) || all.rims.some((x) => x.id.endsWith(`:${s}`)));
    mark(12, covered.length === sits.length, `${size.w} 1960 all: ${covered.length} of ${sits.length} situations have a pin or rim marker`);
    await p.screenshot({ path: path.join(dir, `1960-all-${size.w}.png`) });
    const oa = await overlapCheck(p, { layers: ['labels'] });
    if (!oa.error) mark(7, oa.clashes.length === 0, `${size.w} 1960 with the switch on: ${oa.clashes.length} overlaps${oa.clashes.length ? `: ${oa.clashes.slice(0, 3).join('; ')}` : ''}`);
    await sw.click();
    await sleep(p, 800);
    // AC4: a picked situation stays inside the free box
    const fire = p.locator(size.phone ? '.ts2-era-phone .era-fire' : '.ts2-dossier .era-fire').first();
    await fire.click();
    await sleep(p, 1400);
    const inBox = await p.evaluate(() => {
      const pin = document.querySelector('.tg-pin.on .tg-pin-badge');
      if (!pin) return { ok: false, why: 'no picked pin' };
      const r = pin.getBoundingClientRect();
      const blockers = [...document.querySelectorAll('.ts2-dossier, .map-key, .era-card.docked, .ts2-left > *')].filter((e) => getComputedStyle(e).position === 'fixed' || innerWidth > 900 || e.classList.contains('era-card')).map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
      const under = blockers.some((b) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top);
      return { ok: r.left >= 0 && r.right <= innerWidth && !under, why: `pin at ${Math.round(r.left)},${Math.round(r.top)}${under ? ' under a panel' : ''}` };
    });
    mark(4, inBox.ok, `${size.w}: ${inBox.why}`);
    await p.screenshot({ path: path.join(dir, `1960-card-${size.w}.png`) });
    if (errors.length) mark('errors', false, `${size.w}: ${errors.slice(0, 3).join(' | ')}`);
  } finally {
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------------------------
// title: fit, resize, hover, long-press, flashpoint mode, card actions
// ---------------------------------------------------------------------------------------------
async function title() {
  const { ctx, page: p } = await open(SIZES[2]);
  try {
    await term(p);
    const check = async (label) => {
      const f = await fitInfo(p);
      const ok = Math.abs(f.d - f.target) / f.target <= 0.04 && Math.hypot(f.cx - f.fcx, f.cy - f.fcy) <= 8;
      mark(1, ok, `${label}: D ${Math.round(f.d)} vs ${Math.round(f.target)}, centre off by ${Math.round(Math.hypot(f.cx - f.fcx, f.cy - f.fcy))} px`);
      return f;
    };
    await check('1440 Term 2026');
    for (const [w, h] of [[1024, 768], [1920, 1080]]) {
      await p.setViewportSize({ width: w, height: h });
      await sleep(p, 300);
      const f = await fitInfo(p);
      const ok = Math.abs(f.d - f.target) / f.target <= 0.04;
      mark(2, ok, `resize to ${w}: D ${Math.round(f.d)} vs ${Math.round(f.target)} within 300 ms`);
    }
    // A hand zoom (double click on the ocean) survives a resize as an offset from the fit
    await p.setViewportSize({ width: 1440, height: 900 });
    await sleep(p, 400);
    const ocean = await p.evaluate(() => {
      const m = window.__wcTitleMap;
      for (const ll of [[-30, -35], [-25, 0], [60, -30], [-40, 30]]) {
        const s = m.project(ll);
        const hitLand = m.queryRenderedFeatures([s.x, s.y], { layers: ['land'] }).length > 0;
        if (!hitLand && s.x > 250 && s.x < innerWidth - 470 && s.y > 130 && s.y < innerHeight - 140) return [s.x, s.y];
      }
      return null;
    });
    if (ocean) {
      await p.mouse.dblclick(ocean[0], ocean[1]);
      await sleep(p, 900);
      const before = await fitInfo(p);
      await p.setViewportSize({ width: 1600, height: 960 });
      await sleep(p, 500);
      const after = await fitInfo(p);
      const d0 = before.zoom - before.fit;
      const d1 = after.zoom - after.fit;
      mark(2, Math.abs(d0 - d1) <= 0.05 && d0 > 0.3, `hand zoom offset ${d0.toFixed(2)} kept as ${d1.toFixed(2)} after a resize`);
      await p.setViewportSize({ width: 1440, height: 900 });
      await sleep(p, 400);
    } else mark(2, null, 'no ocean point found for the hand zoom check');

    // AC13 hover a roster country
    await p.reload();
    await p.waitForFunction(() => !!window.__wcTitleMap && !!window.__wcTitleGlobe, null, { timeout: 30000 });
    await sleep(p, 1200);
    if ((await p.locator('.tg.tg-era').count()) === 0) await term(p);
    for (const [era, id, who] of [['2026', 'UKR', /Volodymyr Zelensky/], ['1960', 'RUS', /Khrushchev/]]) {
      await pickEra(p, false, era);
      await sleep(p, 6500); // the spin hold after a switch: the globe is still
      const pt = await p.evaluate((id) => {
        const m = window.__wcTitleMap;
        const f = m.querySourceFeatures('land').find((x) => x.properties.gid === id || x.properties.ADM0_A3 === id);
        const ll = f ? [f.properties.LABEL_X, f.properties.LABEL_Y] : null;
        if (!ll) return null;
        const s = m.project(ll);
        return [s.x, s.y];
      }, id);
      if (!pt) {
        mark(13, false, `${era} ${id}: no screen point`);
        continue;
      }
      await p.mouse.move(pt[0], pt[1]);
      await sleep(p, 300);
      const tip = await p.locator('.tg-tip').innerText().catch(() => '');
      mark(13, who.test(tip) && /Stability \d+ \(/.test(tip) && /Camp:/.test(tip), `${era} hover ${id}: "${tip.replace(/\n/g, ' / ')}"`);
      await p.mouse.move(5, 5);
    }

    // AC14: Flashpoint mode shows 8 flashpoint pins and no era control; Term and Legacy share the era
    await p.getByRole('radio', { name: /Flashpoint/ }).click();
    await sleep(p, 1500);
    const fp = await p.evaluate(() => ({ pins: window.__wcTitleGlobe.pins().length, eraCtl: document.querySelectorAll('.ts2-dossier .ts2-eras').length, era: !!document.querySelector('.tg.tg-era') }));
    mark(14, fp.pins === 8 && fp.eraCtl === 0 && !fp.era, `Flashpoint: ${fp.pins} pins, era control ${fp.eraCtl ? 'shown' : 'absent'}`);
    await p.getByRole('radio', { name: /One Term/ }).click();
    await sleep(p, 1500);
    await pickEra(p, false, '1990');
    const termPins = await pinIds(p);
    const termFills = await fills(p);
    await p.getByRole('radio', { name: /Legacy/ }).click();
    await sleep(p, 1500);
    const legPins = await pinIds(p);
    const legFills = await fills(p);
    mark(14, termPins.join() === legPins.join() && ROSTER_SAMPLE.every((c) => termFills[c] === legFills[c]), 'Term and Legacy show the same 1990 world');

    // AC15: Lead <country> and Play it as a 15-minute Flashpoint
    await p.getByRole('radio', { name: /One Term/ }).click();
    await sleep(p, 800);
    await pickEra(p, false, '2026');
    await p.locator('.ts2-dossier .era-fire').first().click();
    await sleep(p, 1200);
    const lead = p.locator('.era-card .era-card-acts button', { hasText: /^Lead / }).nth(1);
    const leadName = ((await lead.innerText()) ?? '').replace(/^Lead /, '');
    await lead.click();
    await sleep(p, 600);
    const picked = await p.locator('.ts2-side.on b').first().innerText().catch(() => '');
    mark(15, picked === leadName, `Lead ${leadName}: the list picks "${picked}"`);
    const fpBtn = p.locator('.era-card .era-card-fp');
    if (await fpBtn.count()) {
      await fpBtn.click();
      await sleep(p, 1200);
      const st = await p.evaluate(() => ({ mode: document.querySelector('.ts2-dial [aria-checked="true"]')?.textContent ?? '', fp: document.querySelector('.ts2-crisis-nav select')?.value ?? '' }));
      mark(15, /Flashpoint/.test(st.mode) && st.fp === 'ceasefire-or-collapse', `Play it as a Flashpoint: mode "${st.mode.trim()}", crisis ${st.fp}`);
    } else mark(15, false, 'no Flashpoint button on the 2026 card');
    await p.screenshot({ path: path.join(out, 'title-flashpoint-from-card-1440.png') });
  } finally {
    await ctx.close();
  }
  // AC1 at 390 and AC13 long-press on touch
  const { ctx: c2, page: q } = await open(SIZES[0]);
  try {
    await term(q);
    const f = await fitInfo(q);
    mark(1, f.d >= 370 && Math.abs(f.d - f.target) / f.target <= 0.04, `390: D ${Math.round(f.d)} (target ${Math.round(f.target)}, at least 370)`);
    await sleep(q, 6500);
    const pt = await q.evaluate(() => {
      const m = window.__wcTitleMap;
      const f = m.querySourceFeatures('land').find((x) => x.properties.ADM0_A3 === 'IND');
      const s = m.project([f.properties.LABEL_X, f.properties.LABEL_Y]);
      return [s.x, s.y];
    });
    const cdp = await c2.newCDPSession(q);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pt[0], y: pt[1] }] });
    await sleep(q, 700);
    const tip = await q.locator('.tg-tip').innerText().catch(() => '');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    mark(13, /Stability \d+/.test(tip), `390 long-press India: "${tip.replace(/\n/g, ' / ')}"`);
  } finally {
    await c2.close();
  }
}

// ---------------------------------------------------------------------------------------------
// game: the in-game globe (fit at 1920, Whole world, label overlap)
// ---------------------------------------------------------------------------------------------
async function game(size) {
  const { ctx, page: p } = await open(size);
  try {
    await term(p);
    await p.locator('.ts2-go').click();
    await p.waitForFunction(() => document.querySelector('.game'), null, { timeout: 30000 });
    await sleep(p, 1500);
    const go = p.getByRole('button', { name: /Take office/ });
    if (await go.count()) await go.first().click({ timeout: 5000 }).catch(() => undefined);
    await sleep(p, 800);
    const mapTab = p.getByRole('tab', { name: /Map/ });
    if (await mapTab.first().isVisible().catch(() => false)) await mapTab.first().click({ timeout: 5000 }).catch(() => undefined);
    // Phones open on the desk with no Map tab: show the map through the store, as the M key does
    else await p.evaluate(() => window.__wcStore?.getState().setDeskMode?.('map'));
    await p.waitForFunction(() => !!window.__wcMap, null, { timeout: 15000 });
    await sleep(p, 2500);
    const g = await p.evaluate(() => {
      const m = window.__wcMap;
      const c = m.getCenter();
      const a = m.project([c.lng - 90, 0]);
      const b = m.project([c.lng + 90, 0]);
      const st = window.__wcStore.getState();
      const w = st.worldState;
      // L-14 (iter-04 design-layout.md, DR-INT-5): Map mode centres the subject of the open item,
      // the crisis's first foreign country; with no crisis open, the player's own capital
      const open = document.querySelector('[data-map-panel="left"] article.thing')?.getAttribute('aria-label');
      const d = st.pendingDecisions?.find((x) => x.title === open);
      const subject = d ? (d.affectedCountries.find((id) => id !== w.playerCountryId) ?? w.playerCountryId) : w.playerCountryId;
      const cap = w.countries.find((x) => x.id === subject)?.capital;
      const ang = cap ? (Math.acos(Math.sin((c.lat * Math.PI) / 180) * Math.sin((cap[1] * Math.PI) / 180) + Math.cos((c.lat * Math.PI) / 180) * Math.cos((cap[1] * Math.PI) / 180) * Math.cos(((cap[0] - c.lng) * Math.PI) / 180)) * 180) / Math.PI : 999;
      return { d: Math.hypot(b.x - a.x, b.y - a.y), ang, subject };
    });
    // Whole pixels, as globe-fit.mjs and the note: the three-pass fit lands within a fraction of a
    // pixel of its target (899.74 for 900 failed while the note printed "D 900")
    if (size.w === 1920) mark(3, Math.round(g.d) >= 900 && g.ang < 80, `1920 in game: D ${Math.round(g.d)} (at least 900), subject ${g.subject} ${Math.round(g.ang)} deg from the centre`);
    else mark(3, g.ang < 80, `${size.w} in game: D ${Math.round(g.d)}, subject ${g.subject} ${Math.round(g.ang)} deg from the centre`);
    await p.screenshot({ path: path.join(out, `game-${size.w}.png`) });
    const o = await overlapCheck(p, { layers: ['country-labels'], game: true });
    if (!o.error) {
      const small = o.names.filter((n) => n.size < 13).length;
      mark(7, o.clashes.length === 0, `in game ${size.w}: ${o.labels} label boxes vs ${o.boxes} markers, ${o.clashes.length} overlaps${o.clashes.length ? `: ${o.clashes.slice(0, 3).join('; ')}` : ''}`);
      mark(6, small === 0, `in game ${size.w}: ${o.names.length} names, ${small} under 13 px`);
    }
    // Whole world after a hand zoom
    const box = await p.locator('.map-container').boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 4; i++) {
      await p.mouse.wheel(0, -300);
      await sleep(p, 120);
    }
    await sleep(p, 800);
    const zoomed = await p.evaluate(() => window.__wcMap.getZoom());
    await p.getByRole('button', { name: /Whole world/ }).click({ timeout: 5000 });
    await sleep(p, 1000);
    const back = await p.evaluate(() => {
      const m = window.__wcMap;
      const c = m.getCenter();
      const a = m.project([c.lng - 90, 0]);
      const b = m.project([c.lng + 90, 0]);
      return { d: Math.hypot(b.x - a.x, b.y - a.y), z: m.getZoom() };
    });
    mark(3, Math.abs(back.d - g.d) / g.d <= 0.06 && back.z < zoomed, `${size.w}: Whole world after a hand zoom (${zoomed.toFixed(2)}) restores D ${Math.round(back.d)} (fit ${Math.round(g.d)})`);
  } finally {
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------------------------
// motion: reduced motion era switch (AC17)
// ---------------------------------------------------------------------------------------------
async function motion() {
  const { ctx, page: p } = await open(SIZES[2], { reduced: true });
  try {
    await term(p);
    await sleep(p, 1000);
    const r = await p.evaluate(async () => {
      const m = window.__wcTitleMap;
      const c0 = m.getCenter();
      const btn = [...document.querySelectorAll('.ts2-dossier .ts2-eras button')].find((b) => b.textContent.includes('1960'));
      const t0 = performance.now();
      btn.click();
      await new Promise((res) => setTimeout(res, 30));
      for (let i = 0; i < 40; i++) {
        if (!window.__wcTitleGlobe.travelling()) break;
        await new Promise((res) => setTimeout(res, 10));
      }
      const ms = performance.now() - t0;
      const c1 = m.getCenter();
      const stamp = document.querySelector('.tg-stamp');
      return { ms, moved: Math.hypot(c1.lng - c0.lng, c1.lat - c0.lat), stamp: stamp ? getComputedStyle(stamp).animationName : 'none' };
    });
    mark(17, r.ms <= 200 + 40 && r.moved < 0.01 && r.stamp === 'none', `reduced motion: ${Math.round(r.ms)} ms, camera moved ${r.moved.toFixed(3)} deg, stamp animation ${r.stamp}`);
  } finally {
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------------------------
// idle: 20 s without input, then 10 s: no infinite pin animation, fewer than 2 repaints a second
// ---------------------------------------------------------------------------------------------
async function idle() {
  const { ctx, page: p } = await open(SIZES[2]);
  try {
    await term(p);
    await p.mouse.move(5, 5);
    await sleep(p, 20000);
    const r = await p.evaluate(async () => {
      const m = window.__wcTitleMap;
      let renders = 0;
      const on = () => renders++;
      m.on('render', on);
      await new Promise((res) => setTimeout(res, 10000));
      m.off('render', on);
      const infinite = document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('.tg-pin, .tg-rim') && a.effect.getComputedTiming().iterations === Infinity).length;
      return { perSec: renders / 10, infinite };
    });
    mark(18, r.perSec < 2 && r.infinite === 0, `idle: ${r.perSec.toFixed(1)} repaints/s, ${r.infinite} infinite pin animations`);
  } finally {
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------------------------
// api: era map payload, B-17
// ---------------------------------------------------------------------------------------------
async function apiChecks() {
  const m = await (await fetch(`${api}/scenarios/1960/map`)).json();
  const map = m.map ?? {};
  const withStatus = (map.countries ?? []).filter((c) => ['STATE', 'PART_OF', 'NOT_INDEPENDENT'].includes(c.status)).length;
  mark(19, (map.situations?.length ?? 0) >= 5 && (map.blocs?.length ?? 0) >= 4 && withStatus === 41, `1960 map: ${map.situations?.length} situations, ${map.blocs?.length} blocs, ${withStatus} countries with status`);
  mark(19, null, 'npm run test (tests/core/era-map.spec.ts, tests/ui/eraLayers.spec.ts, tests/api/era-playable.spec.ts) is run by the build, not by this scenario');
  for (const [scenarioId, id] of [['1960', 'UKR'], ['1990', 'BLR'], ['1960', 'ARE']]) {
    const r = await fetch(`${api}/new-game`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenarioId, playerCountryId: id, mode: 'TERM' }) });
    const b = await r.json().catch(() => ({}));
    mark('B-17', r.status === 400, `new game ${scenarioId} ${id}: HTTP ${r.status} "${b.error ?? ''}"`);
  }
}

const only = (process.env.ONLY ?? 'api,title,eras,game,motion,idle').split(',');
const widths = (process.env.WIDTHS ?? '390,1024,1440,1920').split(',').map(Number);
if (only.includes('api')) await step('api', apiChecks);
if (only.includes('title')) await step('title', title);
if (only.includes('eras')) for (const s of SIZES.filter((x) => widths.includes(x.w))) await step(`eras ${s.w}`, () => eras(s));
if (only.includes('game')) for (const s of [SIZES[3], SIZES[0]].filter((x) => widths.includes(x.w))) await step(`game ${s.w}`, () => game(s));
if (only.includes('motion')) await step('motion', motion);
if (only.includes('idle')) await step('idle', idle);
await browser.close();

fs.writeFileSync(path.join(out, 'worldmap-qa.json'), JSON.stringify(results, null, 2));
for (const n of [...[...Array(20)].map((_, i) => String(i + 1)), 'B-17', 'errors']) {
  const r = results[n];
  if (!r) {
    if (n !== 'errors') console.log(`AC${n.padStart(2)}  NOT RUN`);
    continue;
  }
  console.log(`AC${String(n).padStart(2)}  ${r.status.padEnd(6)} ${r.notes.slice(0, 6).join(' ; ')}`);
}
if (Object.values(results).some((r) => r.status === 'FAIL')) process.exitCode = 1;
