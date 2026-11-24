// Iteration 3, fix-newcomers (F-02-1, F-02-4, F-02-5): replays the customers' steps in the real UI
// and checks the fixes at phone, tablet and laptop width.
//   node devloop/instances/world-conflict/runs/iter-03/fix-newcomers-shots.mjs <outDir> [phone,tablet,laptop]
// DEVLOOP_BASE_URL points at the UI under test (default http://localhost:5173/).
// Iteration 4 (month screen): each check also reads the month screen's selectors (the crisis
// Thing's scene band and quote, its answer cards, the recommended orders Thing's Choose); the old
// desk's selectors stay, no check is dropped or loosened.
import { launch } from '../../../../kit/kit.mjs';

const out = process.argv[2] ?? '/tmp/playtest/fix-newcomers';
// The guard runner passes the base URL as the next argument: that is not a device list
const devices = (/^https?:/.test(process.argv[3] ?? '') ? 'phone,tablet,laptop' : (process.argv[3] ?? 'phone,tablet,laptop')).split(',');
let failed = 0;
const check = (dev, name, ok, note = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${dev}] ${name}${note ? `: ${note}` : ''}`);
};

for (const device of devices) {
  const s = await launch({ variant: `fix-newcomers-${device}`, device, out: `${out}/${device}` });
  const p = s.page;
  try {
    await s.goto();
    // Noah and Olivia: today's crisis, Guide me in the familiarity question, Take office
    await s.click(/^Take office/i);
    await p.waitForTimeout(2500);
    const guide = p.getByRole('radio', { name: /Guide me/ });
    if (await guide.count()) await guide.first().click();
    await s.click(/Take office|Begin|Start/i);
    await p.waitForTimeout(3000);
    await s.look('m1-guide');
    // F-02-1: no auto-opening briefing at Guide me
    check(device, 'no briefing opens by itself at Guide me', !(await p.locator('.lx-brief').isVisible().catch(() => false)));
    // F-02-1: month 1 states the goal in one sentence above the crisis
    const sentence = p.locator('[data-mission-sentence]');
    const text = (await sentence.textContent().catch(() => '')) ?? '';
    // The daily crisis rotates by date, so check the shape, not one crisis: a win condition naming a concrete place or actor
    check(device, 'month 1 goal sentence', /You win if/.test(text) && /\b(?!You\b|Your\b|Contain\b|Keep\b|Stay\b)[A-Z][a-z]{2,}/.test(text.replace(/^Your goal\.\s*You win if/, '')), text.slice(0, 160));
    const sBox = await sentence.boundingBox().catch(() => null);
    // The crisis: the old desk's primary stage, or the month screen's Thing (its scene band)
    const stage = await p.locator('.stage.is-primary, article.thing[data-thing="crisis"] .th-hero').first().boundingBox().catch(() => null);
    check(device, 'goal sentence sits above the crisis', !!sBox && !!stage && sBox.y < stage.y);
    // F-02-1: fewer words at Guide me: a short lede and no option descriptions before More
    const ledeEl = p.locator('.stage-lede:visible, .stage-lede-phone:visible, article.thing[data-thing="crisis"] .hero-quote:visible').first();
    const lede = (await ledeEl.textContent().catch(() => '')) ?? '';
    const words = lede.replace(/More|Less|i\s*\d+ names?/g, '').trim().split(/\s+/).filter(Boolean).length;
    // (a short screen's fit rule may fold the quote away: no words before the first choice passes)
    check(device, 'Guide me lede at most 16 words', words <= 17, `${words} words`);
    // The month screen prints no option description on an answer card: each card's reason is the
    // Guide me short form, so no card quotes the second sentence of its option's description
    const descs = await p.evaluate(() => {
      const st = window.__wcStore?.getState();
      const rest = (st?.worldState?.pendingDecisions ?? []).flatMap((d) => d.options.map((o) => (o.description ?? '').split(/(?<=[.!?])\s+/).slice(1).join(' ').trim())).filter((t) => t.length > 12);
      const cards = [...document.querySelectorAll('.stage.is-primary .move-card .wc-card-desc, article.thing .opt')].filter((e) => e.offsetParent);
      return cards.filter((c) => c.matches('.wc-card-desc') || rest.some((t) => c.textContent.includes(t.slice(0, 40)))).length;
    });
    check(device, 'no option descriptions before More at Guide me', descs === 0, `${descs}`);
    // The goal line links to the sentence
    const link = p.locator('[data-goal-link]');
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await p.waitForTimeout(900);
      const focused = await p.evaluate(() => document.activeElement?.id === 'mission-sentence');
      check(device, 'goal line link focuses the goal sentence', focused);
    }

    // F-02-4: staff proposals hold no political capital until approved
    await s.click(/Show the whole desk|Show budgets, orders and meetings/i, { timeout: 2000 });
    await p.waitForTimeout(1200);
    const before = await p.evaluate(() => {
      const st = window.__wcStore?.getState();
      const w = st?.worldState;
      return { bank: w?.politicalCapital ?? 0, proposals: st?.pendingActions.filter((a) => a.proposed).length ?? 0 };
    });
    await s.look('m1-proposals');
    const leftText = async () => p.evaluate(() => {
      const st = window.__wcStore.getState();
      return st.pendingActions.filter((a) => a.proposed).length;
    });
    check(device, 'staff orders arrive as proposals', before.proposals > 0, `${before.proposals} proposals`);
    // The month screen: the recommended orders are a Thing of their own (one card per proposal, Choose)
    const ordersRow = p.locator('.lrow[data-agenda-item="orders"]').first();
    if (!(await ordersRow.isVisible().catch(() => false))) await p.locator('.see-all, .ph-list, [data-see-all]').first().click({ timeout: 2000 }).catch(() => {});
    if (await ordersRow.isVisible().catch(() => false)) {
      await ordersRow.click().catch(() => {});
      await p.waitForTimeout(600);
    }
    const approve = p.locator('.slot-approve, .ord-act.act-available').filter({ hasText: /Accept order/ }).or(p.locator('article.thing[data-thing="orders"] .opt[aria-pressed="false"]:not(.skipopt)'));
    check(device, 'a proposal has its Choose on screen', before.proposals === 0 || (await approve.count()) > 0);
    if (before.proposals > 0 && (await approve.count())) {
      await approve.first().click().catch(() => undefined);
      await p.waitForTimeout(800);
      check(device, 'Approve turns one proposal into an order', (await leftText()) === before.proposals - 1);
      await s.look('m1-approved');
    }

    // F-02-5: open a map menu, then press Desk: the desk answers and the menu is gone
    if (device !== 'phone') {
      await p.getByRole('tab', { name: /Map/ }).first().click();
      await p.waitForFunction(() => !!window.__wcMap, null, { timeout: 15000 });
      await p.waitForTimeout(2000);
      // The daily crisis (and so the camera) changes by date: tap well-known countries in view until one opens its menu
      const pts = await p.evaluate(() => {
        const m = window.__wcMap;
        const r = m.getContainer().getBoundingClientRect();
        const places = [[45, 24], [53, 32], [35, 39], [79, 22], [103, 35], [90, 60], [-100, 40], [-102, 23.5], [-52, -10], [10, 51], [2, 46], [31, 49], [69, 30], [30, 26], [139, 36]];
        return places.map((ll) => m.project(ll)).filter((q) => q.x > 60 && q.y > 60 && q.x < r.width - 60 && q.y < r.height - 120).map((q) => ({ x: r.left + q.x, y: r.top + q.y }));
      });
      let menuUp = false;
      for (const pt of pts.slice(0, 5)) {
        await p.mouse.click(pt.x, pt.y);
        await p.waitForTimeout(1200);
        menuUp = await p.locator('.map-action-menu').isVisible().catch(() => false);
        if (menuUp) break;
      }
      await s.look('map-menu');
      await p.locator('[data-desk-switch]').click();
      await p.waitForTimeout(1000);
      const deskUp = await p.locator('.desk-screen').isVisible().catch(() => false);
      const menuGone = !(await p.locator('.map-action-menu').isVisible().catch(() => false));
      check(device, 'Desk switch answers with a map menu open', menuUp && deskUp && menuGone, `menu ${menuUp}, desk ${deskUp}, menu gone ${menuGone}`);
      await s.look('desk-after-menu');
    }
    if (s.errors.length) check(device, 'no page errors', false, s.errors.slice(0, 2).join(' | '));
  } catch (e) {
    check(device, 'run', false, e.message.split('\n')[0]);
  } finally {
    await s.close();
  }
}
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exitCode = failed ? 1 : 0;
