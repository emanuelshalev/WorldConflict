// RS-005 (CEO playtest, D-64): "There is a button to approve the staff picks, but it is unclear what
// these are. In map mode especially ... nothing related visible." At laptop and phone widths, in Desk
// and Map mode, before anything is pressed: a group titled "Staff picks" and its listed picks are on
// screen next to the Approve control, and the button names its count ("Approve 7 staff picks") and
// what it covers. In Map mode on a phone the list starts folded: the button then only unfolds it
// (a disclosure that approves nothing). Approving leaves the button disabled with a visible reason.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/RS-005.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('RS-005');
const APPROVE = /^Approve (\d+) staff picks?\b/;

/** Is the element's box fully inside the viewport? */
async function onScreen(page, loc) {
  if (!(await loc.isVisible().catch(() => false))) return false;
  const box = await loc.boundingBox();
  const vp = page.viewportSize();
  return !!box && !!vp && box.y >= 0 && box.x >= 0 && box.y + box.height <= vp.height + 1 && box.x + box.width <= vp.width + 1;
}

/** The checks shared by every surface: title, picks and a counted Approve, together on screen. */
async function checkGroup(g, page, where) {
  const main = page.getByRole('button', { name: APPROVE }).first();
  await main.scrollIntoViewIfNeeded().catch(() => {});
  const name = ((await main.getAttribute('aria-label').catch(() => null)) ?? (await main.innerText().catch(() => ''))).replace(/\s+/g, ' ').trim();
  const n = Number(APPROVE.exec(name)?.[1] ?? 0);
  g.check(n > 0, `${where}: the Approve button names a count ("${name.slice(0, 60)}")`);
  g.check(await onScreen(page, main), `${where}: the Approve button is on screen`);
  const group = page.locator('[data-staff-picks]').filter({ has: main }).first();
  const title = group.getByRole('heading', { name: /^Staff picks/ }).first();
  g.check(await onScreen(page, title), `${where}: a group titled "Staff picks" is on screen with the button`);
  const items = group.locator('.sp-item');
  const counted = await group.locator('.sp-item:not(.is-off)').count();
  g.check(counted === n, `${where}: the list holds the ${n} picks the button counts (${counted})`);
  let seen = 0;
  for (let i = 0; i < Math.min(await items.count(), 3); i++) if (await onScreen(page, items.nth(i))) seen++;
  g.check(seen > 0, `${where}: listed picks are visible next to Approve (${seen} on screen)`);
  const first = items.first();
  const firstText = (await first.innerText().catch(() => '')).replace(/\s+/g, ' ');
  g.check(/^(Cabinet pick|Order|Meeting|Deputy takes):/.test(firstText), `${where}: each pick says what it is ("${firstText.slice(0, 50)}")`);
  g.check(
    (await first.getByRole('button', { name: /^Approve / }).count()) > 0 && (await first.getByRole('button', { name: /^Change\b/ }).count()) > 0,
    `${where}: each pick has its own Approve and Change`,
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
    g.check(/suggestions for this month/i.test(why), `${device} desk: first use explains what staff picks are`);
    await s.look(`${device}-desk`);
    if (device === 'phone') {
      await p.locator('.bar-plan').click();
      await p.waitForTimeout(400);
    }

    // Map mode
    g.check(await toMap(p), `${device}: Map mode opens with the command strip`);
    const folded = p.getByRole('button', { name: /^Show (\d+) staff picks?/ }).first();
    if (await folded.isVisible().catch(() => false)) {
      // A disclosure, not a hidden action: it names the count, unfolds the list and approves nothing
      const fname = (await folded.innerText()).replace(/\s+/g, ' ');
      g.check((await folded.getAttribute('aria-expanded')) === 'false', `${device} map: the folded button is a disclosure ("${fname.slice(0, 40)}")`);
      g.check(!(await p.getByRole('button', { name: APPROVE }).first().isVisible().catch(() => false)), `${device} map: no Approve is pressable while the list is folded`);
      await folded.click();
      await p.waitForTimeout(600);
    } else g.check(device !== 'phone', `${device} map: ${device === 'phone' ? 'the list starts folded on a phone (the globe keeps its room)' : 'the list is open next to Approve on a large screen'}`);
    const map = await checkGroup(g, p, `${device} map`);
    g.check(map.n === desk.n, `${device}: Desk and Map count the same picks (${desk.n} / ${map.n})`);
    await s.look(`${device}-map`);
    await map.main.click();
    await p.waitForTimeout(800);
    const off = p.locator('[data-staff-picks] .sp-main').first();
    const offText = (await off.innerText().catch(() => '')).replace(/\s+/g, ' ');
    g.check((await off.isDisabled().catch(() => false)) && /Nothing to approve/i.test(offText), `${device} map: after Approve the button is disabled with a reason ("${offText.slice(0, 60)}")`);
    g.check(s.errors.length === 0, `${device}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
