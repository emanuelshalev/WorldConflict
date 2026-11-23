// F-00-13 / B-09 (iteration 0 triage, QA repro #3, dan-term): Enter in the order search never
// queues an irreversible order. Enter on "Declare war" or "Nuclear strike" opens the in-card
// confirm face (no native dialog) focused on the safe answer; a second Enter cancels; nothing is queued.
// Dan typed "nuclear strike india" (Water War as Pakistan, at peace with India) and Enter queued
// the first hit, "Strike nuclear sites in India", an act of war, at once.
import { args, openAllOrders, run, startGame } from './_lib.mjs';

const DAN = { flashpointId: 'water-war', countryId: 'PAK', title: 'Water War', seed: 4242 };

const { out, base } = args('F-00-13');

await run('F-00-13', async (g, track) => {
  const s = track(await startGame({ variant: 'f0013', device: 'laptop', out, base, seat: DAN }));
  const p = s.page;
  let dialogs = 0;
  p.on('dialog', () => dialogs++);
  // Free capital so every war order is affordable: remove a recommended order (the month's
  // "Recommended orders" thing; proposals hold nothing since F-02-4, so this is belt and braces)
  const removes = () => p.getByRole('button', { name: /^Remove / }).count();
  if (!(await p.locator('[data-agenda-item="orders"]').first().isVisible().catch(() => false))) await p.locator('.see-all').first().click().catch(() => {});
  await p.locator('[data-agenda-item="orders"]').first().click().catch(() => {});
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: /^Remove / }).first().click().catch(() => {});
  await p.waitForTimeout(800);
  if (!(await openAllOrders(s))) throw new Error('no All orders');
  const box = p.locator('#catalog-search');
  await box.waitFor();
  const before = await removes();

  // Each case: the search, and the confirm face it must raise instead of queueing
  for (const [query, kind] of [
    // Dan's words: the first hit is the strike on nuclear sites, an act of war (its face may lead
    // with the mission warning, which also has to be confirmed)
    ['nuclear strike india', /^(war|mission)$/],
    ['declare war india', /^war$/],
  ]) {
    await box.fill(query);
    await p.waitForTimeout(900);
    const first = (await p.locator('#ord-hits [role="option"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    await box.press('Enter');
    await p.waitForTimeout(600);
    const face = p.locator('[data-order-catalog] [data-confirm]');
    const faces = await face.count();
    const faceKind = faces ? await face.first().getAttribute('data-confirm') : null;
    g.check(faces === 1, `"${query}" + Enter opens a confirm face (first hit "${first.slice(0, 60)}", face ${faceKind})`);
    g.check(kind.test(faceKind ?? ''), `"${query}": the face is a ${kind} confirm (${faceKind})`);
    g.check((await removes()) === before, `"${query}": Enter queued nothing`);
    const focus = await p.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
    g.check(/Keep the peace|Cancel|Not now/i.test(focus), `"${query}": focus is on the safe answer ("${focus}")`);
    await s.look(`confirm-${query.replace(/\W+/g, '-')}`);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(600);
    g.check((await p.locator('[data-order-catalog] [data-confirm]').count()) === 0, `"${query}": the face closes without acting`);
    g.check((await removes()) === before, `"${query}": still nothing queued after cancelling`);
  }
  // A plain refusal from search: Enter on an invalid first hit queues nothing either
  await box.fill('nuclear strike on india'); // the real nuclear strike: only in wartime
  await p.waitForTimeout(900);
  await box.press('Enter');
  await p.waitForTimeout(500);
  g.check((await removes()) === before, 'Enter on an unavailable hit queues nothing');
  g.check(dialogs === 0, `no native dialog (${dialogs})`);
  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);
});
