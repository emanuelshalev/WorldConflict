// Re-review probe: after the danger face opens in the Map order menu, the tiles reflow (the face
// spans both columns, grid-auto-flow dense). What is under the pointer, and what does a second click
// (a double-click, or a quick second press) at the same spot do?
//   node second-click.mjs <evidenceDir>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const tmp = path.join(process.env.TEMP ?? '/tmp', 'wc-rr-second');
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: 'rr-second', device: '1440x900', out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
const pending = () => p.evaluate(() => (window.__wcStore?.getState().pendingActions ?? []).map((a) => `${a.type}${a.targetCountryId ? `>${a.targetCountryId}` : ''}${a.proposed ? '(proposed)' : ''}`).join(', '));
const under = (x, y) =>
  p.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    const w = el?.closest('.ord-wrap');
    return w ? `${w.dataset.orderId}${w.classList.contains('is-confirming') ? ' (confirming)' : ''}` : el?.className?.toString().slice(0, 40);
  }, [x, y]);
try {
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.keyboard.press('m');
  await p.waitForTimeout(900);
  if (!(await p.locator('.cmd-strip').isVisible().catch(() => false))) {
    await p.locator('.mode-seg').getByRole('tab', { name: /Map/ }).first().click().catch(() => {});
    await p.waitForTimeout(900);
  }
  await p.waitForFunction(() => !!window.__wcMap, null, { timeout: 15000 });
  await p.waitForTimeout(800);
  const openMenu = async () => {
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    const pt = await p.evaluate(() => {
      const m = window.__wcMap;
      const c = m.project([40, 56]);
      const r = m.getContainer().getBoundingClientRect();
      return { x: r.left + c.x, y: r.top + c.y };
    });
    await p.mouse.click(pt.x, pt.y);
    await p.locator('.map-action-menu').first().waitFor({ state: 'visible', timeout: 5000 });
    await p.waitForTimeout(700);
  };
  await openMenu();
  const tiles = await p.evaluate(() => [...document.querySelectorAll('.map-action-menu .ord-wrap')].map((w) => `${w.dataset.orderId}:${w.dataset.orderState}`).join(' '));
  log(`month 1 menu tiles: ${tiles}`);
  log(`pending at start: ${await pending()}`);
  for (const id of ['airstrike-military', 'deploy-border']) {
    for (const mode of ['second click after 350 ms', 'double-click']) {
      await openMenu();
      const hit = p.locator(`.map-action-menu .ord-wrap[data-order-id="${id}"] .wc-card-hit`).first();
      if (!(await hit.count())) {
        log(`${id}: not in the menu`);
        break;
      }
      await hit.evaluate((e) => e.scrollIntoView({ block: 'nearest' }));
      await p.waitForTimeout(200);
      const b = await hit.boundingBox();
      const x = Math.round(b.x + b.width / 2);
      const y = Math.round(b.y + b.height / 2);
      const before = await pending();
      if (mode === 'double-click') await p.mouse.dblclick(x, y);
      else {
        await p.mouse.click(x, y);
        await p.waitForTimeout(350);
        log(`${id}: after the first press, under the pointer (${x},${y}): ${await under(x, y)}`);
        await p.screenshot({ path: path.join(ev, `map-reflow-under-pointer-${id}-1440x900.jpg`), type: 'jpeg', quality: 70, clip: { x: x - 420, y: Math.max(0, y - 300), width: 840, height: 640 } }).catch(() => {});
        await p.mouse.click(x, y);
      }
      await p.waitForTimeout(800);
      const face = await p.evaluate(() => {
        const f = document.querySelector('.map-action-menu .ord-confirm');
        return f ? f.closest('.ord-wrap')?.dataset.orderId : 'none';
      });
      const after = await pending();
      log(`${id} / ${mode}: face now open on: ${face}; pending before [${before}] after [${after}]`);
      if (face !== 'none') {
        await p.screenshot({ path: path.join(ev, `map-${mode.startsWith('double') ? 'dblclick' : 'second-click'}-${id}-1440x900.jpg`), type: 'jpeg', quality: 70, clip: { x: x - 420, y: Math.max(0, y - 300), width: 840, height: 640 } }).catch(() => {});
        await p.keyboard.press('Escape');
        await p.waitForTimeout(400);
      }
      // undo anything queued by the probe (not the staff proposals)
      await p.evaluate((beforeLen) => {
        const st = window.__wcStore?.getState();
        if (!st) return;
        while (st.pendingActions.length > beforeLen) {
          st.removePendingAction(st.pendingActions.length - 1);
          if (window.__wcStore.getState().pendingActions.length === st.pendingActions.length) break;
        }
      }, before ? before.split(', ').length : 0);
    }
  }
  log(`page errors: ${s.errors.slice(0, 4).join(' | ') || 'none'}`);
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
} finally {
  fs.writeFileSync(path.join(ev, 'probe-second-click.txt'), `${out.join('\n')}\n`);
  await s.close();
}
