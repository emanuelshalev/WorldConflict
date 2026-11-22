// F-01-4 (iteration 1 triage, "too much at once", Olivia/Ruth/Noah): month 1 shows only the
// crisis, its option cards and Execute; advisors, budgets and meetings wait behind "Show the whole
// desk" and appear when asked. Also F-00-4 (dashboard feel): every option card is illustrated and
// its title is never cut off.
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
    g.check((await visibleCount(p, '.stage.is-primary')) === 1, `${device}: one crisis on stage`);
    const cards = await p.$$eval('.stage.is-primary .move-card', (els) =>
      els.map((e) => {
        const t = e.querySelector('.wc-card-title, h3, h4');
        return { scene: !!e.querySelector('.scene'), title: t?.textContent?.trim() ?? '', cut: t ? t.scrollWidth > t.clientWidth + 1 : true };
      }),
    );
    g.check(cards.length >= 2, `${device}: the crisis offers its option cards (${cards.length})`);
    g.check(cards.every((c) => c.scene), `${device}: every option card is illustrated (F-00-4)`);
    g.check(cards.every((c) => c.title && !c.cut), `${device}: no option title is cut off (${cards.filter((c) => c.cut).map((c) => c.title).join(', ') || 'none'})`);
    const exec = p.getByRole('button', { name: /Execute month/i }).first();
    g.check(await exec.isVisible(), `${device}: Execute month is there`);
    g.check((await visibleCount(p, '.adv-row')) === 0, `${device}: no advisor rows in month 1`);
    g.check((await visibleCount(p, '.seal-bank, .budget-tile')) === 0, `${device}: no budgets in month 1`);
    const meetings = await p.getByRole('button', { name: /\b(Call|Staff meeting|Visit|Interview)\b.*\bOpen$/ }).count();
    g.check(meetings === 0, `${device}: no meetings in month 1 (${meetings})`);
    // The rest is one tap away
    const show = p.getByRole('button', { name: /Show the whole desk/i }).first();
    g.check(await show.isVisible(), `${device}: "Show the whole desk" is offered`);
    await show.click();
    await p.waitForTimeout(900);
    g.check((await visibleCount(p, '.adv-row')) >= 1, `${device}: Show the whole desk brings the advisors`);
    if (device === 'laptop') g.check((await visibleCount(p, '.seal-bank, .budget-tile')) >= 1, `${device}: and the budgets`);
    await s.look(`${device}-whole-desk`);
    g.check(!s.errors.length, `${device}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
