import { browser, newSave, openSave, shot, facts, log, SEATS } from './lib.mjs';
const b = await browser();
for (const size of ['3440x1440', '1920x1080']) {
  const sv = await newSave(SEATS.hc, 3);
  const { page: p, ctx } = await openSave(b, size, sv);
  const ex = p.getByRole('button', { name: /^Execute month/ }).first();
  const why = await ex.click({ trial: true, timeout: 3000 }).then(() => 'ok', (e) => e.message.split('\n').slice(0, 6).join(' | '));
  log('log-paper2.txt', size, 'trial', why);
  await ex.click({ force: true }).catch(() => {});
  await p.waitForTimeout(6000);
  await shot(p, `n2-${size}-result`);
  const rp = p.getByText(/Read the paper/).first();
  log('log-paper2.txt', size, 'read paper visible', await rp.isVisible().catch(() => false));
  await rp.click({ force: true }).catch((e) => log('log-paper2.txt', 'rp', e.message.split('\n')[0]));
  await p.waitForTimeout(2500);
  await shot(p, `n2-${size}-paper`);
  log('log-paper2.txt', size, await facts(p));
  await ctx.close();
}
await b.close();
