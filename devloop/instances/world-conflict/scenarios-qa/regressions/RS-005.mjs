// RS-005 (CEO playtest, D-64): "There is a button to approve the staff picks, but it is unclear what
// these are. In map mode especially ... nothing related visible." Words D-71/D-72: "Recommended",
// one verb "Accept". At laptop and phone widths, in Desk and Map mode, before anything is pressed: a
// group titled "Recommended" and its listed recommendations (each "Recommended by <adviser>") are on
// screen next to the Accept control, and the button names its count ("Accept all recommended (7)")
// and what it covers. In Map mode the list starts folded: "Review 7 recommended" only opens it (a
// disclosure that accepts nothing). Accepting leaves the button disabled with a visible reason.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/RS-005.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('RS-005');
const APPROVE = /^Accept all recommended \((\d+)\)/;

/** Is the element's box fully inside the viewport? */
async function onScreen(page, loc) {
  if (!(await loc.isVisible().catch(() => false))) return false;
  const box = await loc.boundingBox();
  const vp = page.viewportSize();
  return !!box && !!vp && box.y >= 0 && box.x >= 0 && box.y + box.height <= vp.height + 1 && box.x + box.width <= vp.width + 1;
}

/** The checks shared by every surface: title, recommendations and a counted Accept, together on screen. */
async function checkGroup(g, page, where) {
  const main = page.getByRole('button', { name: APPROVE }).first();
  await main.scrollIntoViewIfNeeded().catch(() => {});
  const name = ((await main.getAttribute('aria-label').catch(() => null)) ?? (await main.innerText().catch(() => ''))).replace(/\s+/g, ' ').trim();
  const n = Number(APPROVE.exec(name)?.[1] ?? 0);
  g.check(n > 0, `${where}: the Accept button names a count ("${name.slice(0, 60)}")`);
  g.check(await onScreen(page, main), `${where}: the Accept button is on screen`);
  const group = page.locator('[data-staff-picks]').filter({ has: main }).first();
  const title = group.getByRole('heading', { name: /^Recommended\b/ }).first();
  g.check(await onScreen(page, title), `${where}: a group titled "Recommended" is on screen with the button`);
  const items = group.locator('.sp-item');
  const counted = await group.locator('.sp-item:not(.is-off)').count();
  g.check(counted === n, `${where}: the list holds the ${n} recommendations the button counts (${counted})`);
  let seen = 0;
  for (let i = 0; i < Math.min(await items.count(), 3); i++) if (await onScreen(page, items.nth(i))) seen++;
  g.check(seen > 0, `${where}: listed recommendations are visible next to Accept (${seen} on screen)`);
  const first = items.first();
  const firstText = (await first.innerText().catch(() => '')).replace(/\s+/g, ' ');
  g.check(/^Recommended by [A-Z][A-Za-z ]+? (Crisis answer|Order|Meeting|Deputy takes):/.test(firstText), `${where}: each one names its adviser and says what it is ("${firstText.slice(0, 60)}")`);
  const byAll = await items.locator('.sp-by').allInnerTexts();
  g.check(byAll.length === (await items.count()) && byAll.every((t) => /^Recommended by \S/.test(t)), `${where}: every recommendation is "Recommended by <adviser>", never bare`);
  g.check(
    (await first.getByRole('button', { name: /^Accept / }).count()) > 0 && (await first.getByRole('button', { name: /^Change\b/ }).count()) > 0,
    `${where}: each recommendation has its own Accept and Change`,
  );
  const sub = (await main.locator('.sp-main-sub').innerText().catch(() => '')).trim();
  g.check(/\d+ (crisis answers?|orders?|meetings?)/.test(sub), `${where}: the button says what it covers ("${sub.slice(0, 60)}")`);
  return { main, n };
}

async function toMap(page) {
  await page.keyboard.press('m');
  await page.waitForTimeout(600);
  if (!(await page.locator('.cmd-strip').isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /^Map\b/ }).first().click().catch(() => {});
    await page.waitForTimeout(600);
  }
  return page.locator('.cmd-strip').isVisible().catch(() => false);
}

