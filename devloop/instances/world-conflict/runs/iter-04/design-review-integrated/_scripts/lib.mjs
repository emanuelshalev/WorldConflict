import { chromium } from 'file:///C:/MyData/git/WorldConflict/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

export const BASE = 'http://localhost:5750/';
export const API = 'http://localhost:8750/api';
export const SHOTS = 'C:/MyData/git/WorldConflict/devloop/instances/world-conflict/runs/iter-04/design-review-integrated';
export const LOGS = `${SHOTS}/_scripts`;
fs.mkdirSync(SHOTS, { recursive: true });

const post = (p, body) => fetch(`${API}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

export async function newSave(seat, months = 0, guest = `guest-int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`) {
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

export async function openSave(b, { guest, save }, { coach = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.addInitScript(([gu, s, coach]) => {
    if (sessionStorage.getItem('rev-init')) return;
    sessionStorage.setItem('rev-init', '1');
    localStorage.setItem('worldconflict.guest', gu);
    localStorage.setItem('worldconflict.lastSave', s);
    localStorage.setItem('worldconflict.sound', JSON.stringify({ muted: true }));
    if (!coach) localStorage.setItem('worldconflict.coach', 'done');
  }, [guest, save, coach]);
  await page.goto(BASE);
  await page.getByRole('button', { name: /^Continue/i }).first().click({ timeout: 30000 });
  await page.waitForTimeout(3000);
  return { ctx, page };
}

/** Fresh title screen, clean storage (the newcomer path, no seat pinning). */
export async function openTitle(b) {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.goto(BASE);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('worldconflict.sound', JSON.stringify({ muted: true })); });
  await page.reload();
  await page.getByRole('button', { name: /^Take office/ }).first().waitFor({ timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1000);
  return { ctx, page };
}

export async function shot(page, name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 600);
  const file = path.join(SHOTS, `${name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 72, fullPage: !!opts.full });
  return file;
}

export function facts(page) {
  return page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const de = document.documentElement;
    const btns = [...document.querySelectorAll('button, a[href], [role=button], [role=tab], summary, input, select')].filter(vis);
    const outView = btns.filter((b) => { const r = b.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.right > innerWidth + 1; }).map((b) => (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 40));
    const scrollers = [...document.querySelectorAll('*')].filter((e) => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2 && vis(e); }).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} ${e.scrollHeight}/${e.clientHeight}${e.closest('[data-scroll="reading"]') ? ' (reading)' : ''}`);
    const clipped = [...document.querySelectorAll('[data-region], section, aside, main')].filter((e) => { const s = getComputedStyle(e); return /hidden|clip/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2 && vis(e); }).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}[${e.getAttribute('data-region') ?? ''}] ${e.scrollHeight}/${e.clientHeight}`);
    const truncated = btns.filter((b) => b.scrollWidth > b.clientWidth + 1 && getComputedStyle(b).overflow !== 'visible').map((b) => (b.textContent || '').trim().slice(0, 40));
    const smallText = new Set();
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) { const n = tw.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || !vis(el)) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 14.5) smallText.add(`${fs}px:${n.textContent.trim().slice(0, 30)}`); }
    const state = document.querySelector('[data-region="state"]');
    return {
      root: getComputedStyle(de).fontSize,
      pageScroll: `${de.scrollHeight}/${innerHeight}`, hscroll: de.scrollWidth > innerWidth + 1,
      state: state ? state.innerText.replace(/\s+/g, ' ').slice(0, 300) : null,
      outView: outView.slice(0, 20), scrollers, clipped, truncated: truncated.slice(0, 20), smallText: [...smallText].slice(0, 25),
    };
  });
}

export const text = (page, sel = 'body') => page.locator(sel).first().innerText().then((t) => t.replace(/\s+/g, ' ')).catch(() => '');
export const buttons = (page) => page.evaluate(() => [...document.querySelectorAll('button, [role=tab], a[href]')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map((b) => { const r = b.getBoundingClientRect(); return `${(b.textContent || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60)} @${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}${b.disabled ? ' [dis]' : ''}`; }));
export const mkLog = (name) => { const f = `${LOGS}/${name}`; fs.writeFileSync(f, ''); return (...a) => { const l = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); console.log(l); fs.appendFileSync(f, l + '\n'); }; };

/** Click by role button, then tab, then combobox/option, then visible text. */
export function clicker(page, log) {
  return async (re, t = 8000) => {
    for (const role of ['button', 'tab', 'combobox', 'option', 'menuitem']) {
      const l = page.getByRole(role, { name: re }).first();
      if (await l.isVisible().catch(() => false)) return l.click({ timeout: t }).then(() => true, (e) => { log('MISS', role, String(re), e.message.split('\n')[0]); return false; });
    }
    const l = page.getByText(re).first();
    if (await l.isVisible().catch(() => false)) return l.click({ timeout: t }).then(() => true, (e) => { log('MISS text', String(re), e.message.split('\n')[0]); return false; });
    log('NOTFOUND', String(re));
    return false;
  };
}
