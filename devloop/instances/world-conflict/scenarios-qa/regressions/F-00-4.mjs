// F-00-4 class (QA3R-6a, iteration 3 repro): overlapping and clipped labels. The old guard looked
// at month 1's option cards only; the repro found the sticky "Accept all recommended" box over the
// second recommendation, the Recommended panel over the rail header at 1024, a truncated goal line,
// and a STEP ACHIEVED stamp over a stat label on the phone. Guard: months 1 and 2 at 390, 1024,
// 1440 and 1920 wide: every visible button in the rail, the Recommended group and the option cards
// answers a tap at its centre (elementFromPoint is the button or inside it, after scrolling it into
// its scroller's view); no goal-line or HUD text is cut (scrollWidth > clientWidth); on the result
// card the stamp does not cover a fact label.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/F-00-4.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('F-00-4');
const BUTTONS = '.rail button, [data-staff-picks] button, .stage.is-primary .move-card button';
const CUT = '.goal-line .goal-title, .goal-line .goal-sum, .goal-line .goal-step, .game-top .hud-who b, .game-top .stat label, .game-top .stat .val';

/** Buttons whose centre is covered by something else, after scrolling each into view. */
async function covered(p) {
  const n = await p.locator(BUTTONS).count();
  const bad = [];
  for (let i = 0; i < n; i++) {
    const b = p.locator(BUTTONS).nth(i);
    if (!(await b.isVisible().catch(() => false))) continue;
    await b.evaluate((e) => e.scrollIntoView({ block: 'center', inline: 'nearest' })).catch(() => {});
    await p.waitForTimeout(60);
    const r = await b.evaluate((e) => {
      const box = e.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return null;
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return null;
      const hit = document.elementFromPoint(x, y);
      const ok = !!hit && (hit === e || e.contains(hit));
      return ok ? null : { name: (e.getAttribute('aria-label') ?? e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40), by: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]}` : 'nothing' };
    });
    if (r) bad.push(`${r.name} (under ${r.by})`);
  }
  return bad;
}

const cut = (p) =>
  p.$$eval(CUT, (els) =>
    els
      .filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none')
      .filter((e) => e.scrollWidth > e.clientWidth + 1)
      .map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)),
  );

await run('F-00-4', async (g, track) => {
  for (const device of ['phone', 'tablet', 'laptop', 'desktop']) {
    const s = track(await startGame({ variant: `f004-${device}`, device, out: path.join(out, device), base }));
    const p = s.page;
    const w = p.viewportSize().width;
    for (const month of [1, 2]) {
      await p.waitForTimeout(800);
      const show = p.getByRole('button', { name: /Show the whole desk/i }).first();
      if (await show.isVisible().catch(() => false)) {
        await show.click();
        await p.waitForTimeout(700);
      }
      const bad = await covered(p);
      g.check(!bad.length, `${w} month ${month}: every rail, Recommended and option button answers a tap at its centre (${bad.slice(0, 3).join('; ') || 'all clear'})`);
      // Execute and Accept all stay fully on screen whatever the list needs
      for (const name of [/Execute month/i, /^Accept all recommended|^Review \d+ recommended/i]) {
        const b = p.getByRole('button', { name }).first();
        if (!(await b.count())) continue;
        const r = await b.evaluate((e) => {
          const x = e.getBoundingClientRect();
          return { ok: x.top >= 0 && x.bottom <= innerHeight + 1 && x.width > 0, top: Math.round(x.top), bottom: Math.round(x.bottom) };
        });
        g.check(r.ok, `${w} month ${month}: ${name.source.slice(0, 20)} is fully on screen (${r.top} to ${r.bottom})`);
      }
      const cuts = await cut(p);
      // The top bar fits the window: nothing in it runs past the right edge (the menu stays reachable)
      const over = await p.evaluate(() =>
        [...document.querySelectorAll('.game-top .hud > *, .game-top .hud-menu > *')]
          .filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none')
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
          .map((e) => (e.getAttribute('aria-label') ?? e.className ?? '').toString().slice(0, 30)),
      );
      g.check(!over.length, `${w} month ${month}: the top bar fits the window (${over.slice(0, 3).join('; ') || 'all inside'})`);
      await s.look(`${w}-month${month}`);
      g.check(!cuts.length, `${w} month ${month}: no goal-line or HUD text is cut (${cuts.slice(0, 3).join('; ') || 'none'})`);
      if (month === 2) break;
      if (!(await s.click(/Execute month/i, { timeout: 10000 }))) throw new Error('Execute month not clickable');
      const next = p.getByRole('button', { name: /^Next month/i }).first();
      await next.waitFor({ timeout: 30000 });
      await p.waitForTimeout(1500);
      // The result card: a stamp never covers a fact label
      const hits = await p.evaluate(() => {
        const stamps = [...document.querySelectorAll('.result-card .wc-stamp')].filter((e) => e.getBoundingClientRect().width > 0);
        const labels = [...document.querySelectorAll('.result-card .rc-big-word, .result-card .rc-big-num, .result-card .rc-big-label, .result-card .rc-date')].filter((e) => e.getBoundingClientRect().width > 0);
        const over = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
        const out = [];
        for (const s of stamps) for (const l of labels) if (over(s.getBoundingClientRect(), l.getBoundingClientRect())) out.push(`${(s.textContent ?? '').trim().slice(0, 20)} over ${(l.textContent ?? '').trim().slice(0, 20)}`);
        return out;
      });
      await s.look(`${w}-result`);
      g.check(!hits.length, `${w}: the result card stamp covers no fact label (${hits.slice(0, 2).join('; ') || 'none'})`);
      for (let i = 0; i < 3 && (await next.isVisible().catch(() => false)); i++) {
        await next.click().catch(() => {});
        await p.waitForTimeout(1500);
      }
    }
    g.check(!s.errors.length, `${w}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
