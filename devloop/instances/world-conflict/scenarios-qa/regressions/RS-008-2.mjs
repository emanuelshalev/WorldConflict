// RS-008-2 (build-agenda-layout preview, runs/iter-04/build-preview/m1-3440x1440.png): the month 1
// coach bubble "This is your move this month. Pick one." lay over the question heading ("Choose one of
// 3 answers, or skip") at 3440x1440. RS-008-1 leaves coach bubbles out of its overlap checks, so this
// guard measures them alone. Also the phone half of the coach (found while fixing CA): step 3 "When
// you are ready, run the month" never showed on a phone, where Execute is only on the review screen.
// Guard, Hormuz Convoy as the United States (seed 4242), month 1, at 3440x1440, 1440x900, 1024x768
// and 390x844:
//  - step 1 shows on the crisis and covers no heading, button, link, tab or input (an overlap counts
//    where that element would be on top with the bubble hidden; one clipped under a bar does not);
//  - the player answers the crisis and adds an order of their own (All orders), the coach reaches
//    step 3; where Execute is the next action (the desk's Execute; on the phone, the review screen)
//    step 3 shows, covers nothing of that kind (Execute included) and Execute is on top at its centre;
//  - on the phone, step 3 is not shown over the order list (CA, DR-OC-5);
//  - the same preview showed a goal by its raw threshold ("Hurts: approval 56%+", "approval 56%+" in
//    Your goals in this call): on the month 1 crisis no threshold stands outside the brackets of a
//    goal's full wording; tags and lists use the mission line's words ("Voters stay on side").
//   node devloop/instances/world-conflict/scenarios-qa/regressions/RS-008-2.mjs <outDir> <baseUrl> <apiUrl>
import { args, bodyText, openAllOrders, run, startGame, toPhoneReview } from './_lib.mjs';

const { out, base } = args('RS-008-2');
const SIZES = (process.env.RS0082_SIZES ?? '3440x1440,1440x900,1024x768,390x844').split(',');

/** The shown coach bubbles and every heading or control any of them overlaps. */
function coachCover(p) {
  return p.evaluate(() => {
    const vis = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
    const bubbles = [...document.querySelectorAll('.coach-bubble')].filter(vis);
    const targets = [...document.querySelectorAll('h1, h2, h3, .ask, button, a[href], [role=button], [role=tab], input, select')].filter((el) => vis(el) && !el.closest('.coach-bubble'));
    const res = bubbles.map((b) => {
      const br = b.getBoundingClientRect();
      // Overlap that the player would see: with the bubble hidden, the element is on top somewhere in
      // the shared box (an element clipped under a bar or a sticky top is not covered by the bubble)
      const prev = b.style.visibility;
      b.style.visibility = 'hidden';
      const hit = targets.filter((el) => {
        const r = el.getBoundingClientRect();
        const x0 = Math.max(r.left, br.left);
        const x1 = Math.min(r.right, br.right);
        const y0 = Math.max(r.top, br.top);
        const y1 = Math.min(r.bottom, br.bottom);
        if (x1 - x0 <= 1 || y1 - y0 <= 1) return false;
        for (const fx of [0.1, 0.5, 0.9])
          for (const fy of [0.1, 0.5, 0.9]) {
            const at = document.elementFromPoint(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy);
            if (at && (el.contains(at) || at.contains(el))) return true;
          }
        return false;
      });
      b.style.visibility = prev;
      return { step: b.dataset.coach, rect: `${Math.round(br.left)},${Math.round(br.top)} ${Math.round(br.width)}x${Math.round(br.height)}`, onScreen: br.top >= 0 && br.bottom <= innerHeight && br.left >= 0 && br.right <= innerWidth, covers: hit.map(name) };
    });
    const ex = [...document.querySelectorAll('.execute-btn')].filter(vis)[0];
    let exOnTop = null;
    if (ex) {
      const r = ex.getBoundingClientRect();
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      exOnTop = !!at && ex.contains(at);
    }
    return { bubbles: res, exOnTop };
  });
}

