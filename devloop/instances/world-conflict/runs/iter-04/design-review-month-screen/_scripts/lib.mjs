import { chromium } from 'file:///C:/MyData/git/WorldConflict-agenda/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

export const BASE = 'http://localhost:5750/';
export const API = 'http://localhost:8750/api';
export const SHOTS = 'C:/MyData/git/WorldConflict-agenda/devloop/instances/world-conflict/runs/iter-04/design-review-month-screen';
fs.mkdirSync(SHOTS, { recursive: true });

export const SEATS = {
  hc: { flashpointId: 'hormuz-convoy', countryId: 'USA', title: 'Hormuz Convoy', seed: 4242, mode: 'FLASHPOINT' },
  qu: { flashpointId: 'quarantine', countryId: 'CHN', title: 'Quarantine', seed: 4242, mode: 'FLASHPOINT' },
};

export function device(size) {
  const [w, h] = size.split('x').map(Number);
  if (w <= 700) return { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  if (w <= 1024) return { viewport: { width: w, height: h }, hasTouch: true };
  return { viewport: { width: w, height: h } };
}

const post = (p, body) => fetch(`${API}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

/** New save through the API, resolved for `months` months with no orders (default answers). */
export async function newSave(seat, months = 0, guest = `guest-rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`) {
  const body = { playerCountryId: seat.countryId, mode: seat.mode ?? 'FLASHPOINT', seed: seat.seed, playerId: guest, saveName: 'review' };
  if (seat.flashpointId) body.flashpointId = seat.flashpointId;
  if (seat.scenarioId) body.scenarioId = seat.scenarioId;
  const d = await post('/new-game', body);
  if (!d.success) throw new Error(`new game: ${JSON.stringify(d).slice(0, 300)}`);
  for (let i = 0; i < months; i++) {
    const t = await post('/turn', { saveId: d.saveId, playerActions: [], decisions: [] });
    if (!t.success) throw new Error(`turn: ${JSON.stringify(t).slice(0, 300)}`);
  }
  return { guest, save: d.saveId };
}

export async function browser() {
  return chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'] });
}

/** Open a page at a size on an existing save (Continue), coach on or off. */
export async function openSave(b, size, { guest, save }, { coach = false, chief = false, help } = {}) {
  const ctx = await b.newContext(device(size));
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.addInitScript(([gu, s, coach, chief, help]) => {
    if (sessionStorage.getItem('rev-init')) return;
    sessionStorage.setItem('rev-init', '1');
    localStorage.setItem('worldconflict.guest', gu);
    localStorage.setItem('worldconflict.lastSave', s);
    localStorage.setItem('worldconflict.sound', JSON.stringify({ muted: true }));
    if (!coach) localStorage.setItem('worldconflict.coach', 'done');
    if (chief) localStorage.setItem('worldconflict.chiefCalls', 'on');
    if (help) localStorage.setItem('worldconflict.help', help);
  }, [guest, save, coach, chief, help]);
  await page.goto(BASE);
  await page.getByRole('button', { name: /^Continue/i }).first().click({ timeout: 30000 });
  await page.waitForTimeout(2500);
  return { ctx, page };
}

/** Fresh title screen with a pinned seat (the newcomer path). */
export async function openTitle(b, size, seat) {
  const ctx = await b.newContext(device(size));
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.route(/\/api\/scenarios(\?.*)?$/, async (r) => {
    const headers = { ...r.request().headers() };
    delete headers['if-none-match'];
    delete headers['if-modified-since'];
    const res = await r.fetch({ headers });
    let j;
    try { j = await res.json(); } catch { return r.fulfill({ response: res }); }
    if (j.daily) j.daily = { ...j.daily, flashpointId: seat.flashpointId, countryId: seat.countryId, title: seat.title };
    await r.fulfill({ response: res, json: j });
  });
  await page.route(/\/api\/new-game$/, async (r) => {
    const body = JSON.parse(r.request().postData() ?? '{}');
    if (body.seed === undefined && !body.seedCode) body.seed = seat.seed;
    body.daily = false;
    await r.continue({ postData: JSON.stringify(body) });
  });
  await page.goto(BASE);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('worldconflict.sound', JSON.stringify({ muted: true })); });
  await page.reload();
  await page.waitForTimeout(2000);
  return { ctx, page };
}

export async function shot(page, name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 500);
  const file = path.join(SHOTS, `${name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 70, fullPage: !!opts.full });
  return file;
}

/** Quick layout facts. */
export function facts(page) {
  return page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const de = document.documentElement;
    const btns = [...document.querySelectorAll('button, a[href], [role=button], [role=tab], summary, input, select')].filter(vis);
    const outView = btns.filter((b) => { const r = b.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.right > innerWidth + 1; }).map((b) => (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 40));
    const small = innerWidth <= 1024 ? btns.filter((b) => { const r = b.getBoundingClientRect(); return (r.height < 44 || r.width < 44) && r.bottom > 0 && r.top < innerHeight; }).map((b) => `${(b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 30)} ${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`) : [];
    const scrollers = [...document.querySelectorAll('*')].filter((e) => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2 && vis(e); }).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} ${e.scrollHeight}/${e.clientHeight}${e.closest('[data-scroll="reading"]') ? ' (reading)' : ''}`);
    const state = document.querySelector('[data-region="state"]');
    return {
      size: `${innerWidth}x${innerHeight}`, root: getComputedStyle(de).fontSize,
      pageScroll: `${de.scrollHeight}/${innerHeight}`, hscroll: de.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1,
      state: state ? state.innerText.replace(/\s+/g, ' ').slice(0, 300) : null,
      stateH: state ? Math.round(state.getBoundingClientRect().height) : null,
      outView: outView.slice(0, 20), small: small.slice(0, 30), scrollers,
      coach: [...document.querySelectorAll('.coach-bubble, .wc-coach, [data-coach]')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return `${e.innerText.replace(/\s+/g, ' ').slice(0, 80)} @${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`; }),
    };
  });
}

export const text = (page, sel = 'body') => page.locator(sel).first().innerText().then((t) => t.replace(/\s+/g, ' ')).catch(() => '');
export const log = (f, ...a) => { const l = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); console.log(l); fs.appendFileSync(f, l + '\n'); };
