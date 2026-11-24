// F-00-1 (iteration 0 triage; QA repro #4; RS-001 "blocked, same message, unclear reason"):
// an order the player cannot give always says why on its card, before any tap, with a fix,
// and pressing it anyway queues nothing and raises no toast or native dialog.
// Repro (runs/iter-00/qa-repro.md #4, leo-stream): All orders, every targeted order was dimmed with no reason.
// F-04-1 (iteration 4): the month screen's answer cards too. HC-ARE-NOAH1 month 2 at ◆ 0, 1920x1080:
// Choose on "Order: National address · ◆ 1" did nothing and said nothing on the card.
import path from 'node:path';
import { apiSave, args, forEachFamily, openAllOrders, openSaved, openThing, run, showCatalogCard, startGame } from './_lib.mjs';

const { out, base, api } = args('F-00-1');

/** The answer cards of the open month item: Choose live or not, and the card's words. */
const answerCards = (p) =>
  p.$$eval('article.thing .opts button.opt', (els) =>
    els.map((e) => ({ off: e.disabled, name: e.getAttribute('aria-label') ?? '', off2: (e.querySelector('.opt-off')?.textContent ?? '').trim(), text: e.innerText.replace(/\s+/g, ' ') })),
  );

/** Every card on the order list that is not available or queued, with its reason and a11y name. */
const blockedCards = (p) =>
  p.$$eval('[data-order-catalog] [data-order-id][data-order-state]', (els) =>
    els
      .filter((e) => !['available', 'queued'].includes(e.dataset.orderState))
      .map((e) => ({
        id: e.dataset.orderId,
        state: e.dataset.orderState,
        code: e.dataset.orderCode ?? '',
        reason: (e.querySelector('.ord-reason-text')?.textContent ?? '').trim(),
        name: e.querySelector('.wc-card-hit')?.getAttribute('aria-label') ?? '',
        text: e.innerText.replace(/\s+/g, ' '),
      })),
  );

