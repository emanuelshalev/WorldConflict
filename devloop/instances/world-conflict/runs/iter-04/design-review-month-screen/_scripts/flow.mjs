// Agenda interactions on month 2: Choose, Skip, Undo, Choose all and its disabled line, Everything, Map, settings, help, ask staff, paper.
import { browser, newSave, openSave, shot, facts, text, log, SEATS } from './lib.mjs';
const size = process.argv[2] ?? '1920x1080';
const seatKey = process.argv[3] ?? 'hc';
const chief = process.argv[4] === 'chief';
const tag = `${seatKey}-m2-${size}${chief ? '-chief' : ''}`;
const L = `log-flow-${tag}.txt`;
const b = await browser();
const sv = await newSave(SEATS[seatKey], 1);
const { page: p } = await openSave(b, size, sv, { chief });
const btn = (re) => p.getByRole('button', { name: re }).first();
const click = (re, t = 2500) => btn(re).click({ timeout: t }).then(() => true, (e) => (log(L, `no click ${re}`, e.message.split('\n')[0]), false));
const plan = () => text(p, '[data-region="plan"]');
const bar = () => text(p, '.month-bar');
await shot(p, `f-${tag}-01-desk`);
log(L, 'bar', await bar());
log(L, 'thing', (await text(p, '[data-region="item"]')).slice(0, 1500));
log(L, 'plan', (await plan()).slice(0, 1200));
// Choose all recommended
await click(/^Review \d+ recommended/, 800);
await click(/^Choose all recommended/);
await p.waitForTimeout(900);
await shot(p, `f-${tag}-02-after-choose-all`);
log(L, 'after choose all: plan', (await plan()).slice(0, 1200));
log(L, 'after choose all: bar', await bar());
log(L, 'after choose all: list', (await text(p, '[data-region="list"]')).slice(0, 1200));
log(L, 'sp-main', await p.locator('.sp-main').allInnerTexts().catch(() => []));
// Choose an answer on the current call (first Choose)
const chooseBtns = p.locator('[data-region="item"] .thing button', { hasText: /^Choose$/ });
log(L, 'choose buttons', await chooseBtns.count());
await chooseBtns.first().click().catch((e) => log(L, 'choose fail', e.message.split('\n')[0]));
await p.waitForTimeout(1000);
await shot(p, `f-${tag}-03-after-choose`);
log(L, 'after choose: bar', await bar(), 'state', (await text(p, '[data-region="state"]')).slice(0, 220));
log(L, 'after choose: thing', (await text(p, '[data-region="item"]')).slice(0, 500));
// Back to it, then Skip
await click(/^Back/);
await p.waitForTimeout(700);
await shot(p, `f-${tag}-04-back-to-chosen`);
log(L, 'back thing', (await text(p, '[data-region="item"]')).slice(0, 700));
// Everything view
await p.getByRole('tab', { name: /Everything/ }).first().click({ timeout: 2000 }).catch(() => p.getByRole('button', { name: /^Everything/ }).first().click({ timeout: 2000 }).catch(() => log(L, 'no Everything')));
await p.waitForTimeout(900);
await shot(p, `f-${tag}-05-everything-view`);
log(L, 'everything view', (await text(p, '[data-region="item"]')).slice(0, 600));
// Ask your staff
if (await click(/Ask your staff/)) { await p.waitForTimeout(1200); await shot(p, `f-${tag}-06-ask-staff`); log(L, 'ask staff', (await text(p, '[role=dialog]')).slice(0, 500)); await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
// Help chip
if (await click(/^(Some help|Guide me|I know this)/)) { await p.waitForTimeout(700); await shot(p, `f-${tag}-07-help`); log(L, 'help', (await text(p)).match(/Guide me.{0,300}/)?.[0]); await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
// Menu, settings
if (await click(/^Menu/)) { await p.waitForTimeout(500); await shot(p, `f-${tag}-08-menu`); log(L, 'menu', await text(p, '.sb-menu-pop')); await click(/Settings/); await p.waitForTimeout(900); await shot(p, `f-${tag}-09-settings`); log(L, 'settings', (await text(p, '[role=dialog]')).slice(0, 2500)); await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
// Map
const mapOk = await p.getByRole('tab', { name: /Map/ }).first().click({ timeout: 3000 }).then(() => true, (e) => (log(L, 'map fail', e.message.split('\n').slice(0, 3).join(' ')), false));
if (mapOk) { await p.waitForTimeout(2500); await shot(p, `f-${tag}-10-map`); log(L, 'map facts', await facts(p)); await p.getByRole('tab', { name: /Desk/ }).first().click().catch(() => {}); await p.waitForTimeout(800); }
log(L, 'errors', p.errors);
await b.close();
