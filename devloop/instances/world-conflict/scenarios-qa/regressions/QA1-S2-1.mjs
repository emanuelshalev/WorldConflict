// QA iteration 1 S2-1 (also RS-001 "where are the suggestions?"): in Map mode the advisor
// suggestions are readable at 1440x900 and 1024x768: each row is wide enough for its content,
// names its order, and its Added/Remove buttons do not sit on the Desk button or each other.
// Since AC3 (D-58) the row starts folded: the folded toggle must name the count and open in one
// tap; since F-02-5 each suggestion is the shared order card (title .wc-card-title, a full-card
// hit area under its controls), so text under a control is checked instead of the hit area.
// Repro (runs/iter-01/qa-verify.md S2-1): today's crisis as the United States, take office, press Map.
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('QA1-S2-1');
const overlap = (a, b) => a && b && a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;

await run('QA1-S2-1', async (g, track) => {
  for (const device of ['laptop', 'tablet']) {
    const s = track(await startGame({ variant: `qa1s21-${device}`, device, out: path.join(out, device), base }));
    const p = s.page;
    const w = p.viewportSize().width;
    if (!(await s.click(/^Map$/))) throw new Error('no Map switch');
    await p.waitForTimeout(2500);
    // The advisors start folded behind "Your advisors suggest" so the globe keeps its room (QA AC3,
    // D-58): folded, the toggle must still say how many suggestions wait, and one tap opens them
    let rows = p.locator('.adv-row:visible');
    g.check((await rows.count()) === 0, `${w}: the advisor row starts folded (globe fit, AC3)`);
    const toggle = p.locator('.strip-tray-btn').first();
    const said = Number((await toggle.getAttribute('data-advice-count').catch(() => null)) ?? NaN);
    const shown = (await toggle.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    g.check(said >= 1 && shown.includes(String(said)), `${w}: folded, the toggle says how many suggestions ("${shown}")`);
    await toggle.click();
    await p.waitForTimeout(600);
    rows = p.locator('.adv-row:visible');
    g.check((await rows.count()) === Math.min(said, 2), `${w}: one tap opens them (${await rows.count()} of ${said} shown, 2 at most)`);
    if (said > 2) g.check(await p.getByRole('button', { name: `Show ${said - 2} more` }).first().isVisible().catch(() => false), `${w}: "Show ${said - 2} more" reaches the rest`);
    const n = await rows.count();
    g.check(n >= 1, `${w}: Map mode shows advisor suggestions (${n} rows)`);
    await s.look(`${w}-map`);
    const desk = await p.getByRole('button', { name: /^Desk$/ }).first().boundingBox();
    for (let i = 0; i < n; i++) {
      const r = rows.nth(i);
      const m = await r.evaluate((e) => {
        const b = e.getBoundingClientRect();
        // The order's name: the shared order card's title (F-02-5, one card everywhere) or the old row label
        const name = e.querySelector('.wc-card-title, .adv-label');
        const nb = name?.getBoundingClientRect();
        // Text drawn under a control (the Approve button over "if approved", QA S2-1 again)
        const hit = (a, c) => a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1;
        const controls = [...e.querySelectorAll('button')].filter((x) => !x.classList.contains('wc-card-hit') && x.getBoundingClientRect().width > 0);
        const under = [];
        const walk = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        for (let t = walk.nextNode(); t; t = walk.nextNode()) {
          if (!t.textContent.trim() || t.parentElement.closest('button:not(.wc-card-hit)')) continue;
          const range = document.createRange();
          range.selectNodeContents(t);
          for (const rr of range.getClientRects()) {
            const c = controls.find((x) => hit(rr, x.getBoundingClientRect()));
            if (c) under.push(`"${t.textContent.trim().slice(0, 20)}" under "${c.innerText.trim()}"`);
          }
        }
        return {
          w: b.width,
          h: b.height,
          sw: e.scrollWidth,
          cw: e.clientWidth,
          text: e.innerText.replace(/\s+/g, ' ').trim(),
          nameClipped: !name || nb.width < 80 || name.scrollWidth > name.clientWidth + 1,
          under: [...new Set(under)],
        };
      });
      g.check(m.w >= 240 && m.h >= 36, `${w}: row ${i + 1} is ${Math.round(m.w)}x${Math.round(m.h)} px ("${m.text.slice(0, 50)}")`);
      g.check(m.sw <= m.cw + 2, `${w}: row ${i + 1} content fits (${m.sw} of ${m.cw} px)`);
      g.check(/[A-Za-z]{4,}.*[A-Za-z]{4,}/.test(m.text) && !m.nameClipped, `${w}: row ${i + 1} names its order`);
      g.check(m.under.length === 0, `${w}: row ${i + 1} text stays clear of its buttons (${m.under.slice(0, 2).join('; ') || 'none'})`);
      // The card's full-surface hit area (.wc-card-hit) lies under every control by design: the
      // visible controls must not sit on each other or on the Desk button
      const btns = r.locator('button:not(.wc-card-hit):visible');
      const boxes = [];
      for (let k = 0; k < (await btns.count()); k++) boxes.push(await btns.nth(k).boundingBox());
      g.check(!boxes.some((b) => overlap(b, desk)), `${w}: row ${i + 1} buttons stay off the Desk button`);
      const clash = boxes.some((a, ai) => boxes.some((b, bi) => bi > ai && overlap(a, b)));
      g.check(!clash, `${w}: row ${i + 1} buttons do not overlap each other`);
    }
    g.check(!s.errors.length, `${w}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
