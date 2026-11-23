// Design RE-review D-81, build-order-cards at 3fa1fa5: drives CO-UKR-MAYA1 through the states the
// three required changes touch, at each size, with measurements.
//   node recapture.mjs <device: desktop|tablet|phone> <evidenceDir>
import fs from 'node:fs';
import path from 'node:path';
import { auditViewports, writeReport } from '../../../../../../kit/layout-audit.mjs';
import cfg from '../../../../layout-audit.config.mjs';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const device = process.argv[2];
const ev = path.resolve(process.argv[3]);
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const SIZES = {
  desktop: [
    { width: 3440, height: 1440, label: 'CEO' },
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
  ],
  tablet: [{ width: 1024, height: 768 }],
  phone: [{ width: 390, height: 844 }],
}[device];
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-rr-${device}`);
fs.mkdirSync(ev, { recursive: true });
const factsFile = path.join(ev, `facts-${device}.txt`);
fs.writeFileSync(factsFile, '');
const notes = [];
const note = (m) => {
  notes.push(m);
  console.log(m);
};
const fact = (m) => fs.appendFileSync(factsFile, `${m}\n`);
const rows = [];

const s = await startGame({ variant: `rr-${device}`, device: device === 'desktop' ? '3440x1440' : device, out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
const vpName = (v) => `${v.width}x${v.height}${v.label ? `-${v.label}` : ''}`;
const setVp = async (v, ms = 700) => {
  await p.setViewportSize({ width: v.width, height: v.height });
  await p.waitForTimeout(ms);
};
const shot = (name, full = false) => p.screenshot({ path: path.join(ev, `${name}.jpg`), type: 'jpeg', quality: 70, scale: 'css', fullPage: full });

/** Catalogue facts: groups in order with their order ids, tile/row sizes, small controls, rows per screen. */
async function catalogFacts(label) {
  const f = await p.evaluate(() => {
    const cat = document.querySelector('[data-order-catalog]');
    if (!cat) return null;
    const groups = [...cat.querySelectorAll('section.ord-cat')].map((sec) => {
      const head = sec.querySelector('.nav-head');
      const ids = [...sec.querySelectorAll('.ord-wrap')].map((w) => `${w.dataset.orderId}`);
      return `${head?.innerText.trim().replace(/\s+/g, ' ')} [${ids.join(', ')}]`;
    });
    const wraps = [...cat.querySelectorAll('.ord-wrap')];
    const hs = wraps.map((w) => w.getBoundingClientRect().height).filter((h) => h > 0).sort((a, b) => a - b);
    const spy = cat.querySelector('.ord-wrap[data-order-id="spy"]')?.getBoundingClientRect();
    const onScreen = wraps.filter((w) => {
      const r = w.getBoundingClientRect();
      return r.height > 0 && r.top >= 0 && r.bottom <= innerHeight;
    }).length;
    const small = [];
    for (const el of cat.querySelectorAll('.ord-wrap button, .ord-wrap a')) {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (!r.width || st.display === 'none' || st.visibility === 'hidden') continue;
      if (r.width < 44 || r.height < 44) small.push(`${(el.className || el.tagName).toString().split(' ')[0]} "${(el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const counts = {};
    for (const x of small) counts[x] = (counts[x] ?? 0) + 1;
    const per = wraps.map((w) => {
      const r = w.getBoundingClientRect();
      const why = w.querySelector('.ord-meta-why');
      const whyTxt = why && getComputedStyle(why).display !== 'none' ? why.innerText.trim().replace(/\s+/g, ' ').slice(0, 70) : '';
      const act = w.querySelector('.ord-act');
      const ar = act?.getBoundingClientRect();
      const title = w.querySelector('.wc-card-title');
      const tCut = title ? title.scrollWidth > title.clientWidth + 1 : false;
      return `${w.dataset.orderId}:${w.dataset.orderState}${w.dataset.orderCode ? `(${w.dataset.orderCode})` : ''} ${Math.round(r.width)}x${Math.round(r.height)}${act ? ` act "${act.innerText.trim()}" ${Math.round(ar.width)}x${Math.round(ar.height)}` : ''}${tCut ? ' TITLE-CUT' : ''}${whyTxt ? ` why "${whyTxt}"` : ''}`;
    });
    const hint = cat.querySelector('[data-cat-hint]')?.innerText.trim();
    return {
      groups,
      n: hs.length,
      min: Math.round(hs[0] ?? 0),
      med: Math.round(hs[Math.floor(hs.length / 2)] ?? 0),
      max: Math.round(hs.at(-1) ?? 0),
      spy: spy ? `${Math.round(spy.width)}x${Math.round(spy.height)}` : 'n/a',
      onScreen,
      hscroll: document.documentElement.scrollWidth > innerWidth,
      small: Object.entries(counts).map(([k, n]) => `${n}x ${k}`),
      per,
      hint,
    };
  });
  if (!f) return fact(`\n## ${label} ${p.viewportSize().width}x${p.viewportSize().height}: no catalogue`);
  fact(`\n## ${label} ${p.viewportSize().width}x${p.viewportSize().height}
groups (in order): \n  ${f.groups.join('\n  ')}
hint above groups: ${f.hint ?? 'none'}
cards ${f.n}; height min/median/max ${f.min}/${f.med}/${f.max}; Spy on tile ${f.spy}; cards wholly on screen ${f.onScreen}; page horizontal scroll ${f.hscroll}
controls under 44 px: ${f.small.length}\n  ${f.small.join('\n  ')}
per card:\n  ${f.per.join('\n  ')}`);
}

