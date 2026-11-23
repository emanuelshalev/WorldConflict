// RS-005 (CEO playtest, D-64): "There is a button to approve the staff picks, but it is unclear what
// these are. In map mode especially ... nothing related visible." Words D-71/D-72/D-73: "Recommended",
// one verb "Choose" (the bulk button "Choose all recommended", which defines itself in a line under
// it; each recommendation row has Open, which goes to its thing, D-72 D8). At laptop and phone widths,
// in Desk and Map mode, before anything is pressed: a group titled "Recommended" and its listed
// recommendations (each "Recommended by <adviser>") are on screen next to the Choose all control,
// and the button names its count ("Choose all recommended (7)"). On a laptop in Map mode, and on
// phones, the list starts behind "Review 7 recommended", a disclosure that chooses nothing.
// Choosing leaves the button disabled with a visible reason.
// QA3-S3-3 (superseded by the fit rule, design-layout L-10, D-80): at 1440 x 900 the Plan keeps
// Execute, Choose all and the "Recommended" title fully on screen with no scroll box; a folded
// section shows its count and summary, and Show opens it with every row and its Open reachable.
// F-02-4: one count of orders this month (the state band), never the unchosen proposals.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/RS-005.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { args, run, startGame, toPhoneReview } from './_lib.mjs';

const { out, base } = args('RS-005');
const CHOOSE = /^Choose all recommended \((\d+)\)/;

/** Is the element's box fully inside the viewport? */
async function onScreen(page, loc) {
  if (!(await loc.isVisible().catch(() => false))) return false;
  const box = await loc.boundingBox();
  const vp = page.viewportSize();
  return !!box && !!vp && box.y >= 0 && box.x >= 0 && box.y + box.height <= vp.height + 1 && box.x + box.width <= vp.width + 1;
}

/** Open every folded section of the group (Show), so its rows can be read. */
async function unfold(page, group) {
  const show = group.getByRole('button', { name: /^Show$/ }).first();
  if (await show.isVisible().catch(() => false)) {
    await show.click();
    await page.waitForTimeout(400);
  }
}

/** The checks shared by every surface: title, recommendations and a counted Choose all, together on screen. */
async function checkGroup(g, page, where) {
  const main = page.getByRole('button', { name: CHOOSE }).first();
  const name = ((await main.getAttribute('aria-label').catch(() => null)) ?? (await main.innerText().catch(() => ''))).replace(/\s+/g, ' ').trim();
  const n = Number(CHOOSE.exec(name)?.[1] ?? 0);
  g.check(n > 0, `${where}: the Choose all button names a count ("${name.slice(0, 60)}")`);
  g.check(await onScreen(page, main), `${where}: the Choose all button is on screen`);
  const group = page.locator('[data-staff-picks]').filter({ has: main }).first();
  const title = group.getByRole('heading', { name: /^Recommended\b/ }).first();
  g.check(await onScreen(page, title), `${where}: a group titled "Recommended" is on screen with the button`);
  const def = (await group.locator('.sp-why').first().innerText().catch(() => '')).trim();
  // D-84: the line also says how many of the player's calls it leaves open
  g.check(/^Chooses the recommended answer for every routine thing still to do\.( Your call stays open\.| \d+ of your calls stay open\.)?$/.test(def), `${where}: the button defines itself under it ("${def.slice(0, 90)}")`);
  await unfold(page, group);
  const items = group.locator('.sp-item');
  const counted = await group.locator('.sp-item:not(.is-off)').count();
  g.check(counted === n, `${where}: the list holds the ${n} recommendations the button counts (${counted})`);
  let seen = 0;
  for (let i = 0; i < Math.min(await items.count(), 3); i++) if (await onScreen(page, items.nth(i))) seen++;
  g.check(seen > 0, `${where}: listed recommendations are visible next to Choose all (${seen} on screen)`);
  const firstText = (await items.first().innerText().catch(() => '')).replace(/\s+/g, ' ');
  g.check(/^Recommended by [A-Z][A-Za-z ]+? (Crisis answer|Order|Meeting|Your [A-Za-z ]+ takes):/.test(firstText), `${where}: each one names its adviser and says what it is ("${firstText.slice(0, 60)}")`);
  const byAll = await items.locator('.sp-by').allInnerTexts();
  g.check(byAll.length === (await items.count()) && byAll.every((t) => /^Recommended by \S/.test(t)), `${where}: every recommendation is "Recommended by <adviser>", never bare`);
  g.check(
    (await items.first().getByRole('button', { name: /^Open/ }).count()) > 0 && (await group.getByRole('button', { name: /^Accept\b/ }).count()) === 0,
    `${where}: each recommendation has Open (one way to decide: Choose on its thing), no Accept`,
  );
  return { main, n };
}

