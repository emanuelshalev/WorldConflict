// DR-OC-4 (design re-review of build-order-cards, new problem 1, S2; extended after review 3, new
// problems 1 and 5): on the phone desk catalogue a danger order pressed in the lower half of the
// list opened a confirmation whose Cancel and Give the order sat under the fixed command bar
// (Execute month exactly where Give the order should be). Review 3: in the first month, once the
// player has added an order of their own, the coach bubble "When you are ready, run the month" stands
// on the bar, outside its measured height, right where the face lands: Give the order was 69%
// covered at 390x844 and almost hidden at 360x740, and a finger on it hit the bubble, which counted
// as a press outside the face, closed it and queued nothing. Also (S4) Cancel on a face that had not
// moved the list moved it anyway (browser scroll anchoring, 49 px at 360x740).
// Guard: Ceasefire or Collapse as Ukraine, desk All orders with target Russia.
//  - 390x844, no order of the player's own: Add on Strike military targets at about 70% of the
//    screen, then on Hard crackdown at 70% and with the list scrolled to its end. Both answers fully
//    on screen, above the command bar, on top at their centre; the page never scrolls; Cancel.
//  - Add Mobilize forces first (the coach moves to its "run the month" step), then at 390x844 and
//    360x740: Strike military targets with its row at the top of the stage (Cancel must leave the
//    list where it was), at about 70% of the stage left free above the bar and the bubble, and Hard
//    crackdown at the end of the list. Taps are touch taps at coordinates (no automatic scrolling).
//    Add itself must be on top where it is tapped; no coach bubble is shown while the face is open;
//    both answers uncovered (elementFromPoint at the centre and at the four corners inset by 4 px)
//    and above the bar; a tap on Give the order queues the order.
// Iteration 4 (build-agenda-layout): the phone month is its own tree. The list scrolls with the page
// (.game) under the sticky top (state line, thing line) and above the sticky bottom bar (.ph-bottom),
// which replace the desk stage and the command bar; the coach's step 3 stands on Execute, not on the
// phone list (DR-OC-5). The same checks, with the sticky top counted as well as the bar.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-OC-4.mjs <outDir> <baseUrl> <apiUrl>
import { args, openAllOrders, run, startGame } from './_lib.mjs';

const { out, base } = args('DR-OC-4');
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };

/** Where both answers are and what is on top of them. */
function measure(p) {
  return p.evaluate(() => {
    const f = document.querySelector('.ord-confirm');
    const bar = document.querySelector('.ph-bottom')?.getBoundingClientRect();
    const barTop = bar && bar.height > 0 ? bar.top : innerHeight;
    const topEdge = document.querySelector('.game-top')?.getBoundingClientRect().bottom ?? 0;
    const name = (at, b) => (!at ? 'off screen' : b.contains(at) ? 'the button' : at.closest('.coach-bubble') ? 'the coach bubble' : at.closest('button')?.innerText.trim().slice(0, 20) || at.className?.toString().split(' ')[0] || at.tagName);
    const chk = (sel) => {
      const b = f.querySelector(sel);
      const r = b.getBoundingClientRect();
      const pts = [
        ['centre', r.left + r.width / 2, r.top + r.height / 2],
        ['top left', r.left + 4, r.top + 4],
        ['top right', r.right - 4, r.top + 4],
        ['bottom left', r.left + 4, r.bottom - 4],
        ['bottom right', r.right - 4, r.bottom - 4],
      ];
      const covered = [];
      for (const [n, x, y] of pts) {
        const at = y >= 0 && y <= innerHeight && x >= 0 && x <= innerWidth ? document.elementFromPoint(x, y) : null;
        if (!at || !b.contains(at)) covered.push(`${n}: ${name(at, b)}`);
      }
      return {
        rect: `${Math.round(r.top)}..${Math.round(r.bottom)}`,
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        onScreen: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
        aboveBar: r.bottom <= barTop + 0.5 && r.top >= topEdge - 0.5,
        covered,
      };
    };
    return { cancel: chk('[data-confirm-cancel]'), go: chk('[data-confirm-go]'), barTop: Math.round(barTop), page: document.scrollingElement.scrollTop };
  });
}

