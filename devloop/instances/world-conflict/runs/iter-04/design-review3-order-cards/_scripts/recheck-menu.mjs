// Review 3 rechecks (desktop pointer): C3 in the desk catalogue with every hovered tile wholly on
// screen; C1 menu scroll restored from a non-zero position (the player had scrolled the menu).
//   node recheck.mjs <evidenceDir>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const tmp = path.join(process.env.TEMP ?? '/tmp', 'wc-r3-recheck2');
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: 'r3-recheck2', device: '1440x900', out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
const hovers = () => p.$$eval('.ord-hover', (h) => h.map((x) => x.querySelector('.ord-hover-title')?.innerText.trim()));
async function hoverOn(scope, id) {
  const t = p.locator(`${scope} .ord-wrap[data-order-id="${id}"]`).first();
  const b = await t.boundingBox();
  const vis = b && b.y >= 0 && b.y + b.height <= p.viewportSize().height;
  // Is the point we hover really the tile (not a sticky bar over it)?
  const x = b.x + b.width / 2;
  const y = b.y + Math.min(30, b.height / 2);
  const onTile = await p.evaluate(([id, x, y]) => !!document.elementFromPoint(x, y)?.closest(`.ord-wrap[data-order-id="${id}"]`), [id, x, y]);
  await p.mouse.move(2, 2);
  await p.waitForTimeout(250);
  await p.mouse.move(x, y, { steps: 5 });
  await p.waitForTimeout(800);
  return `${id} (whole on screen ${vis}, point on tile ${onTile}): forecasts shown [${(await hovers()).join(', ')}]`;
}
try {
  if (await s.click(/^Full desk/i, { timeout: 2000 })) await s.click(/^All orders/i, { timeout: 3000 });
  await p.waitForTimeout(900);
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type('Russia');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  for (const v of []) {
    await p.setViewportSize(v);
    await p.waitForTimeout(800);
    const strike = p.locator('[data-order-catalog] .ord-wrap[data-order-id="airstrike-military"]').first();
    await strike.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(400);
    // neighbours in view
    const near = await p.evaluate(() => {
      const ids = [...document.querySelectorAll('[data-order-catalog] .ord-wrap')]
        .filter((w) => {
          const r = w.getBoundingClientRect();
          return r.top >= 0 && r.bottom <= innerHeight && w.dataset.orderId !== 'airstrike-military';
        })
        .map((w) => w.dataset.orderId);
      return ids.slice(0, 3);
    });
    const tag = `${v.width}x${v.height}`;
    for (const id of near) log(`C3 catalogue ${tag} no face: ${await hoverOn('[data-order-catalog]', id)}`);
    await p.mouse.move(2, 2);
    await strike.locator('.wc-card-hit').first().click();
    await p.waitForTimeout(1000);
    log(`C3 catalogue ${tag}: face open ${await p.locator('.ord-confirm').count()}`);
    for (const id of near) {
      const r = await p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`).first().boundingBox();
      if (r && r.y >= 0 && r.y + 30 < v.height) log(`C3 catalogue ${tag} face open: ${await hoverOn('[data-order-catalog]', id)}`);
    }
    await p.screenshot({ path: path.join(ev, `c3-catalog-faceopen-hover-${tag}.jpg`), type: 'jpeg', quality: 70 });
    await p.mouse.move(2, 2);
    await p.locator('.ord-confirm [data-confirm-cancel]').first().click();
    await p.waitForTimeout(700);
    for (const id of near.slice(0, 1)) log(`C3 catalogue ${tag} after Cancel: ${await hoverOn('[data-order-catalog]', id)}`);
    await p.mouse.move(2, 2);
  }
  // Map menu: a scrolled menu, then the face, then Cancel / Escape
  await p.setViewportSize({ width: 1366, height: 768 });
  await s.click(/^Focus$/i, { timeout: 1500 });
  await p.evaluate(() => document.activeElement?.blur());
  await p.mouse.click(700, 740);
  await p.keyboard.press('m');
  await p.waitForTimeout(900);
  if (!(await p.locator('.cmd-strip').isVisible().catch(() => false))) {
    await p.locator('.mode-seg').getByRole('tab', { name: /Map/ }).first().click().catch(() => {});
    await p.waitForTimeout(900);
  }
  await p.waitForFunction(() => !!window.__wcMap, null, { timeout: 15000 });
  for (const v of [{ width: 1366, height: 768 }, { width: 1024, height: 768 }]) {
    await p.setViewportSize(v);
    await p.waitForTimeout(1200);
    const pt = await p.evaluate(() => {
      const m = window.__wcMap;
      const c = m.project([40, 56]);
      const r = m.getContainer().getBoundingClientRect();
      return { x: r.left + c.x, y: r.top + c.y };
    });
    await p.mouse.click(pt.x, pt.y);
    await p.waitForTimeout(1300);
    const tag = `${v.width}x${v.height}`;
    // The player scrolls the menu with the wheel until the Strike tile sits near the bottom
    const menu = p.locator('.map-action-menu').first();
    if (!(await menu.count())) { await p.waitForTimeout(1500); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(1500); }
    log(`${tag}: menu present ${await menu.count()} at map point ${Math.round(pt.x)},${Math.round(pt.y)}`);
    if (!(await menu.count())) { await p.screenshot({ path: path.join(ev, `failure-menu-${tag}.jpg`), type: 'jpeg', quality: 60 }); continue; }
    const mb = await menu.boundingBox();
    await p.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
    await menu.evaluate((m) => { const t = m.querySelector(".ord-wrap[data-order-id=\"deploy-border\"]").getBoundingClientRect(); const h = m.querySelector(".mam-head").getBoundingClientRect(); m.scrollTop += t.top - (h.bottom + 40); });
    await p.waitForTimeout(500);
    const s0 = await menu.evaluate((m) => Math.round(m.scrollTop));
    const strike = p.locator('.map-action-menu .ord-wrap[data-order-id="deploy-border"] .wc-card-hit').first();
    const sb = await strike.boundingBox();
    log(`C1 ${tag}: menu scrolled (Mass troops tile 40 px under the header) to ${s0}; Strike tile top ${Math.round(sb.y)} (menu ${Math.round(mb.y)}..${Math.round(mb.y + mb.height)})`);
    await strike.click({ position: { x: sb.width / 2, y: Math.min(20, sb.height / 2) } });
    await p.waitForTimeout(1000);
    const s1 = await menu.evaluate((m) => Math.round(m.scrollTop));
    // live mode: the WC Escape path
    await p.locator('.map-action-menu').first().screenshot({ path: path.join(ev, `c1-map-scrolled-face-${tag}.jpg`), type: 'jpeg', quality: 78 });
    await p.locator('.map-action-menu [data-confirm-cancel]').first().click();
    await p.waitForTimeout(700);
    const s2 = await menu.evaluate((m) => Math.round(m.scrollTop));
    await strike.click({ position: { x: sb.width / 2, y: Math.min(20, sb.height / 2) } }).catch(() => {});
    await p.waitForTimeout(1000);
    const s3 = await menu.evaluate((m) => Math.round(m.scrollTop));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(700);
    const s4 = await menu.evaluate((m) => Math.round(m.scrollTop)).catch(() => 'menu closed');
    log(`C1 ${tag}: before ${s0} -> face ${s1} -> Cancel ${s2} (restored ${s2 === s0}) -> face again ${s3} -> Escape ${s4} (restored ${s4 === s0})`);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(600);
  }
  log(`page errors: ${s.errors.slice(0, 4).join(' | ') || 'none'}`);
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
} finally {
  fs.writeFileSync(path.join(ev, 'probe-recheck-c1-scrolled.txt'), `${out.join('\n')}\n`);
  await s.close();
}