await run('F-00-1', async (g, track) => {
  const s = track(await startGame({ variant: 'f001', device: 'laptop', out, base }));
  const p = s.page;
  let dialogs = 0;
  p.on('dialog', () => dialogs++);
  // Iteration 4: All orders opens from the month's List (Your own orders; month 1: its panel)
  if (!(await openAllOrders(s))) throw new Error('no All orders');
  await p.locator('[data-order-catalog]').first().waitFor();
  await p.waitForTimeout(800);

  // No target yet: every targeted card asks for one, with the fix on the card
  // Wider than a phone All orders shows one family at a time (DR-MS-1): read every family's tab
  const allBlocked = async () => (await forEachFamily(p, () => blockedCards(p))).flat();
  let cards = await allBlocked();
  const needs = cards.filter((c) => c.code === 'NEEDS_TARGET');
  g.check(needs.length >= 10, `no target: ${needs.length} targeted cards ask for a country`);
  g.check(needs.every((c) => /Pick a country first\./.test(c.reason) && /Pick a country/.test(c.text.replace(c.reason, ''))), 'no target: each says "Pick a country first." and offers Pick a country');

  // Pick Iran (at war with the United States): every blocked card names its reason
  await p.locator('[data-order-catalog] [data-country-picker]').first().click();
  const search = p.getByRole('combobox', { name: /Search countries/i });
  await search.fill('iran');
  await p.waitForTimeout(300);
  await search.press('Enter');
  await p.waitForTimeout(1200);
  cards = await allBlocked();
  g.check(cards.length >= 3, `Iran picked: ${cards.length} cards are blocked (${cards.map((c) => `${c.id}:${c.code}`).join(', ')})`);
  for (const c of cards) {
    g.check(c.reason.length >= 8 && !/^undefined|null$/.test(c.reason), `${c.id} (${c.code}) shows a reason on the card: "${c.reason}"`);
    g.check(c.name.includes(`unavailable: ${c.reason}`), `${c.id}: its accessible name carries the reason`);
  }
  await s.look('blocked-with-reasons', { full: false });

  // Pressing a blocked card anyway: nothing queued, no toast, no native dialog
  const queuedNow = async () => (await forEachFamily(p, () => p.locator('[data-order-catalog] [data-order-state="queued"]').count())).reduce((a, b) => a + b, 0);
  const queuedBefore = await queuedNow();
  for (const c of cards.slice(0, 4)) {
    await showCatalogCard(p, `[data-order-id="${c.id}"]`);
    await p.locator(`[data-order-catalog] [data-order-id="${c.id}"] .wc-card-hit`).first().dispatchEvent('click');
    await p.waitForTimeout(250);
  }
  await p.waitForTimeout(500);
  g.check((await queuedNow()) === queuedBefore, 'pressing blocked cards queues nothing');
  g.check((await p.locator('.toast:visible').count()) === 0, 'no toast for a predictable refusal');
  g.check(dialogs === 0, `no native dialog (${dialogs})`);
  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);

  // F-04-1: Noah's month 2 at 1920x1080, every ◆ spent (Choose all recommended, then Reform from
  // All orders): the mission move and a crisis answer that costs ◆ say so on the card, before a press
  const sv = await apiSave(api, 1, { countryId: 'ARE', flashpointId: 'hormuz-convoy', seedCode: 'HC-ARE-NOAH1' }, 'f001');
  const n = await openSaved(base, '1920x1080', sv);
  track({ page: n.page, out, close: () => n.browser.close() });
  const q = n.page;
  await q.getByRole('button', { name: /^Choose all recommended/ }).first().click();
  await q.waitForTimeout(600);
  g.check(await openAllOrders({ page: q }), 'Noah month 2: All orders opens');
  await q.locator('[data-order-catalog]').first().waitFor();
  await showCatalogCard(q, '[data-order-id="reform"]');
  await q.locator('[data-order-catalog] [data-order-id="reform"] .wc-card-hit').first().click();
  await q.waitForTimeout(1000);
  const band = ((await q.locator('body').innerText()).match(/Political capital left ◆ (\d+)/) ?? [])[1];
  g.check(band === '0', `Noah month 2: the band reads ◆ 0 left (${band})`);
  await q.keyboard.press('Escape');
  await q.waitForTimeout(400);
  g.check(await openThing(q, 'The move for your mission'), 'the mission move opens');
  const move = (await answerCards(q)).filter((c) => /Order: .* · ◆ \d/.test(c.text) && !/Your choice/.test(c.text));
  g.check(move.length >= 1, `the move has ${move.length} priced order card(s)`);
  for (const c of move) {
    g.check(c.off, `move card is not live at ◆ 0: ${c.text.slice(0, 70)}`);
    g.check(/Needs ◆ \d+, you have ◆ 0\./.test(c.off2) && /Remove an order \(frees ◆ \d+\)/.test(c.off2), `on the card: cost, what you have, the fix ("${c.off2}")`);
    g.check(c.name.includes('Needs ◆'), 'its accessible name carries the reason');
  }
  g.check((await q.locator('article.thing [data-fix]').count()) >= 1, 'a Remove control sits beside the card (the fix of the order cards)');
  await n.page.screenshot({ path: path.join(out, 'f041-move-at-0.png') });
  g.check(await openThing(q, 'Incident with Sudan'), 'the crisis opens');
  const priced = (await answerCards(q)).filter((c) => /costs ◆ \d+/.test(c.text) && !/less than|as much as/.test(c.text) && !/Your choice/.test(c.text));
  g.check(priced.length >= 1, `the crisis has ${priced.length} answer(s) that cost ◆`);
  for (const c of priced) g.check(c.off && /Needs ◆ \d+, you have ◆ 0\./.test(c.off2), `crisis answer not live, reason on the card: ${c.text.slice(0, 60)}`);
  // pressing one anyway changes nothing
  const before = (await q.locator('body').innerText()).match(/Political capital left ◆ \d+/)?.[0];
  await q.locator('article.thing .opts button.opt:disabled').first().dispatchEvent('click');
  await q.waitForTimeout(300);
  g.check((await q.locator('body').innerText()).match(/Political capital left ◆ \d+/)?.[0] === before, 'pressing it anyway changes nothing');
  g.check(!n.errors.length, `Noah month 2: no page errors (${n.errors.slice(0, 2).join(' | ')})`);
});
