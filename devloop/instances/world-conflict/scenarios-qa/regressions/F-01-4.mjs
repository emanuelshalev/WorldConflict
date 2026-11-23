// F-01-4 (iteration 1 triage, "too much at once", Olivia/Ruth/Noah): month 1 shows only the
// crisis, its option cards and Execute; advisors, budgets and meetings wait behind "Show the whole
// desk" and appear when asked. Also F-00-4 (dashboard feel): every option card is illustrated and
// its title is never cut off. Iteration 4 (D-80, design-agenda 0.12): month 1's List holds only the
// crisis and the recommended orders and names the meetings the ministers take; "See the meetings
// anyway" brings the meetings, your own orders (the advisors' order ideas) and the meeting and
// defense budgets. The answer cards are one button each (text, D9); the thing is illustrated by its
// scene (on short tablets a text header, design-layout L-8 step 5). Phones keep Execute for the
// review screen (AC-21).
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('F-01-4');
const visibleCount = (p, sel) =>
  p.$$eval(sel, (els) =>
    els.filter((e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    }).length,
  );

await run('F-01-4', async (g, track) => {
  for (const device of ['laptop', 'phone']) {
    const s = track(await startGame({ variant: `f014-${device}`, device, out: path.join(out, device), base }));
    const p = s.page;
    await s.look(`${device}-month1`);
    g.check((await visibleCount(p, '[data-thing="crisis"]')) === 1, `${device}: one crisis on stage`);
    g.check((await visibleCount(p, '[data-thing="crisis"] .th-hero .scene')) === 1, `${device}: the crisis is illustrated by its scene (F-00-4)`);
    const cards = await p.$$eval('[data-thing="crisis"] .opt:not(.skipopt)', (els) =>
      els.map((e) => {
        const t = e.querySelector('.opt-name');
        return { title: t?.textContent?.trim() ?? '', cut: t ? t.scrollWidth > t.clientWidth + 1 : true };
      }),
    );
    g.check(cards.length >= 2, `${device}: the crisis offers its option cards (${cards.length})`);
    g.check(cards.every((c) => c.title && !c.cut), `${device}: no option title is cut off (${cards.filter((c) => c.cut).map((c) => c.title).join(', ') || 'none'})`);
    const band = () => p.locator('[data-region="state"]').first().innerText().catch(() => '');
    if (device === 'phone') g.check(await p.locator('.ph-bottom .ph-next').first().isVisible(), `${device}: Next is there (Execute waits on the review screen)`);
    else g.check(await p.getByRole('button', { name: /Execute month/i }).first().isVisible(), `${device}: Execute month is there`);
    g.check((await visibleCount(p, '.adv-row')) === 0, `${device}: no advisor rows in month 1`);
    if (device === 'laptop') g.check(!/Meetings|Defense/.test(await band()), `${device}: no meeting or defense budget in month 1`);
    // Meetings are not things to do in month 1: the List names them instead
    if (!(await p.locator('[data-agenda]').first().isVisible().catch(() => false))) await p.locator('.see-all').first().click();
    await p.waitForTimeout(400);
    const meetings = await p.locator('[data-agenda-item="meeting"], [data-agenda-item="meetings"]').count();
    g.check(meetings === 0, `${device}: no meetings to do in month 1 (${meetings})`);
    g.check(/Your ministers take this month's \d+ meetings?/.test(await p.locator('[data-agenda]').first().innerText()), `${device}: the List names the meetings the ministers take`);
    // The rest is one tap away
    const show = p.locator('[data-show-desk]').first();
    g.check(await show.isVisible(), `${device}: "See the meetings anyway" is offered`);
    await show.click();
    await p.waitForTimeout(900);
    g.check((await p.locator('[data-agenda-item="meeting"], [data-agenda-item="meetings"]').count()) >= 1, `${device}: it brings the meetings`);
    if (!(await p.locator('[data-agenda-item="own"]').first().isVisible().catch(() => false))) await p.locator('.see-all').first().click().catch(() => {});
    await p.locator('[data-agenda-item="own"]').first().click();
    await p.waitForTimeout(700);
    g.check((await visibleCount(p, '.adv-row')) >= 1, `${device}: and your own orders bring the advisors' order ideas`);
    if (device === 'laptop') g.check(/Meetings/.test(await band()), `${device}: and the meeting budget`);
    await s.look(`${device}-whole-desk`);
    g.check(!s.errors.length, `${device}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
