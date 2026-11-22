// QA iteration 1 S2-1 (also RS-001 "where are the suggestions?"): in Map mode the advisor
// suggestions are readable at 1440x900 and 1024x768: each row is wide enough for its content,
// names its order, and its Added/Remove buttons do not sit on the Desk button or each other.
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
    let rows = p.locator('.adv-row:visible');
    // The strip may fold the advisors behind "Your advisors suggest" (it is a toggle): open it
    if ((await rows.count()) === 0) {
      await s.click(/Your advisors suggest/i);
      await p.waitForTimeout(600);
      rows = p.locator('.adv-row:visible');
    }
    const n = await rows.count();
    g.check(n >= 1, `${w}: Map mode shows advisor suggestions (${n} rows)`);
    await s.look(`${w}-map`);
    const desk = await p.getByRole('button', { name: /^Desk$/ }).first().boundingBox();
    for (let i = 0; i < n; i++) {
      const r = rows.nth(i);
      const m = await r.evaluate((e) => {
        const b = e.getBoundingClientRect();
        const name = e.querySelector('.adv-label');
        const nb = name?.getBoundingClientRect();
        return {
          w: b.width,
          h: b.height,
          sw: e.scrollWidth,
          cw: e.clientWidth,
          text: e.innerText.replace(/\s+/g, ' ').trim(),
          nameClipped: !name || nb.width < 80,
        };
      });
      g.check(m.w >= 240 && m.h >= 36, `${w}: row ${i + 1} is ${Math.round(m.w)}x${Math.round(m.h)} px ("${m.text.slice(0, 50)}")`);
      g.check(m.sw <= m.cw + 2, `${w}: row ${i + 1} content fits (${m.sw} of ${m.cw} px)`);
      g.check(/[A-Za-z]{4,}.*[A-Za-z]{4,}/.test(m.text) && !m.nameClipped, `${w}: row ${i + 1} names its order`);
      const btns = r.getByRole('button');
      const boxes = [];
      for (let k = 0; k < (await btns.count()); k++) boxes.push(await btns.nth(k).boundingBox());
      g.check(!boxes.some((b) => overlap(b, desk)), `${w}: row ${i + 1} buttons stay off the Desk button`);
      const clash = boxes.some((a, ai) => boxes.some((b, bi) => bi > ai && overlap(a, b)));
      g.check(!clash, `${w}: row ${i + 1} buttons do not overlap each other`);
    }
    g.check(!s.errors.length, `${w}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
