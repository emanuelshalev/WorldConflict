// F-00-9 (iteration 0 triage: "a month takes about 5 screens") and B-13 (Escape did not close the
// newspaper opened after the debrief). Guard: after Execute, one result card with Next month in view
// (also at 1024x768, QA1 S3-5), Read the paper opens the paper and Escape closes it, and Next month
// lands on the month 2 desk: two screens per month.
import path from 'node:path';
import { auditViewports } from '../../../../kit/layout-audit.mjs';
import cfg from '../../layout-audit.config.mjs';
import { WHOLE_JS, apiSave, args, openSaved, run, startGame } from './_lib.mjs';

const { out, base, api } = args('F-00-9');
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
    // Iteration 4: the month is in the state band (the goal line is gone, D-80)
    const goal = (await p.locator('[data-region="state"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    g.check(/month 2 of/i.test(goal), `${w}: it is month 2 ("${goal.slice(0, 60)}")`);
    g.check(!s.errors.length, `${w}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }

  // F-04-6 (iteration 4, REGRESSED: Next month 6 px on screen at 1920x1080 in month 7 of
  // CO-UKR-MAYA1, under a "Remember General strike?" banner; this guard only looked at month 1 at
  // laptop and tablet size): the reference screen (D-87), months 1 to 8 of Maya's seat played as she
  // did (Choose all recommended, Execute), Next month whole and on top in every month
  const sv = await apiSave(api, 0, { countryId: 'UKR', flashpointId: 'ceasefire-or-collapse', seedCode: 'CO-UKR-MAYA1' }, 'f009');
  const n = await openSaved(base, '1920x1080', sv);
  track({ page: n.page, out, close: () => n.browser.close() });
  const q = n.page;
  const whole = new Function(`return ${WHOLE_JS}`)();
  let tall = 0;
  for (let m = 1; m <= 8; m++) {
    await q.getByRole('button', { name: /^Choose all recommended/ }).first().click({ timeout: 3000 }).catch(() => {});
    await q.waitForTimeout(300);
    await q.getByRole('button', { name: /Execute month/i }).first().click({ timeout: 10000 });
    const btn = q.locator('.result-card .rc-next').first();
    await btn.waitFor({ timeout: 30000 });
    await q.waitForTimeout(1200);
    const why = (await btn.evaluate(whole)) || (await q.locator('.result-card .rc-foot').first().evaluate(whole));
    g.check(!why, `1920x1080 month ${m}: Next month and the button row are whole and on top${why ? ` (${why})` : ''}`);
    // RS-008's layout rules on the tall card (the first with a Remember banner): the content gives
    // way without an inner scroll region, nothing below the fold
    if ((await q.locator('.result-card .rc-remember').count()) && !tall++) {
      const [row] = await auditViewports(q, { config: cfg.result, viewports: [{ width: 1920, height: 1080 }], out: path.join(out, 'audit'), name: `result-m${m}` });
      g.check(row.violations.length === 0, `RS-008 result card 1920x1080 month ${m}: ${row.violations.map((v) => `${v.rule}: ${v.message}`).join('; ') || 'layout rules hold'}`);
    }
    if (why) await q.screenshot({ path: path.join(out, `f046-m${m}.png`) });
    await btn.click({ force: true });
    await q.waitForTimeout(1200);
    for (let k = 0; k < 4 && !(await q.getByRole('button', { name: /Execute month/i }).first().isVisible().catch(() => false)); k++) {
      await q.keyboard.press('Escape');
      await q.waitForTimeout(400);
    }
  }
  g.check(tall >= 1, `the run met a tall card (a Remember banner) in ${tall} month(s)`);
  g.check(!n.errors.length, `1920x1080: no page errors (${n.errors.slice(0, 2).join(' | ')})`);
});