/** Map menu / face geometry. */
async function menuState(title = 'Strike military targets in Russia') {
  return p.evaluate((title) => {
    const menu = document.querySelector('.map-action-menu');
    if (!menu) return { menu: false };
    const mr = menu.getBoundingClientRect();
    const head = menu.querySelector('.mam-head')?.getBoundingClientRect();
    const box = { top: Math.max(mr.top + menu.clientTop, 0), bottom: Math.min(mr.top + menu.clientTop + menu.clientHeight, innerHeight) };
    const face = menu.querySelector('.ord-confirm');
    const r = (e) => (e ? `${Math.round(e.left)},${Math.round(e.top)} ${Math.round(e.width)}x${Math.round(e.height)}` : 'none');
    const btn = (sel) => {
      const b = face?.querySelector(sel);
      if (!b) return null;
      const br = b.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(b.querySelector('.ord-hold-text') ?? b);
      const tops = new Set([...range.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)));
      return { text: b.innerText.trim(), rect: r(br), inside: br.top >= box.top - 0.5 && br.bottom <= box.bottom + 0.5 && br.right <= mr.right + 0.5 && br.left >= mr.left - 0.5, lines: tops.size, clipped: b.scrollWidth > b.clientWidth + 1 };
    };
    const tiles = [...menu.querySelectorAll('.ord-wrap')].map((w) => `${w.dataset.orderId}${w.classList.contains('is-confirming') ? '*' : ''} ${r(w.getBoundingClientRect())}`);
    const text = face ? face.innerText.replace(/\s+/g, ' ') : '';
    return {
      menu: true,
      menuRect: r(mr),
      scrollTop: Math.round(menu.scrollTop),
      scrollMax: Math.round(menu.scrollHeight - menu.clientHeight),
      headRect: r(head),
      headVisible: head ? head.top >= Math.max(mr.top, 0) - 0.5 && head.top >= 0 : false,
      pageScroll: Math.round(document.scrollingElement.scrollTop),
      menuBottomInViewport: mr.bottom <= innerHeight + 0.5,
      face: !!face,
      faceRect: r(face?.getBoundingClientRect()),
      faceText: text,
      titles: face ? text.toLowerCase().split(title.toLowerCase()).length - 1 : 0,
      cancel: btn('[data-confirm-cancel]'),
      go: btn('[data-confirm-go]'),
      focus: document.activeElement?.innerText?.trim().slice(0, 30) ?? document.activeElement?.tagName,
      tiles,
    };
  }, title);
}
const fmtMenu = (m) =>
  !m.menu
    ? 'no menu'
    : `menu ${m.menuRect} scrollTop ${m.scrollTop}/${m.scrollMax} head ${m.headRect} headVisible ${m.headVisible} pageScroll ${m.pageScroll} menuBottomInViewport ${m.menuBottomInViewport}${
        m.face
          ? `\n  face ${m.faceRect} titles ${m.titles} focus "${m.focus}"\n  face text: ${m.faceText}\n  Cancel ${JSON.stringify(m.cancel)}\n  Give ${JSON.stringify(m.go)}`
          : ''
      }\n  tiles: ${m.tiles.join(' | ')}`;

