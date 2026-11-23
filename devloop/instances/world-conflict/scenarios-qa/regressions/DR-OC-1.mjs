// DR-OC-1 (design review of build-order-cards, required change 1, S2): the danger confirmation on
// the compact tiles of the Map order menu was cut and cramped. At 3440 "Cancel" ran past its button
// and "Give the order" broke onto three lines, the order title showed twice, and at 1024x768 both
// buttons sat below the menu's visible area (an inner scroll to find them). Guard: on Ceasefire or
// Collapse as Ukraine (CO-UKR-MAYA1), open Russia's order menu in Map mode, press Strike military
// targets, and at 1366x768, 1024x768 and 3440x1440 check that Cancel and Give the order are whole
// inside the menu's visible box and the viewport, each label on one line, and the title said once.
// Re-review C1 and C3: while the face is open the menu header's close button stays in view (the
// header is sticky), pointing at another order shows no hover forecast beside the face, and Cancel
// or Escape put the menu back at the scroll position it had before the press.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-OC-1.mjs <outDir> <baseUrl> <apiUrl>
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('DR-OC-1');
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const SIZES = [
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 3440, height: 1440 },
];
const TITLE = 'Strike military targets in Russia';

await run('DR-OC-1', async (g, track) => {
  const s = track(await startGame({ variant: 'dr-oc-1', device: '1366x768', out, base, seat: SEAT }));
  const p = s.page;
  // Map mode
  await p.keyboard.press('m');
  await p.waitForTimeout(900);
  if (!(await p.locator('.cmd-strip').isVisible().catch(() => false))) {
    await p.locator('.mode-seg').getByRole('tab', { name: /Map/ }).first().click().catch(() => {});
    await p.waitForTimeout(900);
  }
  await p.waitForFunction(() => !!window.__wcMap, null, { timeout: 15000 });

  for (const v of SIZES) {
    const tag = `${v.width}x${v.height}`;
    await p.setViewportSize(v);
    await p.waitForTimeout(1200);
    // Russia west of the Urals, projected at this size
    const pt = await p.evaluate(() => {
      const m = window.__wcMap;
      const c = m.project([40, 56]);
      const r = m.getContainer().getBoundingClientRect();
      return { x: r.left + c.x, y: r.top + c.y };
    });
    g.check(pt.x > 0 && pt.y > 0 && pt.x < v.width && pt.y < v.height, `${tag}: Russia is on screen to open its order menu`);
    await p.mouse.click(pt.x, pt.y);
    const menu = p.locator('.map-action-menu').first();
    await menu.waitFor({ state: 'visible', timeout: 5000 });
    await p.waitForTimeout(600);
    const strike = menu.locator('.ord-wrap[data-order-id="airstrike-military"] .wc-card-hit').first();
    if (!g.check(await strike.count(), `${tag}: the menu offers Strike military targets in Russia`)) continue;
    await strike.scrollIntoViewIfNeeded();
    const scrollBefore = await menu.evaluate((e) => e.scrollTop);
    await strike.click();
    const face = menu.locator('.ord-confirm[data-confirm="danger"]').first();
    await face.waitFor({ state: 'visible', timeout: 4000 });
    // The flip animation and the scroll into view
    await p.waitForTimeout(700);
    const m = await p.evaluate((title) => {
      const menuEl = document.querySelector('.map-action-menu');
      const faceEl = menuEl.querySelector('.ord-confirm');
      const mr = menuEl.getBoundingClientRect();
      // The menu's visible box: its padding box clipped to the viewport
      const box = { top: Math.max(mr.top + menuEl.clientTop, 0), bottom: Math.min(mr.top + menuEl.clientTop + menuEl.clientHeight, innerHeight), left: Math.max(mr.left, 0), right: Math.min(mr.right, innerWidth) };
      const btn = (sel) => {
        const b = faceEl.querySelector(sel);
        const r = b.getBoundingClientRect();
        // Lines of the label: distinct line tops of its text
        const range = document.createRange();
        range.selectNodeContents(b.querySelector('.ord-hold-text') ?? b);
        const tops = new Set([...range.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)));
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return {
          text: b.innerText.trim(),
          onTop: !!at && b.contains(at),
          inside: r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5 && r.left >= box.left - 0.5 && r.right <= box.right + 0.5,
          lines: tops.size,
          clipped: b.scrollWidth > b.clientWidth + 1,
          rect: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
        };
      };
      const text = faceEl.innerText.replace(/\s+/g, ' ');
      const titles = text.toLowerCase().split(title.toLowerCase()).length - 1;
      // C1: the header (country, capital left, close) stays in view while the face is open
      const close = menuEl.querySelector('.mam-close');
      const cr = close.getBoundingClientRect();
      const atClose = document.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2);
      const head = { inside: cr.top >= box.top - 0.5 && cr.bottom <= box.bottom + 0.5, onTop: !!atClose && close.contains(atClose), rect: `${Math.round(cr.top)}..${Math.round(cr.bottom)}` };
      return { cancel: btn('[data-confirm-cancel]'), go: btn('[data-confirm-go]'), head, titles, box: `${Math.round(box.top)}..${Math.round(box.bottom)}`, focus: document.activeElement?.hasAttribute('data-confirm-cancel'), scrolled: menuEl.scrollTop };
    }, TITLE);
    await s.look(`map-confirm-${tag}`);
    for (const [name, b] of [
      ['Cancel', m.cancel],
      ['Give the order', m.go],
    ]) {
      g.check(b.inside, `${tag}: ${name} is whole inside the menu's visible box (button ${b.rect}, box ${m.box})`);
      g.check(b.lines === 1, `${tag}: the ${name} label is on one line (${b.lines} lines)`);
      g.check(!b.clipped, `${tag}: the ${name} label does not run past its button`);
      g.check(b.onTop, `${tag}: nothing covers ${name} (the sticky header included)`);
    }
    g.check(m.titles === 1, `${tag}: the order title is said once on the face (${m.titles} times)`);
    g.check(m.focus, `${tag}: focus is on Cancel`);
    g.check(m.head.inside && m.head.onTop, `${tag}: the menu header's close button stays in view while the face is open (${m.head.rect}, box ${m.box}, menu scrolled ${m.scrolled} px)`);

    // C3: no hover forecast of another order beside the open face
    const other = await menu.evaluate((el) => {
      const mr = el.getBoundingClientRect();
      const headBottom = el.querySelector('.mam-head').getBoundingClientRect().bottom;
      // The visible part of another tile, under the sticky header and inside the menu
      for (const w of el.querySelectorAll('.ord-wrap:not(.is-confirming)')) {
        const r = w.getBoundingClientRect();
        const top = Math.max(r.top, headBottom + 2);
        const bottom = Math.min(r.bottom, mr.bottom - 2, innerHeight - 2);
        if (r.width > 0 && bottom - top >= 8) return { x: r.left + r.width / 2, y: (top + bottom) / 2, id: w.getAttribute('data-order-id') };
      }
      return null;
    });
    if (g.check(other, `${tag}: another order is in view to point at`)) {
      await p.mouse.move(other.x, other.y);
      await p.waitForTimeout(900);
      g.check(!(await p.locator('.ord-hover').count()), `${tag}: pointing at ${other.id} shows no forecast while the face is open`);
    }

    // Cancel closes the face and puts the menu back where it was (C1)
    await face.locator('[data-confirm-cancel]').click();
    await p.waitForTimeout(500);
    g.check(!(await menu.locator('.ord-confirm').count()), `${tag}: Cancel closes the face`);
    const afterCancel = await menu.evaluate((e) => e.scrollTop);
    g.check(Math.abs(afterCancel - scrollBefore) <= 2, `${tag}: after Cancel the menu is back at its scroll position (${afterCancel}, was ${scrollBefore})`);
    // Escape closes only the face, and restores the same way
    await strike.scrollIntoViewIfNeeded();
    const beforeEsc = await menu.evaluate((e) => e.scrollTop);
    await strike.click();
    await face.waitFor({ state: 'visible', timeout: 4000 });
    await p.waitForTimeout(700);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    g.check(!(await menu.locator('.ord-confirm').count()) && (await menu.isVisible()), `${tag}: Escape closes the face, the menu stays`);
    const afterEsc = await menu.evaluate((e) => e.scrollTop);
    g.check(Math.abs(afterEsc - beforeEsc) <= 2, `${tag}: after Escape the menu is back at its scroll position (${afterEsc}, was ${beforeEsc})`);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
  }
  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);
});
