// Design review D-81, build-order-cards: drives CO-UKR-MAYA1 through the order states at each size.
//   node capture.mjs <device: desktop|tablet|phone> <evidenceDir>
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
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
  ],
  tablet: [{ width: 1024, height: 768 }],
  phone: [{ width: 390, height: 844 }],
}[device];
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-dr-${device}`);
fs.mkdirSync(ev, { recursive: true });
const notes = [];
const note = (m) => {
  notes.push(m);
  console.log(m);
};
const rows = [];

const s = await startGame({ variant: `dr-${device}`, device: device === 'desktop' ? '3440x1440' : device, out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;

const vpName = (v) => `${v.width}x${v.height}${v.label ? `-${v.label}` : ''}`;
async function shoot(name, { audit = null, sizes = SIZES, full = false } = {}) {
  for (const v of sizes) {
    if (audit) rows.push(...(await auditViewports(p, { config: audit, viewports: [v], name })));
    else {
      await p.setViewportSize({ width: v.width, height: v.height });
      await p.waitForTimeout(600);
    }
    await p.screenshot({ path: path.join(ev, `${name}-${vpName(v)}.jpg`), type: 'jpeg', quality: 70, scale: 'css', fullPage: full });
  }
}
/** Small controls inside order cards (touch targets) and contrast-free facts about the cards. */
async function cardFacts(label) {
  const f = await p.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && r.bottom > 0 && r.top < innerHeight;
    };
    const small = [];
    for (const el of document.querySelectorAll('.ord-wrap button, .ord-wrap a, .ord-confirm button')) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) small.push(`${el.className.split(' ')[0] || el.tagName} "${(el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const ell = [];
    for (const el of document.querySelectorAll('.ord-wrap .wc-card-title, .ord-wrap .ord-chip, .ord-wrap .fam-chip, .ord-wrap [class*=chip]')) {
      if (!vis(el)) continue;
      if (el.scrollWidth > el.clientWidth + 1) ell.push(`${el.className} "${el.innerText.trim().slice(0, 40)}" ${el.scrollWidth}>${el.clientWidth}`);
    }
    const cards = [...document.querySelectorAll('.ord-wrap')].filter(vis);
    const sizes = cards.slice(0, 40).map((c) => {
      const r = c.getBoundingClientRect();
      return `${c.dataset.orderId}:${c.dataset.orderState}:${Math.round(r.width)}x${Math.round(r.height)}`;
    });
    return { visibleCards: cards.length, small: [...new Set(small)], ellipsized: ell, sizes, hscroll: document.documentElement.scrollWidth > innerWidth };
  });
  fs.appendFileSync(path.join(ev, `facts-${device}.txt`), `\n## ${label} ${p.viewportSize().width}x${p.viewportSize().height}\nvisible cards ${f.visibleCards}; page horizontal scroll ${f.hscroll}\ncard sizes: ${f.sizes.join(' ')}\ncontrols under 44px: ${f.small.length}\n  ${f.small.join('\n  ')}\ntext overflowing its box: ${f.ellipsized.length}\n  ${f.ellipsized.join('\n  ')}\n`);
}
async function factsAll(label, sizes = SIZES) {
  for (const v of sizes) {
    await p.setViewportSize({ width: v.width, height: v.height });
    await p.waitForTimeout(500);
    await cardFacts(label);
  }
}
const first = SIZES[0];
const setFirst = () => p.setViewportSize({ width: first.width, height: first.height }).then(() => p.waitForTimeout(500));