const stageTop = (p) => p.evaluate(() => Math.round(document.querySelector('.game').scrollTop));

/**
 * Scroll the list so the row's top is at this share of the screen, or to the end of the list. With
 * `free`, the share is of the part of the stage the player can press: from the stage's top to the top
 * of the bar or of the coach bubble standing on it (a row under the bubble is scrolled up first).
 */
async function place(p, id, where, free = false) {
  await p.evaluate(
    ([id, where, free]) => {
      const stage = document.querySelector('.game');
      const row = document.querySelector(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`);
      if (where === 'end') {
        stage.scrollTop = stage.scrollHeight;
        return;
      }
      const bar = document.querySelector('.ph-bottom').getBoundingClientRect().top;
      const shown = [...document.querySelectorAll('.coach-bubble')].filter((b) => getComputedStyle(b).visibility !== 'hidden' && b.getBoundingClientRect().height > 0);
      const bubble = Math.min(bar, ...shown.map((b) => b.getBoundingClientRect().top).filter((t) => t > innerHeight / 2));
      const top = Math.max(0, document.querySelector('.game-top').getBoundingClientRect().bottom);
      const y = free ? top + (Math.min(bar, bubble) - top) * where : innerHeight * where;
      stage.scrollTop += row.getBoundingClientRect().top - y;
    },
    [id, where, free],
  );
  await p.waitForTimeout(400);
}

/** Touch-tap the row's Add button where it is (no automatic scroll); what was on top there. */
async function tapAdd(p, id) {
  return p
    .locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"] .ord-act`)
    .first()
    .evaluate((b) => {
      const r = b.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const at = document.elementFromPoint(x, y);
      return { x, y, onTop: !!at && b.contains(at), at: at ? (b.contains(at) ? 'Add' : at.closest('.coach-bubble') ? 'the coach bubble' : at.className?.toString().split(' ')[0] || at.tagName) : 'off screen' };
    })
    .then(async (a) => {
      await p.touchscreen.tap(a.x, a.y);
      return a;
    });
}

await run('DR-OC-4', async (g, track) => {
  const s = track(await startGame({ variant: 'dr-oc-4', device: 'phone', out, base, seat: SEAT }));
  const p = s.page;
  await p.setViewportSize({ width: 390, height: 844 });
  await openAllOrders(s);
  await p.waitForTimeout(800);
  if (!g.check(await p.locator('[data-order-catalog]').first().isVisible().catch(() => false), 'phone: All orders opens')) return;
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type('Russia');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  const row = (id) => p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`).first();
  const face = p.locator('.ord-confirm[data-confirm="danger"]').first();

  // ---- 390x844, no order of the player's own yet: the face against the bar
  for (const [id, where] of [
    ['airstrike-military', 0.7],
    ['policing-hard', 0.7],
    ['policing-hard', 'end'],
  ]) {
    const tag = `390x844 ${id} at ${where === 'end' ? 'the end of the list' : `${Math.round(where * 100)}%`}`;
    await place(p, id, where);
    const top = await row(id).evaluate((e) => Math.round(e.getBoundingClientRect().top));
    await row(id).locator('.ord-act').click();
    if (!g.check(await face.waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false), `${tag}: Add opens the confirmation (row top at y=${top})`)) continue;
    await p.waitForTimeout(700);
    const m = await measure(p);
    await s.look(`${id}-${where === 'end' ? 'end' : 'mid'}`);
    for (const [name, b] of [
      ['Cancel', m.cancel],
      ['Give the order', m.go],
    ]) {
      g.check(b.onScreen, `${tag}: ${name} is fully on screen (${b.rect})`);
      g.check(b.aboveBar, `${tag}: ${name} ends between the sticky top and the bottom bar (${b.rect}, bar at ${m.barTop})`);
      g.check(!b.covered.length, `${tag}: nothing covers ${name} (${b.covered.join(', ') || 'centre and corners on the button'})`);
    }
    g.check(m.page === 0, `${tag}: the page itself did not scroll (${m.page})`);
    await face.locator('[data-confirm-cancel]').click();
    await p.waitForTimeout(500);
    g.check(!(await p.locator('.ord-confirm').count()), `${tag}: Cancel closes the confirmation`);
    g.check((await row(id).getAttribute('data-order-state')) === 'available', `${tag}: nothing was ordered`);
  }

  // ---- Review 3: the player adds an order of their own, the coach moves to "run the month"
  await place(p, 'mobilize', 0.4);
  await tapAdd(p, 'mobilize');
  await p.waitForTimeout(1200);
  g.check((await row('mobilize').getAttribute('data-order-state')) === 'queued', 'Mobilize forces is in this month');
  g.check((await p.locator('.ph-bottom .coach-bubble, [data-order-catalog] .coach-bubble').count()) === 0, 'the coach moves on without a bubble over the phone list or its bottom bar (DR-OC-5)');

  for (const [w, h] of [
    [390, 844],
    [360, 740],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(1000);
    for (const [id, where, how] of [
      ['airstrike-military', 0, 'Cancel'],
      ['airstrike-military', 0.7, 'Give'],
      ['policing-hard', 'end', 'Give'],
    ]) {
      const tag = `${w}x${h}, coach on the bar, ${id} at ${where === 'end' ? 'the end of the list' : where === 0 ? 'the top of the stage' : `${Math.round(where * 100)}% of the free stage`}`;
      await place(p, id, where, true);
      const before = await stageTop(p);
      const add = await tapAdd(p, id);
      g.check(add.onTop, `${tag}: Add is on top where it is tapped (${add.at} at y=${Math.round(add.y)})`);
      if (!g.check(await face.waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false), `${tag}: Add opens the confirmation`)) continue;
      await p.waitForTimeout(800);
      const m = await measure(p);
      const shown = await p.locator('.coach-bubble').evaluateAll((bs) => bs.filter((b) => getComputedStyle(b).visibility !== 'hidden').length);
      await s.look(`coach-${w}x${h}-${id}-${where === 'end' ? 'end' : Math.round(where * 100)}`);
      g.check(shown === 0, `${tag}: no coach bubble is shown while the confirmation is open (${shown})`);
      for (const [name, b] of [
        ['Cancel', m.cancel],
        ['Give the order', m.go],
      ]) {
        g.check(b.onScreen && b.aboveBar, `${tag}: ${name} is on screen, between the sticky top and the bottom bar (${b.rect}, bar at ${m.barTop})`);
        g.check(!b.covered.length, `${tag}: nothing covers ${name} (${b.covered.join(', ') || 'centre and four corners on the button'})`);
      }
      g.check(m.page === 0, `${tag}: the page itself did not scroll (${m.page})`);
      if (how === 'Cancel') {
        await p.touchscreen.tap(m.cancel.cx, m.cancel.cy);
        await p.waitForTimeout(900);
        const after = await stageTop(p);
        g.check(!(await p.locator('.ord-confirm').count()) && (await row(id).getAttribute('data-order-state')) === 'available', `${tag}: Cancel closes the confirmation, nothing ordered`);
        g.check(Math.abs(after - before) <= 1, `${tag}: after Cancel the list is where the player had it (${before} before, ${after} after)`);
      } else {
        await p.touchscreen.tap(m.go.cx, m.go.cy);
        await p.waitForTimeout(1200);
        g.check((await row(id).getAttribute('data-order-state')) === 'queued', `${tag}: a tap on Give the order queues the order (${await row(id).getAttribute('data-order-state')})`);
        // Take it back out, so the next press starts from the same month
        if ((await row(id).getAttribute('data-order-state')) === 'queued') {
          await row(id).locator('.ord-act').evaluate((b) => b.click());
          await p.waitForTimeout(800);
        }
      }
    }
  }
  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);
});
