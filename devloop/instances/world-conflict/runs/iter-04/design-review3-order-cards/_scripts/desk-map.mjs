// Review 3 (D-81), build-order-cards at ee3b69a. Desktop/tablet/phone session:
//  - C3 hover forecasts in the desk catalogue (no face / face open), month 1
//  - month 2 Desk regression shots
//  - C1 Map order menu: sticky header, face, scroll restored after Cancel and Escape; C3 in the menu
//   node desk-map.mjs <desktop|phone> <evidenceDir>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const device = process.argv[2];
const ev = path.resolve(process.argv[3]);
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const MAP_SIZES =
  device === 'phone'
    ? [{ width: 390, height: 844 }]
    : [
        { width: 3440, height: 1440 },
        { width: 1920, height: 1080 },
        { width: 1440, height: 900 },
        { width: 1366, height: 768 },
        { width: 1024, height: 768 },
      ];
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-r3-dm-${device}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `r3-dm-${device}`, device: device === 'phone' ? 'phone' : '1440x900', out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
const vp = () => `${p.viewportSize().width}x${p.viewportSize().height}`;
const shot = (name, opt = {}) => p.screenshot({ path: path.join(ev, `${name}.jpg`), type: 'jpeg', quality: 70, ...opt });
const setVp = async (v, ms = 900) => {
  await p.setViewportSize(v);
  await p.waitForTimeout(ms);
};
const hoverCount = () => p.locator('.ord-hover').count();

async function hoverTest(scope, otherId, label) {
  const t = p.locator(`${scope} .ord-wrap[data-order-id="${otherId}"]`).first();
  if (!(await t.count())) return `${label}: no ${otherId}`;
  const b = await t.boundingBox();
  if (!b) return `${label}: ${otherId} has no box`;
  await p.mouse.move(5, 5);
  await p.waitForTimeout(200);
  await p.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 40), { steps: 4 });
  await p.waitForTimeout(700);
  const n = await hoverCount();
  const txt = n ? (await p.locator('.ord-hover').first().innerText()).replace(/\s+/g, ' ').slice(0, 90) : '';
  return `${label}: hover ${otherId} at ${Math.round(b.x + b.width / 2)},${Math.round(b.y + Math.min(b.height / 2, 40))} -> forecast shown ${n}${txt ? ` "${txt}"` : ''}`;
}

async function menuFacts() {
  return p.evaluate(() => {
    const menu = document.querySelector('.map-action-menu');
    if (!menu) return { ok: false };
    const mr = menu.getBoundingClientRect();
    const head = menu.querySelector('.mam-head');
    const hr = head?.getBoundingClientRect();
    const face = menu.querySelector('.ord-confirm');
    const fr = face?.getBoundingClientRect();
    const r = (e) => (e ? `${Math.round(e.left)},${Math.round(e.top)} ${Math.round(e.width)}x${Math.round(e.height)}` : 'none');
    const btn = (sel) => {
      const b = face?.querySelector(sel);
      if (!b) return 'none';
      const br = b.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(b.querySelector('.ord-hold-text') ?? b);
      const lines = new Set([...range.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top))).size;
      const at = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
      return `"${b.innerText.trim()}" ${r(br)} lines ${lines} centre ${at && b.contains(at) ? 'ok' : at ? at.className?.toString().split(' ')[0] || at.tagName : 'off'} insideMenu ${br.top >= mr.top && br.bottom <= Math.min(mr.bottom, innerHeight)}`;
    };
    // First tile wholly visible under the header? And is any tile's visible top under the head (covered)?
    const tiles = [...menu.querySelectorAll('.ord-wrap')];
    const firstTile = tiles[0]?.getBoundingClientRect();
    // head on top at its centre and at the close button
    const headOnTop = hr ? menu.querySelector('.mam-head').contains(document.elementFromPoint(hr.left + 30, hr.top + hr.height / 2)) : false;
    const close = menu.querySelector('.mam-head button[aria-label*="lose" i], .mam-head .mam-close, .mam-head button');
    const closeR = close?.getBoundingClientRect();
    const closeOnTop = closeR ? close.contains(document.elementFromPoint(closeR.left + closeR.width / 2, closeR.top + closeR.height / 2)) : false;
    const title = face ? face.innerText.replace(/\s+/g, ' ') : '';
    return {
      ok: true,
      menu: r(mr),
      scrollTop: Math.round(menu.scrollTop),
      scrollMax: Math.round(menu.scrollHeight - menu.clientHeight),
      head: r(hr),
      headText: head?.innerText.replace(/\s+/g, ' ').slice(0, 80),
      headVisible: hr ? hr.top >= mr.top - 1 && hr.bottom <= mr.bottom && hr.top >= 0 : false,
      headOnTop,
      close: closeR ? `${r(closeR)} onTop ${closeOnTop}` : 'none',
      firstTileTop: firstTile ? Math.round(firstTile.top) : null,
      headBottom: hr ? Math.round(hr.bottom) : null,
      face: face ? r(fr) : 'none',
      faceTopVsHead: fr && hr ? Math.round(fr.top - hr.bottom) : null,
      titleCount: face ? (title.toLowerCase().match(/strike military targets in russia/g) ?? []).length : 0,
      cancel: btn('[data-confirm-cancel]'),
      go: btn('[data-confirm-go]'),
      page: Math.round(document.scrollingElement.scrollTop),
    };
  });
}
const fmt = (m) =>
  m.ok
    ? `menu ${m.menu} scroll ${m.scrollTop}/${m.scrollMax} page ${m.page}; head ${m.head} visible ${m.headVisible} onTop ${m.headOnTop} close ${m.close}; first tile top ${m.firstTileTop} head bottom ${m.headBottom}; face ${m.face} face-top minus head-bottom ${m.faceTopVsHead}; title x${m.titleCount}\n     Cancel ${m.cancel}\n     Give ${m.go}`
    : 'no menu';