/** Desk catalogue face geometry. */
async function deskFace() {
  return p.evaluate(() => {
    const face = document.querySelector('[data-order-catalog] .ord-confirm, .ord-confirm');
    if (!face) return null;
    const r = (e) => `${Math.round(e.left)},${Math.round(e.top)} ${Math.round(e.width)}x${Math.round(e.height)}`;
    const b = (sel) => {
      const el = face.querySelector(sel);
      if (!el) return 'none';
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = new Set([...range.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)));
      return `${r(el.getBoundingClientRect())} lines ${tops.size} clipped ${el.scrollWidth > el.clientWidth + 1}`;
    };
    const stage = document.querySelector('#desk-stage');
    return `face ${r(face.getBoundingClientRect())}; Cancel ${b('[data-confirm-cancel]')}; Give ${b('[data-confirm-go]')}; title line ${!!face.querySelector('[data-confirm-title]')}; text: ${face.innerText.replace(/\s+/g, ' ')}; stage scrollTop ${stage ? Math.round(stage.scrollTop) : 'n/a'}; page ${Math.round(document.scrollingElement.scrollTop)}`;
  });
}

try {
  // ---- 1. Open All orders (Full desk)
  let opened = false;
  if (await s.click(/^Full desk/i, { timeout: 2000 })) opened = await s.click(/^All orders/i, { timeout: 3000 });
  if (!opened && (await s.click(/Show budgets, orders and meetings|Show the whole desk/i, { timeout: 2000 }))) opened = await s.click(/^All orders/i, { timeout: 3000 });
  if (!opened) opened = await s.click(/All orders/i, { timeout: 3000 });
  await p.waitForTimeout(800);
  const catalog = p.locator('[data-order-catalog]').first();
  if (!(await catalog.isVisible().catch(() => false))) note(`${device}: catalogue did not open`);
  else {
    for (const v of SIZES) {
      rows.push(...(await auditViewports(p, { config: cfg.game, viewports: [v], name: 'm1-catalog-notarget' })));
      await shot(`catalog-notarget-${vpName(v)}`);
      await catalogFacts('catalog no target');
    }
    if (device === 'desktop') {
      await setVp(SIZES[0]);
      await shot(`catalog-notarget-fullpage-${vpName(SIZES[0])}`, true);
    }
    // Russia as target
    await p.getByRole('button', { name: /Target country/i }).first().click();
    await p.waitForTimeout(400);
    await p.keyboard.type('Russia');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1200);
    for (const v of SIZES) {
      rows.push(...(await auditViewports(p, { config: cfg.game, viewports: [v], name: 'm1-catalog-russia' })));
      await shot(`catalog-russia-${vpName(v)}`);
      await catalogFacts('catalog Russia');
    }
    // Scroll through the catalogue in screens (stage scroller) at 1440 / 1024 / 390 for the groups below
    const scrollSizes = device === 'desktop' ? [SIZES[0], SIZES[2]] : SIZES;
    for (const v of scrollSizes) {
      await setVp(v);
      for (const fam of ['mil', 'nuke', 'intel', 'econ', 'home']) {
        const sec = p.locator(`[data-order-catalog] section[data-order-family="${fam}"]`).first();
        if (!(await sec.count())) {
          note(`${device} ${vpName(v)}: no section ${fam}`);
          continue;
        }
        await sec.evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await p.waitForTimeout(300);
        await shot(`catalog-russia-at-${fam}-${vpName(v)}`);
      }
    }

    // ---- 2. Desk danger confirmation on a catalogue tile / row
    const faceSizes = device === 'desktop' ? [SIZES[0], SIZES[2]] : SIZES;
    for (const v of faceSizes) {
      await setVp(v);
      const strike = p.locator('[data-order-catalog] [data-order-id="airstrike-military"] .wc-card-hit').first();
      await strike.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(300);
      const before = await p.evaluate(() => `stage ${Math.round(document.querySelector('#desk-stage')?.scrollTop ?? -1)} page ${Math.round(document.scrollingElement.scrollTop)}`);
      await strike.click();
      await p.waitForTimeout(900);
      const face = p.locator('.ord-confirm').first();
      if (!(await face.isVisible().catch(() => false))) {
        note(`${device} ${vpName(v)}: no desk face`);
        continue;
      }
      fact(`\n## desk face ${vpName(v)}\nbefore open: ${before}\n${await deskFace()}`);
      await shot(`desk-confirm-${vpName(v)}`);
      await face.screenshot({ path: path.join(ev, `desk-confirm-face-${vpName(v)}.jpg`), type: 'jpeg', quality: 80 }).catch(() => {});
      // the neighbourhood of the face
      const wrap = p.locator('[data-order-catalog] [data-order-id="airstrike-military"]').first();
      const box = await wrap.boundingBox();
      if (box) {
        await p.screenshot({ path: path.join(ev, `desk-confirm-area-${vpName(v)}.jpg`), type: 'jpeg', quality: 75, clip: { x: Math.max(0, box.x - 260), y: Math.max(0, box.y - 60), width: Math.min(v.width - Math.max(0, box.x - 260), box.width + 520), height: Math.min(v.height - Math.max(0, box.y - 60), box.height + 120) } }).catch(() => {});
      }
      await s.click(/^Cancel$/i, { timeout: 1500 });
      await p.waitForTimeout(500);
      fact(`after Cancel: face open ${await p.locator('.ord-confirm').count()}, card ${await wrap.getAttribute('data-order-state')}`);
    }
    // Back to the top of the catalogue
    await p.evaluate(() => document.querySelector('[data-order-catalog]')?.scrollIntoView({ block: 'start' }));

    // ---- 3. Queued tile (ORDERED stamp) at the first size: queue Mobilize, look, remove
    await setVp(SIZES[0]);
    const mob = p.locator('[data-order-catalog] [data-order-id="mobilize"]').first();
    await mob.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await mob.locator('.wc-card-hit').first().click().catch(() => {});
    await p.waitForTimeout(1000);
    if (await p.locator('.ord-confirm').count()) await s.click(/^Give the order$/i, { timeout: 1500 });
    await mob.screenshot({ path: path.join(ev, `queued-mobilize-${vpName(SIZES[0])}.jpg`), type: 'jpeg', quality: 80 }).catch(() => {});
    fact(`\nqueued Mobilize state ${await mob.getAttribute('data-order-state')}: ${(await mob.innerText()).replace(/\s+/g, ' ')}`);
    await mob.getByRole('button', { name: /Remove/i }).first().click({ timeout: 1500 }).catch(() => note(`${device}: could not remove Mobilize`));
    await p.waitForTimeout(600);
  }
  await s.click(/^Focus$/i, { timeout: 1500 });
  await p.waitForTimeout(600);

  // ---- 4. Execute, month 2 desk
  await s.click(/^Accept all recommended/i, { timeout: 1500 });
  if (!(await s.click(/Execute month/i, { timeout: 12000 }))) throw new Error('Execute month not clickable');
  await p.locator('.result-card .rc-next').first().waitFor({ state: 'visible', timeout: 30000 });
  await p.waitForTimeout(1500);
  const exec = p.getByRole('button', { name: /Execute month/i }).first();
  for (let i = 0; i < 14; i++) {
    if (await exec.click({ trial: true, timeout: 800 }).then(() => true, () => false)) break;
    const moved = (await s.click(/To your desk|Next month|Continue|Done/i, { timeout: 800 })) || (await p.locator('button.primary, .wc-btn.primary').last().click({ timeout: 1200 }).then(() => true, () => false));
    if (!moved) await s.key('Escape');
  }
  await p.waitForTimeout(1200);
  for (const v of SIZES) {
    rows.push(...(await auditViewports(p, { config: cfg.game, viewports: [v], name: 'month-2-desk' })));
    await shot(`month-2-desk-${vpName(v)}`);
  }
  const prop = p.locator('.ord-wrap.is-proposal, .ord-wrap[data-order-state] .is-proposal').first();
  await setVp(device === 'desktop' ? SIZES[2] : SIZES[0]);
  if (await prop.count()) {
    await prop.scrollIntoViewIfNeeded().catch(() => {});
    await prop.screenshot({ path: path.join(ev, `month-2-proposed-row-${device === 'desktop' ? '1440x900' : vpName(SIZES[0])}.jpg`), type: 'jpeg', quality: 80 }).catch(() => {});
    const h = await prop.evaluate((e) => Math.round(e.getBoundingClientRect().height));
    fact(`\nmonth 2 proposed row height ${h}: ${(await prop.innerText()).replace(/\s+/g, ' ').slice(0, 200)}`);
  }

  // ---- 5. Map mode: Russia's order menu and the danger face
  await setVp(SIZES[0]);
  await p.keyboard.press('m');
  await p.waitForTimeout(900);
  if (!(await p.locator('.cmd-strip').isVisible().catch(() => false))) {
    await p.locator('.mode-seg').getByRole('tab', { name: /Map/ }).first().click().catch(() => {});
    await p.waitForTimeout(900);
  }
  await p.waitForFunction(() => !!window.__wcMap, null, { timeout: 15000 }).catch(() => note(`${device}: no __wcMap`));
  for (const v of SIZES) {
    await setVp(v, 1200);
    const pt = await p.evaluate(() => {
      const m = window.__wcMap;
      if (!m) return null;
      const c = m.project([40, 56]);
      const r = m.getContainer().getBoundingClientRect();
      return { x: r.left + c.x, y: r.top + c.y };
    });
    if (!pt || pt.x < 0 || pt.y < 0 || pt.x > v.width || pt.y > v.height) {
      note(`${device} ${vpName(v)}: Russia not on screen (${JSON.stringify(pt)})`);
      continue;
    }
    await p.mouse.click(pt.x, pt.y);
    await p.waitForTimeout(1200);
    const m0 = await menuState();
    await shot(`map-menu-${vpName(v)}`);
    rows.push(...(await auditViewports(p, { config: cfg.game, viewports: [v], name: 'month-2-map-menu' })));
    const d = p.locator('.map-action-menu .ord-wrap[data-order-id="airstrike-military"] .wc-card-hit').first();
    if (!(await d.count())) {
      fact(`\n## map ${vpName(v)}\nbefore: ${fmtMenu(m0)}\nno Strike military targets in the menu`);
      await p.keyboard.press('Escape');
      continue;
    }
    // Scroll the menu so the Strike tile is in view (as a player would) and record where it is
    await d.evaluate((e) => e.scrollIntoView({ block: 'nearest' }));
    await p.waitForTimeout(300);
    const m1 = await menuState();
    await d.click();
    await p.waitForTimeout(150);
    const mEarly = await menuState();
    await p.waitForTimeout(800);
    const m2 = await menuState();
    await shot(`map-confirm-${vpName(v)}`);
    rows.push(...(await auditViewports(p, { config: cfg.game, viewports: [v], name: 'month-2-map-confirm' })));
    // auditViewports resizes and settles; re-measure in case
    const menuEl = p.locator('.map-action-menu').first();
    await menuEl.screenshot({ path: path.join(ev, `map-confirm-menu-${vpName(v)}.jpg`), type: 'jpeg', quality: 80 }).catch(() => {});
    // Cancel
    const cancel = p.locator('.map-action-menu [data-confirm-cancel]').first();
    let m3 = null;
    let m4 = null;
    if (await cancel.count()) {
      await cancel.click();
      await p.waitForTimeout(500);
      m3 = await menuState();
      await shot(`map-after-cancel-${vpName(v)}`);
      // Esc path: reopen and press Escape
      await d.click().catch(() => {});
      await p.waitForTimeout(800);
      await p.keyboard.press('Escape');
      await p.waitForTimeout(500);
      m4 = await menuState();
    }
    fact(`\n## map ${vpName(v)}\nmenu opened: ${fmtMenu(m0)}\nStrike in view: ${fmtMenu(m1)}\n150 ms after press: ${fmtMenu(mEarly)}\nface open (950 ms): ${fmtMenu(m2)}\nafter Cancel: ${m3 ? fmtMenu(m3) : 'n/a'}\nafter reopen + Escape: ${m4 ? fmtMenu(m4) : 'n/a'}`);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
  }
  note(`${device}: page errors: ${s.errors.slice(0, 5).join(' | ') || 'none'}`);
} catch (e) {
  note(`${device}: THREW ${e.message.split('\n')[0]}`);
  await p.screenshot({ path: path.join(ev, `failure-${device}.jpg`), type: 'jpeg', quality: 70 }).catch(() => {});
} finally {
  if (rows.length) {
    const dir = path.join(tmp, 'audit');
    writeReport(rows, dir);
    fs.copyFileSync(path.join(dir, 'layout-audit.txt'), path.join(ev, `audit-${device}.txt`));
  }
  fs.writeFileSync(path.join(ev, `notes-${device}.txt`), `${notes.join('\n')}\n`);
  await s.close();
}