try {
  // ---- 1. Month 1 as it opens (same state as the stability review's month-1 row)
  await shoot('month-1', { audit: cfg.game });
  await setFirst();

  // ---- 2. The order catalogue
  let opened = false;
  if (await s.click(/^Full desk/i, { timeout: 2000 })) opened = await s.click(/^All orders/i, { timeout: 3000 });
  if (!opened && (await s.click(/Show budgets, orders and meetings|Show the whole desk/i, { timeout: 2000 }))) opened = await s.click(/^All orders/i, { timeout: 3000 });
  if (!opened) opened = await s.click(/All orders/i, { timeout: 3000 });
  await p.waitForTimeout(800);
  const catalog = p.locator('[data-order-catalog]').first();
  if (!(await catalog.isVisible().catch(() => false))) note(`${device}: catalogue did not open`);
  else {
    await shoot('m1-catalog-notarget', { audit: cfg.game });
    await factsAll('catalog no target');
    await setFirst();
    // Pick Russia as the target
    await p.getByRole('button', { name: /Target country/i }).first().click();
    await p.waitForTimeout(400);
    await p.keyboard.type('Russia');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1200);
    const states = await p.evaluate(() => [...document.querySelectorAll('[data-order-catalog] [data-order-id]')].map((e) => `${e.dataset.orderId}:${e.dataset.orderState}${e.dataset.orderCode ? `(${e.dataset.orderCode})` : ''}`).join(' '));
    note(`${device}: catalogue states, target Russia: ${states}`);
    await shoot('m1-catalog-russia', { audit: cfg.game });
    await factsAll('catalog Russia');
    await setFirst();
    // Scroll the catalogue to the Military / Covert groups for a full-page look at all cards
    await shoot('m1-catalog-russia-fullpage', { sizes: [first], full: true });

    // ---- 3. Danger confirmation (Strike military targets in Russia)
    const strike = p.locator('[data-order-catalog] [data-order-id="airstrike-military"] .wc-card-hit').first();
    await strike.scrollIntoViewIfNeeded();
    if (await strike.click({ timeout: 3000 }).then(() => true, () => false)) {
      await p.waitForTimeout(900);
      const face = p.locator('.ord-confirm').first();
      if (await face.isVisible().catch(() => false)) {
        const focused = await p.evaluate(() => document.activeElement?.innerText?.trim() ?? document.activeElement?.tagName);
        const txt = (await face.innerText()).replace(/\s+/g, ' ');
        note(`${device}: confirm face "${txt}", focus on "${focused}"`);
        for (const v of SIZES) {
          await p.setViewportSize({ width: v.width, height: v.height });
          await p.waitForTimeout(500);
          await face.scrollIntoViewIfNeeded().catch(() => {});
          await p.screenshot({ path: path.join(ev, `m1-confirm-danger-${vpName(v)}.jpg`), type: 'jpeg', quality: 70, scale: 'css' });
          await face.screenshot({ path: path.join(ev, `m1-confirm-danger-face-${vpName(v)}.jpg`), type: 'jpeg', quality: 80 }).catch(() => {});
          await cardFacts('confirm face');
        }
        await setFirst();
        // Enter on the focused element must not give the order
        await p.keyboard.press('Enter');
        await p.waitForTimeout(800);
        const after = await p.evaluate(() => ({ face: !!document.querySelector('.ord-confirm'), state: document.querySelector('[data-order-catalog] [data-order-id="airstrike-military"]')?.dataset.orderState }));
        note(`${device}: after Enter on the default focus: confirm open ${after.face}, card state ${after.state}`);
        if (after.face) {
          // Click outside cancels
          await p.mouse.click(5, Math.round(p.viewportSize().height / 2));
          await p.waitForTimeout(600);
          note(`${device}: after a click outside: confirm open ${await p.locator('.ord-confirm').count()}`);
        }
        if (await p.locator('.ord-confirm').count()) await s.click(/^Cancel$/i, { timeout: 1500 });
      } else note(`${device}: no confirm face after pressing Strike military targets`);
    } else note(`${device}: could not press Strike military targets`);

    // Declare war face (irreversible) for comparison, at the first size only
    const war = p.locator('[data-order-catalog] [data-order-id="declare-war"] .wc-card-hit').first();
    if (await war.click({ timeout: 2000 }).then(() => true, () => false)) {
      await p.waitForTimeout(800);
      const face = p.locator('.ord-confirm').first();
      if (await face.isVisible().catch(() => false)) {
        await face.screenshot({ path: path.join(ev, `m1-confirm-war-face-${vpName(first)}.jpg`), type: 'jpeg', quality: 80 });
        note(`${device}: war face "${(await face.innerText()).replace(/\s+/g, ' ')}"`);
        await p.keyboard.press('Escape');
        await p.waitForTimeout(500);
      } else note(`${device}: declare war gave no face (state ${await p.locator('[data-order-catalog] [data-order-id="declare-war"]').first().getAttribute('data-order-state')})`);
    }

    // ---- 4. Add orders: Mobilize forces, then enough to make the 2-seal cards unaffordable
    for (const id of ['mobilize', 'reform']) {
      const hit = p.locator(`[data-order-catalog] [data-order-id="${id}"] .wc-card-hit`).first();
      await hit.scrollIntoViewIfNeeded().catch(() => {});
      const ok = await hit.click({ timeout: 2000 }).then(() => true, () => false);
      await p.waitForTimeout(1200);
      if (await p.locator('.ord-confirm').count()) await s.click(/^Give the order$/i, { timeout: 1500 });
      note(`${device}: added ${id}: ${ok}, state now ${await p.locator(`[data-order-catalog] [data-order-id="${id}"]`).first().getAttribute('data-order-state')}`);
    }
    const states2 = await p.evaluate(() => [...document.querySelectorAll('[data-order-catalog] [data-order-id]')].map((e) => `${e.dataset.orderId}:${e.dataset.orderState}${e.dataset.orderCode ? `(${e.dataset.orderCode})` : ''}`).join(' '));
    note(`${device}: catalogue states after adding: ${states2}`);
    await p.locator('[data-order-catalog] [data-order-id="mobilize"]').first().scrollIntoViewIfNeeded().catch(() => {});
    await shoot('m1-orders-added', {});
    await factsAll('orders added');
    await setFirst();
    // Unaffordable card close-up
    const un = p.locator('[data-order-catalog] [data-order-state="unaffordable"]').first();
    if (await un.count()) {
      await un.scrollIntoViewIfNeeded();
      await p.waitForTimeout(400);
      await un.screenshot({ path: path.join(ev, `m1-unaffordable-card-${vpName(first)}.jpg`), type: 'jpeg', quality: 80 });
      note(`${device}: unaffordable card "${(await un.innerText()).replace(/\s+/g, ' ')}"`);
    } else note(`${device}: no unaffordable card after adding orders`);
    const inv = p.locator('[data-order-catalog] [data-order-state="invalid"]').first();
    if (await inv.count()) {
      await inv.scrollIntoViewIfNeeded();
      await inv.screenshot({ path: path.join(ev, `m1-invalid-card-${vpName(first)}.jpg`), type: 'jpeg', quality: 80 });
      note(`${device}: invalid card "${(await inv.innerText()).replace(/\s+/g, ' ')}"`);
    }
    // Search rows
    await p.locator('#catalog-search').fill('strike');
    await p.waitForTimeout(800);
    await shoot('m1-search-rows', { sizes: [first] });
    await p.locator('#catalog-search').fill('');

    // Undo the added orders so month 2 matches the stability review's month 2
    for (const id of ['reform', 'mobilize']) {
      const card = p.locator(`[data-order-catalog] [data-order-id="${id}"]`).first();
      const rm = card.getByRole('button', { name: /Remove/i }).first();
      if (await rm.click({ timeout: 1500 }).then(() => true, () => false)) continue;
      await p.evaluate((oid) => {
        const st = window.__wcStore?.getState();
        if (!st) return;
        const i = st.pendingActions.findIndex((a) => !a.proposed && a.origin !== 'staff' && (oid === 'reform' ? a.type === 'DOMESTIC_REFORM' : a.type === 'MILITARY_MOBILIZE'));
        if (i >= 0) st.removePendingAction(i);
      }, id);
    }
    await p.waitForTimeout(600);
  }
  // Back to Focus so month 2 opens as it did in the stability review
  await s.click(/^Focus$/i, { timeout: 1500 });
  await p.waitForTimeout(600);

  // ---- 5. Execute, month 2 desk (staff-proposed orders)
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
  await shoot('month-2-desk', { audit: cfg.game });
  await factsAll('month 2 desk');
  await setFirst();
  // Close-up of the recommended order rows
  const prop = p.locator('.ord-wrap.is-proposal, .ord-wrap[data-order-state] .is-proposal').first();
  if (await prop.count()) {
    await prop.scrollIntoViewIfNeeded().catch(() => {});
    await prop.screenshot({ path: path.join(ev, `month-2-proposed-card-${vpName(first)}.jpg`), type: 'jpeg', quality: 80 }).catch(() => {});
    note(`${device}: proposed card "${(await prop.innerText()).replace(/\s+/g, ' ').slice(0, 300)}"`);
  } else note(`${device}: no .is-proposal card visible on month 2`);
  // Full desk on month 2 (the plan with the recommended orders)
  if (await s.click(/^Full desk/i, { timeout: 1500 })) {
    await p.waitForTimeout(800);
    await shoot('month-2-fulldesk', {});
    await s.click(/^Focus$/i, { timeout: 1500 });
  }

  // ---- 6. Map mode with an order menu (Russia)
  await p.keyboard.press('m');
  await p.waitForTimeout(900);
  if (!(await p.locator('.cmd-strip').isVisible().catch(() => false))) {
    await p.getByRole('button', { name: /^Map\b/ }).first().click().catch(() => {});
    await p.waitForTimeout(900);
  }
  await p.waitForFunction(() => !!window.__wcMap, null, { timeout: 15000 }).catch(() => note(`${device}: no __wcMap`));
  await shoot('month-2-map', { audit: cfg.game });
  for (const v of SIZES) {
    await p.setViewportSize({ width: v.width, height: v.height });
    await p.waitForTimeout(1200);
    // Click Russia west of the Urals (Moscow region) at this size
    const pt = await p.evaluate(() => {
      const m = window.__wcMap;
      if (!m) return null;
      const c = m.project([40, 56]);
      const r = m.getContainer().getBoundingClientRect();
      return { x: r.left + c.x, y: r.top + c.y, w: r.width, h: r.height };
    });
    if (!pt || pt.x < 0 || pt.y < 0 || pt.x > v.width || pt.y > v.height) {
      note(`${device} ${vpName(v)}: Russia not on screen (${JSON.stringify(pt)})`);
      continue;
    }
    await p.mouse.click(pt.x, pt.y);
    await p.waitForTimeout(1200);
    const menu = p.locator('.map-action-menu, [data-map-menu], .mam, .ord-sheet').first();
    const n = await p.locator('.ord-wrap').count();
    note(`${device} ${vpName(v)}: map menu after click: ${n} order cards; menu el ${await menu.count()}`);
    await p.screenshot({ path: path.join(ev, `month-2-map-menu-${vpName(v)}.jpg`), type: 'jpeg', quality: 70, scale: 'css' });
    await cardFacts('map menu');
    if (v === first) {
      // A danger order from the map menu
      const d = p.locator('.ord-wrap[data-order-id="airstrike-military"] .wc-card-hit').first();
      if (await d.click({ timeout: 2000 }).then(() => true, () => false)) {
        await p.waitForTimeout(900);
        if (await p.locator('.ord-confirm').count()) {
          await p.screenshot({ path: path.join(ev, `month-2-map-confirm-${vpName(v)}.jpg`), type: 'jpeg', quality: 70, scale: 'css' });
          await cardFacts('map confirm');
          await s.click(/^Cancel$/i, { timeout: 1500 });
        } else note(`${device}: map menu Strike gave no confirm (state ${await p.locator('.ord-wrap[data-order-id="airstrike-military"]').first().getAttribute('data-order-state')})`);
      } else note(`${device}: no Strike military targets in the map menu`);
    }
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
