import { browser, newSave, openSave, shot, facts, text, log, SEATS } from './lib.mjs';
import { phoneList } from 'file:///C:/MyData/git/WorldConflict-agenda/devloop/instances/world-conflict/scenarios-qa/regressions/_lib.mjs';
const size = process.argv[2] ?? '390x844';
const months = Number(process.argv[3] ?? 1);
const tag = `hc-m${months + 1}-${size}`;
const L = `log-orders-${tag}.txt`;
const phone = Number(size.split('x')[0]) <= 700;
const b = await browser();
const sv = await newSave(SEATS.hc, months);
const { page: p } = await openSave(b, size, sv);
// open All orders (as _lib.openAllOrders)
const direct = p.getByRole('button', { name: /^All orders/ }).first();
if (!(await direct.isVisible().catch(() => false))) {
  if (!(await p.locator('[data-agenda]').first().isVisible().catch(() => false))) await p.locator('.see-all').first().click().catch(() => {});
  await p.waitForTimeout(300);
  if (!(await direct.isVisible().catch(() => false))) await p.locator('[data-agenda-item="own"]').first().click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(500);
}
await shot(p, `o-${tag}-00-own-orders`);
log(L, 'own orders thing', (await text(p, '[data-region="item"]')).slice(0, 800));
await direct.click({ timeout: 5000 }).catch((e) => log(L, 'no All orders', e.message));
await p.waitForTimeout(900);
await shot(p, `o-${tag}-01-catalog`);
log(L, 'catalog facts', await facts(p));
async function target(name) {
  await p.getByRole('button', { name: /Target country/i }).first().click().catch(() => {});
  await p.waitForTimeout(400);
  await p.keyboard.type(name);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
}
await target('Iran');
await shot(p, `o-${tag}-02-catalog-iran`);
if (phone) log(L, 'phone rows (top of list)', await phoneList(p));
const tabs = await p.locator('[data-order-catalog] [role=tab]').allInnerTexts().catch(() => []);
log(L, 'family tabs', tabs);
async function face(id, nm) {
  const row = p.locator(`[data-order-catalog] .ord-wrap[data-order-id="${id}"]`).first();
  if (!(await row.count())) { log(L, `${id}: no row`); return; }
  log(L, `${id} state`, await row.getAttribute('data-order-state'));
  await row.evaluate((r) => r.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(400);
  await row.locator('.ord-act').click({ timeout: 3000 }).catch((e) => log(L, `${id} add`, e.message.split('\n')[0]));
  await p.waitForTimeout(900);
  const m = await p.evaluate(() => {
    const f = document.querySelector('.ord-confirm');
    if (!f) return null;
    const r = f.getBoundingClientRect();
    const top = Math.max(document.querySelector('.game-top')?.getBoundingClientRect().bottom ?? 0, document.querySelector('[data-region="state"]')?.getBoundingClientRect().bottom ?? 0);
    const barEl = document.querySelector('.ph-bottom, .plan-bar, [data-form="bar"]');
    const bar = barEl ? barEl.getBoundingClientRect().top : innerHeight;
    const chk = (s) => { const e = f.querySelector(s); if (!e) return 'none'; const b = e.getBoundingClientRect(); const pts = [[b.left + b.width / 2, b.top + b.height / 2], [b.left + 4, b.top + 4], [b.right - 4, b.bottom - 4]]; return `${Math.round(b.top)}..${Math.round(b.bottom)} ${pts.map(([x, y]) => (e.contains(document.elementFromPoint(x, y)) ? 1 : 0)).join('')}`; };
    const title = f.querySelector('h3, h4, .ord-confirm-q, b');
    return { face: `${Math.round(r.top)}..${Math.round(r.bottom)} (${Math.round(r.height)})`, top: Math.round(top), bar: Math.round(bar), title: title ? `${title.textContent.trim().slice(0, 50)} @${Math.round(title.getBoundingClientRect().top)}` : null, cancel: chk('[data-confirm-cancel]'), go: chk('[data-confirm-go]'), whole: r.top >= top - 1 && r.bottom <= bar + 1 };
  });
  log(L, `${id} face`, m);
  await shot(p, `o-${tag}-${nm}`);
  await p.locator('[data-confirm-cancel]').first().click().catch(() => {});
  await p.waitForTimeout(500);
}
await face('nuclear-strike', '03-nuclear-face');
await target('Venezuela');
await face('declare-war', '04-war-face');
// add a plain order and see the meters
const plain = p.locator('[data-order-catalog] .ord-wrap[data-order-state="available"]').first();
const pid = await plain.getAttribute('data-order-id').catch(() => null);
const before = await facts(p);
await plain.evaluate((r) => r.scrollIntoView({ block: 'center' })).catch(() => {});
await plain.locator('.ord-act').click().catch(() => {});
await p.waitForTimeout(900);
if (await p.locator('.ord-confirm').count()) { await p.locator('[data-confirm-go]').first().click().catch(() => {}); await p.waitForTimeout(700); }
const after = await facts(p);
log(L, `added ${pid}`, before.state, ' => ', after.state);
await shot(p, `o-${tag}-05-added`);
log(L, 'errors', p.errors);
await b.close();
