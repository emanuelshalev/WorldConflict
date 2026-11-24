const log = [];
const vis = async (l) => l.isVisible().catch(() => false);
for (let k = 0; k < 3; k++) { const n = page.getByRole('button', { name: /^Next month/ }).first(); if (await vis(n)) { await n.scrollIntoViewIfNeeded().catch(()=>{}); await n.click(); await page.waitForTimeout(2500); } }
const M = (await S.state()).match(/Month (\d+)/)?.[1];
log.push({ M, state: await S.state() });
for (let step = 0; step < 14; step++) {
  const head = (await page.locator('body').innerText()).slice(0, 220).replace(/\s+/g, ' ');
  // choose a mission-best card if any unchosen visible on this item
  const cards = page.locator('button.opt');
  const n = await cards.count();
  for (let i = 0; i < n; i++) { const c = cards.nth(i); const t = (await c.innerText().catch(() => '')).replace(/\s+/g, ' '); if (/Best (trade-off )?for your mission/.test(t) && !/Your choice/.test(t)) { await c.scrollIntoViewIfNeeded().catch(()=>{}); await c.click().catch(() => {}); await page.waitForTimeout(1000); log.push('chose ' + t.slice(0, 50)); break; } }
  const ca = page.getByRole('button', { name: /^Choose all recommended/ }).first();
  if (await ca.count() && await ca.isEnabled().catch(() => false)) { await ca.scrollIntoViewIfNeeded().catch(()=>{}); if (await vis(ca)) { await ca.click().catch(()=>{}); await page.waitForTimeout(1000); log.push('choose all'); } }
  const ex = page.getByRole('button', { name: /^Execute month/ }).first();
  if (await ex.count() && await vis(ex)) { log.push({ review: await S.shot(`m${M}-review`) }); await ex.click(); await page.waitForTimeout(10000); log.push({ result: await S.shot(`m${M}-result`), state: await S.state() }); break; }
  const nx = page.getByRole('button', { name: /^Next:|^Check and execute|^Check what|^Review your month/ }).first();
  if (await nx.count() && await vis(nx)) { const l = (await nx.innerText()).replace(/\s+/g, ' '); await nx.click(); await page.waitForTimeout(1500); log.push('next ' + l.slice(0, 40)); }
  else { log.push({ stuck: await S.shot(`m${M}-stuck${step}`), head }); break; }
}
log.push({ errs: S.errors.slice(-3), hs: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) });
return log;
