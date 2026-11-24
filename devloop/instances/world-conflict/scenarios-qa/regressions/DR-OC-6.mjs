// DR-OC-6 (design review 4 of the order cards, condition C4, carried from the re-review; owner
// build-agenda-layout): on the phone the order list showed 4 to 5 whole order rows at 390x844 and 3 at
// 360x740, under the design's 6 (design-order-cards.md section 5): the chrome above the list took too
// much of the screen. Iteration 4 phone tree (PhoneMonth): what floats over the list is the sticky
// top (state line, thing line with Back, See all and the Desk / Map switch), the sticky bottom bar
// (cue, Next, or Execute), the coach bubble when one shows and a sheet when one is open.
// Guard, on Ceasefire or Collapse as Ukraine, month 1, All orders (from See all):
//  - rows counted where the player really sees them: whole between the sticky top and the bottom bar
//    and on top at their centre, four corners and button (elementFromPoint), not rows in the layout box;
//  - 390x844: at least 6 such rows with no target (Diplomacy group at the top of the list) and with
//    target Russia (Military group at the top, the reviewer's screen), before and after the player
//    adds an order of their own (Mobilize forces; the coach moves on);
//  - floors against regression where rows carry a reason line (an unavailable order explains itself,
//    up to 128 px a row) and 6 do not fit: Russia with Diplomacy at the top at 390x844 (5), the fewest
//    rows over a sweep of the whole list in 24 px steps at 390x844 (3; was 2), and 360x740 with Russia,
//    Military or Diplomacy at the top (4; was 4 and 3);
// Before the fix (sticky top 216 px: the thing line was three rows, the switch on its own) Russia at
// the Military group showed 5 rows, 360x740 at Diplomacy 3, and the state line ran 126 px off the
// right edge (the State button could not be reached, the page slid sideways).
//  - the page never scrolls sideways (a phone page that does slides the whole screen off its left edge).
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-OC-6.mjs <outDir> <baseUrl> <apiUrl>
import { args, openAllOrders, phoneList, phoneScrollToFamily, run, startGame } from './_lib.mjs';

const { out, base } = args('DR-OC-6');
const SEAT = { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' };
const MIN_ROWS = 6;
const MIN_ROWS_REASONS = 5;
const MIN_SWEEP = 3;
const MIN_ROWS_360 = 4;

/** The fewest whole, uncovered rows over the list, scrolled in 24 px steps from its first group to its end. */
async function sweep(p) {
  let min = Number.POSITIVE_INFINITY;
  let at = 0;
  const range = await p.evaluate(() => {
    const g = document.querySelector('.game');
    const cat = document.querySelector('[data-order-catalog] .ord-cat');
    const last = [...document.querySelectorAll('[data-order-catalog] .ord-cat .ord-wrap')].at(-1);
    const top = document.querySelector('.game-top').getBoundingClientRect().bottom;
    const bar = document.querySelector('.ph-bottom').getBoundingClientRect().top;
    const from = g.scrollTop + cat.getBoundingClientRect().top - top;
    const to = Math.min(g.scrollHeight - g.clientHeight, g.scrollTop + last.getBoundingClientRect().bottom - bar);
    return [Math.round(from), Math.round(to)];
  });
  for (let y = range[0]; y <= range[1]; y += 24) {
    await p.evaluate((y) => document.querySelector('.game').scrollTo(0, y), y);
    await p.waitForTimeout(40);
    const m = await phoneList(p);
    if (m.whole < min) {
      min = m.whole;
      at = y;
    }
  }
  await p.evaluate((y) => document.querySelector('.game').scrollTo(0, y), at);
  await p.waitForTimeout(200);
  return { min, at, range: range.join('..') };
}

await run('DR-OC-6', async (g, track) => {
  const s = track(await startGame({ variant: 'dr-oc-6', device: 'phone', out, base, seat: SEAT }));
  const p = s.page;
  await p.setViewportSize({ width: 390, height: 844 });
  if (!g.check(await openAllOrders(s), 'phone: All orders opens from the month')) return;
  await p.waitForTimeout(800);
  if (!g.check(await p.locator('[data-order-catalog]').first().isVisible().catch(() => false), 'phone: the catalogue is shown')) return;

  const count = async (tag, fam) => {
    await phoneScrollToFamily(p, fam);
    const m = await phoneList(p);
    await s.look(tag.replace(/[^\w]+/g, '-'));
    return m;
  };
  const report = (m) => `${m.whole} in ${m.top}..${m.bottom}; ${m.heights} px${m.floaters.length ? `; over it: ${m.floaters.join(', ')}` : ''}`;

  let m = await count('390x844 no target', 'diplo');
  g.check(m.whole >= MIN_ROWS, `390x844, no target, Diplomacy at the top: at least ${MIN_ROWS} whole, uncovered rows (${report(m)})`);
  g.check(!m.hscroll, '390x844: the page does not scroll sideways');

  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type('Russia');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  m = await count('390x844 russia military', 'mil');
  g.check(m.whole >= MIN_ROWS, `390x844, Russia, Military at the top: at least ${MIN_ROWS} whole, uncovered rows (${report(m)})`);
  const sw = await sweep(p);
  await s.look('390x844-russia-sweep-fewest');
  g.check(sw.min >= MIN_SWEEP, `390x844, Russia: over the whole list (scroll ${sw.range}, 24 px steps) never fewer than ${MIN_SWEEP} whole rows (fewest ${sw.min} at ${sw.at})`);

  // One order of the player's own: the coach moves on (step 3 on the desktop's Execute)
  const mob = p.locator('[data-order-catalog] .ord-wrap[data-order-id="mobilize"]').first();
  await mob.locator('.ord-act').scrollIntoViewIfNeeded();
  await mob.locator('.ord-act').click();
  await p.waitForTimeout(1200);
  g.check((await mob.getAttribute('data-order-state')) === 'queued', 'Mobilize forces is in this month');
  m = await count('390x844 russia military one order', 'mil');
  g.check(m.whole >= MIN_ROWS, `390x844, Russia, one order added, Military at the top: at least ${MIN_ROWS} whole, uncovered rows (${report(m)})`);
  m = await count('390x844 russia diplomacy one order', 'diplo');
  g.check(m.whole >= MIN_ROWS_REASONS, `390x844, Russia, one order added, Diplomacy at the top (rows with reasons): at least ${MIN_ROWS_REASONS} whole, uncovered rows (${report(m)})`);

  await p.setViewportSize({ width: 360, height: 740 });
  await p.waitForTimeout(1000);
  m = await count('360x740 russia military one order', 'mil');
  g.check(m.whole >= MIN_ROWS_360, `360x740, Russia, one order added, Military at the top: at least ${MIN_ROWS_360} whole, uncovered rows (${report(m)})`);
  m = await count('360x740 russia diplomacy one order', 'diplo');
  g.check(m.whole >= MIN_ROWS_360, `360x740, Russia, one order added, Diplomacy at the top: at least ${MIN_ROWS_360} whole, uncovered rows (${report(m)})`);
  g.check(!m.hscroll, '360x740: the page does not scroll sideways');

  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);
});
