// DR-OC-5 (design review 4 of the order cards, condition CA; owner build-agenda-layout): in month 1,
// once the player had added an order of their own, the coach bubble "When you are ready, run the
// month" stood over the phone order list: 19% of the visible list at 390x844 and 33% at 360x740, on
// the right where Add sits; an Add wholly under it did nothing when tapped. Required: every Add is
// pressable, or the coach covers at most 10% of the list.
// Iteration 4 phone tree (PhoneMonth): the list scrolls with the page under the sticky top (state
// line, thing line) and over the sticky bottom bar; a coach bubble or a sheet may float over it.
// Guard, on Ceasefire or Collapse as Ukraine, month 1, All orders (from See all), target Russia:
//  - before any order of the player's own (coach on its first step) and after adding Mobilize forces
//    (the coach moves on), at 390x844 and 360x740;
//  - the page is scrolled over the whole list in 8 px steps; at every step every row button (Add,
//    Pick, Why, Remove) whose centre lies between the sticky top and the bottom bar must be on top at
//    its centre (elementFromPoint), or the shown coach bubbles and sheets cover at most 10% of the
//    list's visible height;
//  - after a tap on an Add found that way the order is in this month (a real touch tap at its centre).
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-OC-5.mjs <outDir> <baseUrl> <apiUrl>
import { args, openAllOrders, phoneList, run, startGame } from './_lib.mjs';

const { out, base } = args('DR-OC-5');
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const MAX_COVER = 0.1;

/** Scroll the list in 8 px steps; buttons in the free band that are not on top, and the most a floater covers. */
async function scan(p) {
  const range = await p.evaluate(() => {
    const g = document.querySelector('.game');
    const rows = [...document.querySelectorAll('[data-order-catalog] .ord-cat .ord-wrap')];
    const top = document.querySelector('.game-top').getBoundingClientRect().bottom;
    const from = g.scrollTop + rows[0].getBoundingClientRect().top - top - 40;
    return [Math.max(0, Math.round(from)), g.scrollHeight - g.clientHeight];
  });
  const missed = new Set();
  let checked = 0;
  let worst = 0;
  let worstAt = '';
  for (let y = range[0]; y <= range[1]; y += 8) {
    await p.evaluate((y) => document.querySelector('.game').scrollTo(0, y), y);
    await p.waitForTimeout(16);
    const r = await p.evaluate(() => {
      const top = document.querySelector('.game-top').getBoundingClientRect().bottom;
      const bar = document.querySelector('.ph-bottom');
      const bottom = bar && bar.getBoundingClientRect().height > 0 ? bar.getBoundingClientRect().top : innerHeight;
      const miss = [];
      let n = 0;
      for (const b of document.querySelectorAll('[data-order-catalog] .ord-cat .ord-act')) {
        const a = b.getBoundingClientRect();
        const x = a.left + a.width / 2;
        const y = a.top + a.height / 2;
        if (a.height === 0 || y < top + 2 || y > bottom - 2) continue;
        n++;
        const at = document.elementFromPoint(x, y);
        if (!at || !b.contains(at)) miss.push(`${b.closest('.ord-wrap')?.dataset.orderId} at y=${Math.round(y)} under ${at?.closest('.coach-bubble') ? 'the coach bubble' : at?.className?.toString().split(' ')[0] || at?.tagName}`);
      }
      return { n, miss };
    });
    checked += r.n;
    for (const m of r.miss) missed.add(m.replace(/ at y=\d+/, ''));
    const m = await phoneList(p);
    if (m.coveredShare > worst) {
      worst = m.coveredShare;
      worstAt = `${m.covered} of ${m.band} px at scroll ${y} (${m.floaters.join(', ')})`;
    }
  }
  return { checked, missed: [...missed], worst, worstAt };
}

await run('DR-OC-5', async (g, track) => {
  const s = track(await startGame({ variant: 'dr-oc-5', device: 'phone', out, base, seat: SEAT }));
  const p = s.page;
  await p.setViewportSize({ width: 390, height: 844 });
  if (!g.check(await openAllOrders(s), 'phone: All orders opens from the month')) return;
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type('Russia');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  const coach = async () => p.evaluate(() => localStorage.getItem('worldconflict.coach') ?? 'move');

  const check = async (tag) => {
    const r = await scan(p);
    await s.look(tag.replace(/[^\w]+/g, '-'));
    const ok = !r.missed.length || r.worst <= MAX_COVER;
    g.check(ok, `${tag}: every row button in the list is pressable (${r.checked} positions checked; not on top: ${r.missed.slice(0, 4).join('; ') || 'none'}), or the coach covers at most ${MAX_COVER * 100}% of the list (most covered: ${(r.worst * 100).toFixed(0)}%${r.worstAt ? `, ${r.worstAt}` : ''})`);
  };

  for (const [w, h] of [
    [390, 844],
    [360, 740],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(800);
    await check(`${w}x${h}, coach on ${await coach()}, no order of your own`);
  }

  // One order of the player's own, by a touch tap at the centre of its Add
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(800);
  const mob = p.locator('[data-order-catalog] .ord-wrap[data-order-id="mobilize"]').first();
  await p.evaluate(() => {
    const g = document.querySelector('.game');
    const b = document.querySelector('[data-order-catalog] .ord-wrap[data-order-id="mobilize"] .ord-act');
    g.scrollTop += b.getBoundingClientRect().top - innerHeight * 0.45;
  });
  await p.waitForTimeout(400);
  const at = await mob.locator('.ord-act').evaluate((b) => {
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await p.touchscreen.tap(at.x, at.y);
  await p.waitForTimeout(1200);
  g.check((await mob.getAttribute('data-order-state')) === 'queued', 'a touch tap on Add puts Mobilize forces in this month');

  for (const [w, h] of [
    [390, 844],
    [360, 740],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(800);
    await check(`${w}x${h}, coach on ${await coach()}, one order added`);
  }
  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);
});