await run('RS-005', async (g, track) => {
  for (const device of ['laptop', 'phone']) {
    // Desk mode
    const s = track(await startGame({ variant: `rs005-${device}`, device, out: path.join(out, device), base }));
    const p = s.page;
    if (device === 'phone') {
      await p.locator('.bar-plan').click();
      await p.waitForTimeout(600);
    } else {
      // Month 1 opens the simple rail (no Approve there); the whole rail carries it
      const more = p.getByRole('button', { name: /Show budgets, orders and meetings/i }).first();
      if (await more.isVisible().catch(() => false)) await more.click();
      await p.waitForTimeout(600);
    }
    const desk = await checkGroup(g, p, `${device} desk`);
    const why = await p.locator('.sp-why').first().innerText().catch(() => '');
    g.check(/^Your advisers recommend these for this month\. Nothing happens until you accept\.$/.test(why.trim()), `${device} desk: first use explains what the recommendations are`);
    await s.look(`${device}-desk`);
    if (device === 'laptop') {
      // F-02-4 (QA): the Full desk navigator counted unapproved proposals ("Orders this month 2 of 6",
      // "2 added by staff") while the rail said 0 of 6. Both count approved orders only.
      await p.getByRole('tab', { name: 'Full desk' }).first().click();
      await p.waitForTimeout(600);
      const navText = (await p.locator('nav.navigator').innerText().catch(() => '')).replace(/\s+/g, ' ');
      const railText = (await p.locator('.budget-tiles').innerText().catch(() => '')).replace(/\s+/g, ' ');
      const navN = /Orders this month (\d+) of 6/.exec(navText)?.[1];
      const railN = /Orders this month (\d+) of 6/.exec(railText)?.[1];
      g.check(navN !== undefined && navN === railN, `${device} full desk: navigator and rail count the same orders (${navN} / ${railN})`);
      g.check(!/added by staff/.test(navText) && /recommended, not accepted/.test(navText), `${device} full desk: proposals are named as proposals, not as added orders`);
      await p.getByRole('tab', { name: 'Focus' }).first().click().catch(() => {});
      await p.waitForTimeout(400);
    }
    if (device === 'phone') {
      await p.locator('.bar-plan').click();
      await p.waitForTimeout(400);
    }

    // Map mode
    g.check(await toMap(p), `${device}: Map mode opens with the command strip`);
    const folded = p.getByRole('button', { name: /^Review (\d+) recommended/ }).first();
    g.check(await folded.isVisible().catch(() => false), `${device} map: the list starts folded behind "Review n recommended" (the globe keeps its room)`);
    if (await folded.isVisible().catch(() => false)) {
      // A disclosure, not a hidden action: it names the count, opens the list and accepts nothing; it
      // must not look like Execute (Execute is the filled primary button)
      const fname = (await folded.innerText()).replace(/\s+/g, ' ');
      g.check((await folded.getAttribute('aria-expanded')) === 'false', `${device} map: the folded button is a disclosure ("${fname.slice(0, 40)}")`);
      g.check(!(await p.getByRole('button', { name: APPROVE }).first().isVisible().catch(() => false)), `${device} map: no Accept all is pressable while the list is folded`);
      g.check(!(await folded.evaluate((el) => el.classList.contains('primary'))), `${device} map: "Review" is not styled like Execute`);
      await folded.click();
      await p.waitForTimeout(600);
    }
    const map = await checkGroup(g, p, `${device} map`);
    g.check(map.n === desk.n, `${device}: Desk and Map count the same picks (${desk.n} / ${map.n})`);
    await s.look(`${device}-map`);
    await map.main.click();
    await p.waitForTimeout(800);
    const off = p.locator('[data-staff-picks] .sp-main').first();
    const offText = (await off.innerText().catch(() => '')).replace(/\s+/g, ' ');
    g.check((await off.isDisabled().catch(() => false)) && /Nothing to accept/i.test(offText), `${device} map: after Accept all the button is disabled with a reason ("${offText.slice(0, 60)}")`);
    g.check(s.errors.length === 0, `${device}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
