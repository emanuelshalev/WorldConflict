import { browser, newSave, openSave, shot, facts, text, log, SEATS } from './lib.mjs';
const b = await browser();
for (const size of ['3440x1440', '1920x1080', '1366x768', '390x844']) {
  const sv = await newSave(SEATS.hc, 1);
  const { page: p, ctx } = await openSave(b, size, sv);
  if (size === '390x844') {
    for (let i = 0; i < 12; i++) { const nx = p.locator('.ph-bottom .ph-next').first(); if (!(await nx.isVisible().catch(() => false))) break; await nx.click().catch(() => {}); await p.waitForTimeout(300); }
  }
  await p.getByRole('button', { name: /^Execute month/ }).first().click({ timeout: 8000 }).catch((e) => log('log-paper.txt', 'exec fail', e.message.split('\n')[0]));
  await p.waitForTimeout(6000);
  log('log-paper.txt', size, 'result', (await text(p)).match(/THE MONTH.{0,400}/i)?.[0]);
  await p.getByText(/Read the paper/).first().click({ timeout: 4000 }).catch((e) => log('log-paper.txt', 'paper fail', e.message.split('\n')[0]));
  await p.waitForTimeout(2500);
  await shot(p, `n-${size}-paper`);
  log('log-paper.txt', size, 'paper facts', await facts(p));
  await ctx.close();
}
await b.close();