try {
  // ---- C3 in the desk catalogue (month 1), desktop pointer only
  if (device === 'desktop') {
    if (await s.click(/^Full desk/i, { timeout: 2000 })) await s.click(/^All orders/i, { timeout: 3000 });
    else await s.click(/All orders/i, { timeout: 3000 });
    await p.waitForTimeout(900);
    await p.getByRole('button', { name: /Target country/i }).first().click();
    await p.waitForTimeout(400);
    await p.keyboard.type('Russia');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1200);
    for (const v of [{ width: 1440, height: 900 }, { width: 3440, height: 1440 }]) {
      await setVp(v);
      const strike = p.locator('[data-order-catalog] .ord-wrap[data-order-id="airstrike-military"]').first();
      await strike.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(400);
      log(`C3 catalogue ${vp()} ${await hoverTest('[data-order-catalog]', 'deploy-border', 'no face open')}`);
      await shot(`c3-catalog-hover-noface-${vp()}`);
      await p.mouse.move(5, 5);
      await strike.locator('.wc-card-hit').first().click();
      await p.waitForTimeout(1000);
      log(`C3 catalogue ${vp()} face open ${await p.locator('.ord-confirm').count()}`);
      for (const id of ['deploy-border', 'mobilize', 'spy', 'airstrike-nuclear']) log(`C3 catalogue ${vp()} ${await hoverTest('[data-order-catalog]', id, 'face open')}`);
      await shot(`c3-catalog-hover-faceopen-${vp()}`);
      await p.keyboard.press('Escape');
      await p.waitForTimeout(600);
      log(`C3 catalogue ${vp()} ${await hoverTest('[data-order-catalog]', 'deploy-border', 'after Escape')}`);
      await p.mouse.move(5, 5);
    }
    await setVp({ width: 1440, height: 900 });
    await s.click(/^Focus$/i, { timeout: 1500 });
    await p.waitForTimeout(600);
  }

  // ---- Execute month 1, month 2 desk
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
  if (device === 'desktop') {
    for (const v of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
      await setVp(v);
      await shot(`month-2-desk-${vp()}`);
    }
  }

  // ---- Map menu
  await p.keyboard.press('m');
  await p.waitForTimeout(900);
  if (!(await p.locator('.cmd-strip').isVisible().catch(() => false))) {
    await p.locator('.mode-seg').getByRole('tab', { name: /Map/ }).first().click().catch(() => {});
    await p.waitForTimeout(900);
  }
  await p.waitForFunction(() => !!window.__wcMap, null, { timeout: 15000 }).catch(() => log('no __wcMap'));
  for (const v of MAP_SIZES) {
    await setVp(v, 1300);
    const pt = await p.evaluate(() => {
      const m = window.__wcMap;
      if (!m) return null;
      const c = m.project([40, 56]);
      const r = m.getContainer().getBoundingClientRect();
      return { x: r.left + c.x, y: r.top + c.y };
    });
    if (!pt) {
      log(`${vp()}: no map point`);
      continue;
    }
    await p.mouse.click(pt.x, pt.y);
    await p.waitForTimeout(1300);
    const m0 = await menuFacts();
    const tag = vp();
    await shot(`c1-map-menu-${tag}`);
    // C3 in the menu, no face
    if (device === 'desktop') log(`C3 map ${tag} ${await hoverTest('.map-action-menu', 'deploy-border', 'no face open')}`);
    await p.mouse.move(5, 5);
    const d = p.locator('.map-action-menu .ord-wrap[data-order-id="airstrike-military"] .wc-card-hit').first();
    if (!(await d.count())) {
      log(`${tag}: no Strike tile; ${fmt(m0)}`);
      await p.keyboard.press('Escape');
      continue;
    }
    // Scroll the menu as a player would to bring the Strike tile to the bottom edge, then a bit more
    await d.evaluate((e) => e.scrollIntoView({ block: 'end' }));
    await p.waitForTimeout(300);
    const m1 = await menuFacts();
    await d.click();
    await p.waitForTimeout(1100);
    const m2 = await menuFacts();
    await shot(`c1-map-confirm-${tag}`);
    await p.locator('.map-action-menu').first().screenshot({ path: path.join(ev, `c1-map-confirm-menu-${tag}.jpg`), type: 'jpeg', quality: 78 }).catch(() => {});
    if (device === 'desktop') {
      for (const id of ['deploy-border', 'mobilize', 'propose-ceasefire', 'spy']) log(`C3 map ${tag} ${await hoverTest('.map-action-menu', id, 'face open')}`);
      await shot(`c3-map-hover-faceopen-${tag}`);
      await p.mouse.move(5, 5);
    }
    await p.locator('.map-action-menu [data-confirm-cancel]').first().click();
    await p.waitForTimeout(700);
    const m3 = await menuFacts();
    await shot(`c1-map-after-cancel-${tag}`);
    await d.click().catch(() => {});
    await p.waitForTimeout(1000);
    const m4a = await menuFacts();
    await p.keyboard.press('Escape');
    await p.waitForTimeout(700);
    const m4 = await menuFacts();
    // Scroll to the top of the menu: does the sticky head cover the first tile?
    await p.evaluate(() => {
      document.querySelector('.map-action-menu').scrollTop = 0;
    });
    await p.waitForTimeout(200);
    const m5 = await menuFacts();
    // Mid-scroll: what lies under the head
    await p.evaluate(() => {
      const m = document.querySelector('.map-action-menu');
      m.scrollTop = Math.round((m.scrollHeight - m.clientHeight) / 2);
    });
    await p.waitForTimeout(200);
    await p.locator('.map-action-menu').first().screenshot({ path: path.join(ev, `c1-map-menu-midscroll-${tag}.jpg`), type: 'jpeg', quality: 78 }).catch(() => {});
    log(`\n## C1 map ${tag}\n  opened: ${fmt(m0)}\n  Strike at menu bottom: ${fmt(m1)}\n  face open: ${fmt(m2)}\n  after Cancel: ${fmt(m3)} restored ${m3.scrollTop === m1.scrollTop}\n  reopened: scroll ${m4a.scrollTop}\n  after Escape: ${fmt(m4)} restored ${m4.scrollTop === m1.scrollTop}\n  at top: first tile top ${m5.firstTileTop} head bottom ${m5.headBottom}`);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(600);
  }
  log(`page errors: ${s.errors.slice(0, 4).join(' | ') || 'none'}`);
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
  await shot(`failure-dm-${device}`).catch(() => {});
} finally {
  fs.writeFileSync(path.join(ev, `probe-desk-map-${device}.txt`), `${out.join('\n')}\n`);
  await s.close();
}
