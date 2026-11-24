// Generic month: answer the first open call with its mission card (else first Choose), Choose all, review, Execute.
const log = [];
const vis = async (l) => l.isVisible().catch(() => false);
const facts = () => page.evaluate(() => {
  const v = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const btns = [...document.querySelectorAll('button')].filter(v);
  const cover = btns.filter((b) => { const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false; const t = document.elementFromPoint(x, y); return t && !b.contains(t) && !t.contains(b) && !t.closest('[role=dialog]') ; }).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 30));
  return { hscroll: document.documentElement.scrollWidth > innerWidth + 1, covered: cover.slice(0, 8) };
});
for (let k = 0; k < 3; k++) { const n = page.getByRole('button', { name: /^Next month/ }).first(); if (await vis(n)) { await n.click(); await page.waitForTimeout(2500); } }
const M = (await S.state()).match(/Month (\d+)/)?.[1] ?? (await S.txt()).match(/Month (\d+)/)?.[1];
log.push({ M, f: await S.shot(`m${M}-desk`), facts: await facts() });
// answer a call
const cards = page.locator('button.opt');
const n = await cards.count();
let picked = null;
for (let i = 0; i < n && !picked; i++) { const t = (await cards.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' '); if (/Best (trade-off )?for your mission/.test(t) && await vis(cards.nth(i))) { await cards.nth(i).click().catch(() => {}); picked = t.slice(0, 80); } }
if (!picked && n) { const c = cards.first(); if (await vis(c)) { await c.click().catch(() => {}); picked = 'first:' + (await c.innerText()).slice(0, 60); } }
await page.waitForTimeout(1200);
log.push({ picked, state: await S.state() });
const ca = page.getByRole('button', { name: /^Choose all recommended/ }).first();
if (await vis(ca) && await ca.isEnabled()) { await ca.click(); await page.waitForTimeout(1200); log.push('chose all'); } else log.push('no choose all visible');
const ce = page.getByRole('button', { name: /^Check and execute|^Check what will happen/ }).first();
if (await vis(ce)) { await ce.click(); await page.waitForTimeout(1800); log.push({ review: await S.shot(`m${M}-review`), facts: await facts() }); }
const ex = page.getByRole('button', { name: /^Execute month/ }).first();
if (await vis(ex)) { await ex.scrollIntoViewIfNeeded().catch(() => {}); await ex.click(); await page.waitForTimeout(10000); log.push({ result: await S.shot(`m${M}-result`), facts: await facts(), state: await S.state() }); }
else log.push({ noExecute: await S.shot(`m${M}-noexec`) });
log.push({ errs: S.errors.slice(-3), dialogs: S.dialogs });
return log;
