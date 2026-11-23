// F-00-1 (iteration 0 triage; QA repro #4; RS-001 "blocked, same message, unclear reason"):
// an order the player cannot give always says why on its card, before any tap, with a fix,
// and pressing it anyway queues nothing and raises no toast or native dialog.
// Repro (runs/iter-00/qa-repro.md #4, leo-stream): All orders, every targeted order was dimmed with no reason.
import path from 'node:path';
import { args, openAllOrders, run, startGame } from './_lib.mjs';

const { out, base } = args('F-00-1');

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
  let cards = await blockedCards(p);
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
  cards = await blockedCards(p);
  g.check(cards.length >= 3, `Iran picked: ${cards.length} cards are blocked (${cards.map((c) => `${c.id}:${c.code}`).join(', ')})`);
  for (const c of cards) {
    g.check(c.reason.length >= 8 && !/^undefined|null$/.test(c.reason), `${c.id} (${c.code}) shows a reason on the card: "${c.reason}"`);
    g.check(c.name.includes(`unavailable: ${c.reason}`), `${c.id}: its accessible name carries the reason`);
  }
  await s.look('blocked-with-reasons', { full: false });

  // Pressing a blocked card anyway: nothing queued, no toast, no native dialog
  const queuedBefore = await p.locator('[data-order-catalog] [data-order-state="queued"]').count();
  for (const c of cards.slice(0, 4)) {
    await p.locator(`[data-order-catalog] [data-order-id="${c.id}"] .wc-card-hit`).first().dispatchEvent('click');
    await p.waitForTimeout(250);
  }
  await p.waitForTimeout(500);
  g.check((await p.locator('[data-order-catalog] [data-order-state="queued"]').count()) === queuedBefore, 'pressing blocked cards queues nothing');
  g.check((await p.locator('.toast:visible').count()) === 0, 'no toast for a predictable refusal');
  g.check(dialogs === 0, `no native dialog (${dialogs})`);
  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);
});
