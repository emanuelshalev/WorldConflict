// DR-OC-4 (design re-review of build-order-cards, new problem 1, S2): on the phone desk catalogue a
// danger order pressed in the lower half of the list opened a confirmation whose Cancel and Give the
// order sat under the fixed command bar (Execute month exactly where Give the order should be): the
// face's scroll-into-view did not know about the bar. Guard: phone 390x844, Ceasefire or Collapse as
// Ukraine, desk All orders with target Russia. Press Add on Strike military targets with its row at
// about 70% of the screen height, then on the last row of the list (Hard crackdown) with the list
// scrolled to its end. Each time, both answers must be fully on screen, above the command bar and on
// top (elementFromPoint at each button's centre is the button), and the page itself never scrolls.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-OC-4.mjs <outDir> <baseUrl> <apiUrl>
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('DR-OC-4');
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };

await run('DR-OC-4', async (g, track) => {
  const s = track(await startGame({ variant: 'dr-oc-4', device: 'phone', out, base, seat: SEAT }));
  const p = s.page;
  let opened = false;
  if (await s.click(/^Full desk/i, { timeout: 2000 })) opened = await s.click(/^All orders/i, { timeout: 3000 });
  if (!opened) await s.click(/All orders/i, { timeout: 3000 });
  await p.waitForTimeout(800);
  if (!g.check(await p.locator('[data-order-catalog]').first().isVisible().catch(() => false), 'phone: All orders opens')) return;
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type('Russia');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);

  for (const [id, where] of [
    ['airstrike-military', 0.7],
    ['policing-hard', 0.7],
    ['policing-hard', 'end'],
  ]) {
    const tag = `${id} at ${where === 'end' ? 'the end of the list' : `${Math.round(where * 100)}%`}`;
    // Place the row: its top at this share of the screen, or the list scrolled to its end
    await p.evaluate(
      ([id, where]) => {
        const stage = document.querySelector('#desk-stage');
        if (where === 'end') stage.scrollTop = stage.scrollHeight;
        else stage.scrollTop += document.querySelector(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`).getBoundingClientRect().top - innerHeight * where;
      },
      [id, where],
    );
    await p.waitForTimeout(400);
    const row = p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`).first();
    const top = await row.evaluate((e) => Math.round(e.getBoundingClientRect().top));
    await row.locator('.ord-act').click();
    const face = p.locator('.ord-confirm[data-confirm="danger"]').first();
    if (!g.check(await face.waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false), `${tag}: Add opens the confirmation (row top at y=${top})`)) continue;
    await p.waitForTimeout(700);
    const m = await p.evaluate(() => {
      const f = document.querySelector('.ord-confirm');
      const bar = document.querySelector('.cmd-bar')?.getBoundingClientRect();
      const barTop = bar && bar.height > 0 ? bar.top : innerHeight;
      const chk = (sel) => {
        const b = f.querySelector(sel);
        const r = b.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const at = cy >= 0 && cy <= innerHeight ? document.elementFromPoint(cx, cy) : null;
        return {
          rect: `${Math.round(r.top)}..${Math.round(r.bottom)}`,
          onScreen: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
          aboveBar: r.bottom <= barTop + 0.5,
          onTop: !!at && b.contains(at),
          at: at ? (b.contains(at) ? 'the button' : at.closest('button')?.innerText.trim().slice(0, 20) || at.className?.toString().split(' ')[0] || at.tagName) : 'off screen',
        };
      };
      return { cancel: chk('[data-confirm-cancel]'), go: chk('[data-confirm-go]'), barTop: Math.round(barTop), page: document.scrollingElement.scrollTop };
    });
    await s.look(`${id}-${where === 'end' ? 'end' : 'mid'}`);
    for (const [name, b] of [
      ['Cancel', m.cancel],
      ['Give the order', m.go],
    ]) {
      g.check(b.onScreen, `${tag}: ${name} is fully on screen (${b.rect})`);
      g.check(b.aboveBar, `${tag}: ${name} ends above the command bar (${b.rect}, bar at ${m.barTop})`);
      g.check(b.onTop, `${tag}: nothing covers ${name} (on top at its centre: ${b.at})`);
    }
    g.check(m.page === 0, `${tag}: the page itself did not scroll (${m.page})`);
    await face.locator('[data-confirm-cancel]').click();
    await p.waitForTimeout(500);
    g.check(!(await p.locator('.ord-confirm').count()), `${tag}: Cancel closes the confirmation`);
    g.check((await row.getAttribute('data-order-state')) === 'available', `${tag}: nothing was ordered`);
  }
  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);
});
