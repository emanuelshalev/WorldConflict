// DR-INT-5 (design-review-integrated.md): Map mode showed North America (the player's own capital,
// set once on load) while the open card was an Iran crisis or "Who will police Gaza?"; the subject of
// the card was off the visible gap or at its rim.
// Rule (L-14, design-layout.md): in Map mode the camera turns to the subject of the open item, the
// first foreign country the crisis names (its affectedCountries), and the padding puts it in the free
// gap between the item card (left) and the Plan float (right). The subject is read here from the
// store's own decision, not from the UI's helper.
// Scenes: Hormuz Convoy as the United States (seed 4242), months 1 to 4, 1920x1080, Map mode, each
// crisis of the month opened from the List. Fixed and floating elements: the state band and month
// bar (top), the item card and the List (left, [data-map-panel="left"]), the Plan float with Execute
// (right, [data-map-panel="right"]), the zoom and Whole world buttons (bottom left), the ticker
// (bottom); none is moved by this guard.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-INT-5.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { apiSave, args, openSaved, openThing, run } from './_lib.mjs';

const { out, base, api } = args('DR-INT-5');
const SIZE = process.env.DRINT5_SIZE ?? '1920x1080';

await run('DR-INT-5', async (g) => {
  let seen = 0;
  for (const months of [0, 1, 2, 3]) {
    const sv = await apiSave(api, months, undefined, 'drint5');
    const { browser, page: p, errors } = await openSaved(base, SIZE, sv);
    const where = `month ${months + 1}`;
    try {
      await p.getByRole('tab', { name: /Map/ }).first().click();
      await p.waitForTimeout(1200);
      const calls = await p.evaluate(() => {
        const st = window.__wcStore.getState();
        const me = st.worldState.playerCountryId;
        return st.pendingDecisions.map((d) => ({ title: d.title, subject: d.affectedCountries.find((c) => c !== me) ?? me }));
      });
      for (const c of calls) {
        if (!(await openThing(p, c.title))) continue;
        await p.waitForTimeout(1400);
        const m = await p.evaluate((id) => {
          const map = window.__wcMap;
          const st = window.__wcStore.getState();
          const at = st.worldState.countries.find((x) => x.id === id)?.capital;
          if (!map || !at) return null;
          const r = map.getContainer().getBoundingClientRect();
          const pt = map.project(at);
          const x = r.left + pt.x;
          const y = r.top + pt.y;
          const left = document.querySelector('[data-map-panel="left"] .mapcard')?.getBoundingClientRect();
          const right = document.querySelector('[data-map-panel="right"]')?.getBoundingClientRect();
          const gapL = left ? left.right : r.left;
          const gapR = right ? right.left : r.right;
          const c = map.getCenter();
          const dLng = Math.abs(((c.lng - at[0] + 540) % 360) - 180);
          return { x: Math.round(x), y: Math.round(y), gapL: Math.round(gapL), gapR: Math.round(gapR), dLng: Math.round(dLng), top: Math.round(r.top), bottom: Math.round(r.bottom) };
        }, c.subject);
        g.check(!!m, `${where}, "${c.title}": the subject ${c.subject} is on the map`);
        if (!m) continue;
        seen++;
        const mid = (m.gapL + m.gapR) / 2;
        const inGap = m.x > m.gapL + 40 && m.x < m.gapR - 40 && m.y > m.top + 80 && m.y < m.bottom - 80;
        g.check(inGap && Math.abs(m.x - mid) <= (m.gapR - m.gapL) * 0.3 && m.dLng <= 60, `${where}, "${c.title}": ${c.subject} sits in the free gap (x ${m.x} in ${m.gapL}..${m.gapR}, centre ${Math.round(mid)}; ${m.dLng} degrees from the camera)`);
        await p.screenshot({ path: path.join(out, `m${months + 1}-${c.subject}.png`) });
      }
      g.check(!errors.length, `${where}: no page errors (${errors.slice(0, 2).join(' | ')})`);
    } finally {
      await browser.close();
    }
  }
  g.check(seen >= 3, `at least three crisis calls were opened in Map mode (${seen})`);
});