await run('RS-008-2', async (g, track) => {
  for (const size of SIZES) {
    const [w, h] = size.split('x').map(Number);
    const phone = w <= 700;
    const s = track(await startGame({ variant: `rs-008-2-${size}`, device: phone ? 'phone' : size, out, base }));
    const p = s.page;
    await p.setViewportSize({ width: w, height: h });
    await p.evaluate(() => document.querySelector('.game')?.scrollTo(0, 0));
    await p.waitForTimeout(800);
    // Step 1 on the crisis
    let c = await coachCover(p);
    await s.look(`${size}-step1`);
    const one = c.bubbles.find((b) => b.step === 'move');
    if (g.check(!!one, `${size}: step 1 shows on the crisis (${c.bubbles.map((b) => b.step).join(', ') || 'no bubble'})`)) {
      g.check(!one.covers.length, `${size}: step 1 covers no heading or control (${one.covers.join(' | ') || 'none'}; bubble ${one.rect})`);
    }
    const bare = (await bodyText(p)).replace(/\([^)]*\)/g, '').match(/.{0,30}\b(?:(?:approval|stability|legitimacy) \d+%\+|relations \d+\+).{0,10}/gi) ?? [];
    g.check(!bare.length, `${size}: no goal named by its raw threshold (${bare.slice(0, 3).join(' | ') || 'none'})`);
    // Answer the crisis, then add an order of the player's own
    await p.locator('.thing button.opt').first().click();
    await p.waitForTimeout(900);
    if (!g.check(await openAllOrders(s), `${size}: All orders opens`)) {
      await s.close();
      continue;
    }
    await p.waitForTimeout(800);
    // A safe order the seat can give now (a row's Add on the phone, the tile itself on wider screens)
    let given = false;
    for (const id of ['propaganda', 'counter-intel', 'reform', 'procure', 'mobilize']) {
      const card = p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"][data-order-state="available"]`).first();
      if (!(await card.count())) continue;
      const btn = (await card.locator('.ord-act').count()) ? card.locator('.ord-act') : card.locator('.wc-card-hit');
      await btn.first().scrollIntoViewIfNeeded();
      await btn.first().click();
      await p.waitForTimeout(800);
      const go = p.locator('[data-confirm-go]').first();
      if (await go.isVisible().catch(() => false)) await go.click();
      await p.waitForTimeout(600);
      given = (await p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`).first().getAttribute('data-order-state')) === 'queued';
      if (given) break;
    }
    g.check(given, `${size}: an order of the player's own is in this month`);
    g.check((await p.evaluate(() => localStorage.getItem('worldconflict.coach'))) === 'execute', `${size}: the coach is on step 3 after the player's own order`);
    if (phone) {
      c = await coachCover(p);
      g.check(!c.bubbles.length, `${size}: no coach bubble over the phone order list (${c.bubbles.map((b) => `${b.step} ${b.rect}`).join(', ') || 'none'})`);
      await toPhoneReview(p);
      await p.waitForTimeout(800);
    } else {
      await p.keyboard.press('Escape');
      await p.waitForTimeout(400);
    }
    // Where Execute is the next action
    await p.locator('.execute-btn').first().scrollIntoViewIfNeeded().catch(() => {});
    await p.waitForTimeout(500);
    c = await coachCover(p);
    await s.look(`${size}-step3`);
    const three = c.bubbles.find((b) => b.step === 'execute');
    if (g.check(!!three, `${size}: step 3 shows where Execute is the next action (${c.bubbles.map((b) => b.step).join(', ') || 'no bubble'})`)) {
      g.check(!three.covers.length, `${size}: step 3 covers no heading or control (${three.covers.join(' | ') || 'none'}; bubble ${three.rect})`);
      g.check(three.onScreen, `${size}: step 3 is whole on screen (${three.rect})`);
    }
    g.check(c.exOnTop === true, `${size}: Execute is on top at its centre (${c.exOnTop})`);
    g.check(!s.errors.length, `${size}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
    await s.close();
  }
});
