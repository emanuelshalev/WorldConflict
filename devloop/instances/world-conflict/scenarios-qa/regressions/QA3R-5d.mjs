// QA3R-5d (iteration 3 repro, Sam on Scarborough): taps 20 px off Taiwan and between Philippine
// islands did nothing; only the polygon under the pointer counted. Guard: in Map mode at laptop
// and phone widths, a tap in the sea within 12 px of Taiwan's and the Philippines' coast opens
// that country's order menu; a tap far out at sea opens nothing.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/QA3R-5d.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('QA3R-5d');
const NAMES = { TWN: 'Taiwan', PHL: 'Philippines' };

/** A sea point just off the country's coast: walk out from its centre until no land, then 8 px more. */
async function nearMiss(p, id) {
  return p.evaluate(async (id) => {
    const m = window.__wcMap;
    const f = m.querySourceFeatures('countries').find((x) => x.properties?.gameId === id || x.id === id);
    if (!f) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const walk = (c) => { if (typeof c[0] === 'number') { minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]); minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]); } else c.forEach(walk); };
    walk(f.geometry.coordinates);
    m.jumpTo({ center: [(minX + maxX) / 2, (minY + maxY) / 2], zoom: 4.2 });
    await new Promise((r) => { m.once('idle', r); setTimeout(r, 2500); });
    const c = m.project([(minX + maxX) / 2, (minY + maxY) / 2]);
    const at = (x, y) => m.queryRenderedFeatures([x, y], { layers: ['country-fills'] })[0]?.properties?.gameId;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let x = c.x, y = c.y, onLand = false;
      for (let i = 0; i < 400; i++) {
        const hit = at(x, y);
        if (hit === id) onLand = true;
        else if (onLand && !hit) {
          const px = x + dx * 8, py = y + dy * 8;
          if (!at(px, py)) {
            const r = m.getCanvas().getBoundingClientRect();
            return { x: r.left + px, y: r.top + py, far: { x: r.left + px + dx * 120, y: r.top + py + dy * 120 } };
          }
        } else if (onLand && hit) break;
        x += dx; y += dy;
      }
    }
    return null;
  }, id);
}

await run('QA3R-5d', async (g, track) => {
  for (const device of ['laptop', 'phone']) {
    const s = track(await startGame({ variant: `qa3r5d-${device}`, device, out: path.join(out, device), base }));
    const p = s.page;
    await p.locator('.mode-seg').getByRole('tab', { name: /Map/ }).first().click();
    await p.waitForFunction(() => !!window.__wcMap?.getLayer?.('country-fills'), null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    for (const id of ['TWN', 'PHL']) {
      const pt = await nearMiss(p, id);
      g.check(!!pt, `${device}: found a sea point just off ${NAMES[id]}`);
      if (!pt) continue;
      await p.mouse.click(pt.x, pt.y);
      await p.waitForTimeout(700);
      const menu = p.getByRole('dialog', { name: `Orders for ${NAMES[id]}` }).or(p.locator(`[aria-label="Orders for ${NAMES[id]}"]`)).first();
      g.check(await menu.isVisible().catch(() => false), `${device}: a near miss off ${NAMES[id]} opens its order menu`);
      await s.look(`${device}-${id}`);
      await p.keyboard.press('Escape');
      await p.mouse.click(pt.far.x, pt.far.y);
      await p.waitForTimeout(600);
      const any = await p.locator('.map-action-menu').first().isVisible().catch(() => false);
      g.check(!any, `${device}: a tap far out at sea off ${NAMES[id]} opens no menu`);
    }
    g.check(!s.errors.length, `${device}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