/** QA3-S3-3 under the fit rule: everything that must act is on screen, no scroll box, Show opens a fold. */
async function checkPlanFits(g, page) {
  const where = 'laptop 1440x900 plan';
  const exec = page.getByRole('button', { name: /Execute month/i }).first();
  g.check(await onScreen(page, exec), `${where}: Execute is fully on screen`);
  const m = await page.evaluate(() => {
    const plan = document.querySelector('[data-region="plan"]');
    if (!plan) return null;
    const scrollers = [...plan.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el);
      return /auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
    }).length;
    const items = [...plan.querySelectorAll('.sp-item')].map((it) => {
      const btn = it.querySelector('button');
      const b = btn?.getBoundingClientRect();
      const top = b ? document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) : null;
      return { name: (it.querySelector('.sp-name')?.textContent ?? '').trim().slice(0, 30), tappable: !!btn && !!top && (top === btn || btn.contains(top)) && b.bottom <= innerHeight };
    });
    return { form: plan.getAttribute('data-form'), scrollers, items, folded: !!plan.querySelector('.psec-tog') };
  });
  g.check(!!m && m.form === 'rail', `${where}: the Plan is the rail (${m?.form})`);
  if (!m) return;
  g.check(m.scrollers === 0, `${where}: nothing in the Plan scrolls (${m.scrollers} scroll boxes)`);
  g.check(m.items.every((x) => x.tappable), `${where}: every listed recommendation's Open answers a tap (${m.items.filter((x) => !x.tappable).map((x) => x.name).join(', ') || `${m.items.length} rows`})`);
  g.check(await onScreen(page, page.locator('[data-region="plan"] [data-choose-all]').first()), `${where}: Choose all stays on screen`);
  g.check(await onScreen(page, page.locator('[data-region="plan"] .sp-heading').first()), `${where}: the title "Recommended" stays on screen`);
}

async function toMap(page) {
  await page.keyboard.press('m');
  await page.waitForTimeout(800);
  if (!(await page.locator('.map-month').isVisible().catch(() => false))) {
    await page.getByRole('tab', { name: /^Map\b/ }).first().click().catch(() => {});
    await page.waitForTimeout(800);
  }
  return page.locator('.map-month').isVisible().catch(() => false);
}

/** "Review n recommended": a disclosure that names the count, opens the list and chooses nothing. */
async function checkFolded(g, page, where) {
  const folded = page.getByRole('button', { name: /^Review (\d+) recommended/ }).first();
  g.check(await folded.isVisible().catch(() => false), `${where}: the list starts behind "Review n recommended"`);
  if (!(await folded.isVisible().catch(() => false))) return;
  const fname = (await folded.innerText()).replace(/\s+/g, ' ');
  g.check((await folded.getAttribute('aria-expanded')) === 'false', `${where}: the folded button is a disclosure ("${fname.slice(0, 40)}")`);
  g.check(!(await page.getByRole('button', { name: CHOOSE }).first().isVisible().catch(() => false)), `${where}: no Choose all is pressable while the list is folded`);
  g.check(!(await folded.evaluate((el) => el.classList.contains('primary'))), `${where}: "Review" is not styled like Execute`);
  await folded.click();
  await page.waitForTimeout(600);
}

await run('RS-005', async (g, track) => {
  for (const device of ['laptop', 'phone']) {
    const s = track(await startGame({ variant: `rs005-${device}`, device, out: path.join(out, device), base }));
    const p = s.page;
    // Desk mode: the laptop's Plan rail; the phone's review screen (its Plan, the only Execute)
    if (device === 'phone') await toPhoneReview(p);
    await p.waitForTimeout(600);
    const desk = await checkGroup(g, p, `${device} desk`);
    // The line under the button defines it (D-73), and names the calls it leaves open (D-84)
    const why = await p.locator('.sp-why').first().innerText().catch(() => '');
    g.check(/^Chooses the recommended answer for every routine thing still to do\.( (Your call stays open|\d of your calls stay open)\.)?$/.test(why.trim()), `${device} desk: first use explains what Choose all recommended does ("${why.trim().slice(0, 120)}")`);
    await s.look(`${device}-desk`);
    if (device === 'laptop') {
      await checkPlanFits(g, p);
      // F-02-4: one count of orders this month, in the state band, chosen orders only
      const band = (await p.locator('[data-region="state"]').innerText().catch(() => '')).replace(/\s+/g, ' ');
      g.check(/Orders 0 of 6/.test(band), `${device}: the state band counts chosen orders only, not the recommended ones ("${/Orders \d+ of 6/.exec(band)?.[0]}")`);
    }
    // Map mode
    g.check(await toMap(p), `${device}: Map mode opens`);
    await checkFolded(g, p, `${device} map`);
    const map = await checkGroup(g, p, `${device} map`);
    g.check(map.n === desk.n, `${device}: Desk and Map count the same recommendations (${desk.n} / ${map.n})`);
    await s.look(`${device}-map`);
    await map.main.click();
    await p.waitForTimeout(800);
    const off = p.locator('[data-staff-picks] .sp-main').first();
    const offText = (await off.innerText().catch(() => '')).replace(/\s+/g, ' ');
    // design-review-your-call.md RC-1: with a call Choose all leaves open, the reason names it
    // ("Nothing else to choose. Still open: ..."); "Nothing to choose" only when none is open
    g.check((await off.isDisabled().catch(() => false)) && /Nothing (else )?to choose/i.test(offText), `${device} map: after Choose all the button is disabled with a reason ("${offText.slice(0, 90)}")`);
    g.check(s.errors.length === 0, `${device}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
