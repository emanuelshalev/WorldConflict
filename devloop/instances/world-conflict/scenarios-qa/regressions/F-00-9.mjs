// F-00-9 (iteration 0 triage: "a month takes about 5 screens") and B-13 (Escape did not close the
// newspaper opened after the debrief). Guard: after Execute, one result card with Next month in view
// (also at 1024x768, QA1 S3-5), Read the paper opens the paper and Escape closes it, and Next month
// lands on the month 2 desk: two screens per month.
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('F-00-9');
const inView = (loc) =>
  loc.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1;
  });

await run('F-00-9', async (g, track) => {
  for (const device of ['laptop', 'tablet']) {
    const s = track(await startGame({ variant: `f009-${device}`, device, out: path.join(out, device), base }));
    const p = s.page;
    const w = p.viewportSize().width;
    if (!(await s.click(/Execute month/i, { timeout: 10000 }))) throw new Error('Execute month not clickable');
    const next = p.getByRole('button', { name: /^Next month/i }).first();
    await next.waitFor({ timeout: 30000 });
    await p.waitForTimeout(1500);
    await s.look(`${w}-result`);
    g.check(await inView(next), `${w}: the result card keeps Next month in view`);

    // The paper from the result card, closed with Escape (B-13)
    const paperBtn = p.getByRole('button', { name: /Read the paper/i }).first();
    g.check(await paperBtn.isVisible(), `${w}: the result card offers Read the paper`);
    await paperBtn.click();
    await p.waitForTimeout(1500);
    const paperOpen = () => p.getByRole('dialog', { name: /Monthly report/i }).first().isVisible().catch(() => false);
    g.check(await paperOpen(), `${w}: the paper opens over the result card`);
    await s.look(`${w}-paper`);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(1200);
    g.check(!(await paperOpen()), `${w}: Escape closes the paper`);

    // Next month: straight to the month 2 desk
    const again = p.getByRole('button', { name: /^Next month/i }).first();
    if (await again.isVisible().catch(() => false)) await again.click();
    await p.waitForTimeout(2000);
    const exec = p.getByRole('button', { name: /Execute month/i }).first();
    g.check(await exec.isVisible(), `${w}: Next month lands on the desk`);
    const goal = (await p.locator('.goal-line').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    g.check(/month 2 of/i.test(goal), `${w}: it is month 2 ("${goal.slice(0, 60)}")`);
    g.check(!s.errors.length, `${w}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
