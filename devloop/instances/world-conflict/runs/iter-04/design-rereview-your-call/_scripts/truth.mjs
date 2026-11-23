// Desk truth: what the desk says per crisis, what Execute sends, what the report shows. Months 1-3.
// node truth.mjs <seatKey> <off|on> [accept]
import fs from 'node:fs';
import path from 'node:path';
import { API, SCRATCH, SEATS, clean, shot, start } from './lib.mjs';

const [seatKey, mode, acc] = process.argv.slice(2);
const chief = mode === 'on';
const accept = acc === 'accept';
const tag = `${seatKey}-${mode}${accept ? '-acc' : ''}`;
const log = [];
const say = (s) => { console.log(s); log.push(s); };

const deskText = (p, title) =>
  p.evaluate((t) => {
    const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
    const out = {};
    for (const a of document.querySelectorAll('article.stage')) {
      if (clean(a.querySelector('.stage-title')?.textContent) === t) {
        out.badge = clean(a.querySelector('.sel-badge')?.textContent);
        out.chosenCards = [...a.querySelectorAll('[aria-pressed="true"], .chosen, .is-chosen')].map((e) => clean(e.textContent).slice(0, 60));
        const r = a.getBoundingClientRect();
        const b = a.querySelector('.sel-badge')?.getBoundingClientRect();
        out.badgeBox = b ? { top: Math.round(b.top), bottom: Math.round(b.bottom), vh: innerHeight } : null;
        out.stageTop = Math.round(r.top);
      }
    }
    for (const r of document.querySelectorAll('.also-row')) if (clean(r.querySelector('b')?.textContent) === t) out.also = clean(r.querySelector('small')?.textContent);
    for (const e of document.querySelectorAll('[aria-label]')) {
      const l = e.getAttribute('aria-label') ?? '';
      if (l.startsWith(`${t}: `)) (out.aria ??= []).push(clean(l.slice(t.length + 2)));
    }
    return out;
  }, title);

const { ctx, page: p, errors } = await start({ seat: SEATS[seatKey], w: 1440, h: 900, chief, tag });
let req = null, res = null;
p.on('request', (r) => { if (/\/api\/turn$/.test(r.url()) && r.method() === 'POST') req = JSON.parse(r.postData() ?? '{}'); });
p.on('response', async (r) => { if (/\/api\/turn$/.test(r.url()) && r.request().method() === 'POST') res = await r.json().catch(() => null); });
const sid = await p.evaluate(() => localStorage.getItem('worldconflict.lastSave'));
try {
  for (let m = 1; m <= 3; m++) {
    const load = await p.evaluate(async (u) => (await fetch(u)).json().catch(() => null), `${API}/load/${sid}`);
    const world = load?.worldState;
    const pending = load?.pendingDecisions ?? world?.pendingDecisions ?? [];
    const calls = (load?.advice?.calls ?? []).map((c) => `${c.kind}:${c.id}`);
    say(`\n== ${tag} month ${m} (turn ${world?.turn}) calls=${JSON.stringify(calls)} chief=${JSON.stringify(load?.advice?.chief?.decisions ?? {})}`);
    for (const d of pending) say(`  crisis "${d.title}" id=${d.id} deadline=${d.deadlineTurn} default=${d.defaultOptionId} options=${d.options.map((o) => `${o.id}:${o.label}(pc ${o.effects?.pc ?? 0})`).join(' | ')}`);
    await shot(p, `truth-${tag}-m${m}-desk`);
    if (accept) {
      await p.getByRole('button', { name: /^Review \d+ recommended/i }).first().click({ timeout: 800 }).catch(() => {});
      await p.waitForTimeout(300);
      const ok = await p.getByRole('button', { name: /^Accept all recommended/i }).first().click({ timeout: 1500 }).then(() => true, () => false);
      await p.waitForTimeout(700);
      say(`  Accept all pressed: ${ok}; button now: "${clean((await p.locator('.sp-main').allInnerTexts().catch(() => [])).join(' | '))}"`);
      await shot(p, `truth-${tag}-m${m}-after-accept`);
    } else {
      say(`  Accept all button: "${clean((await p.locator('.sp-main').allInnerTexts().catch(() => [])).join(' | '))}"`);
    }
    for (const d of pending) say(`  desk "${d.title}": ${JSON.stringify(await deskText(p, d.title))}`);
    const plan = clean(await p.locator('.rail-plan, .plan-summary, [class*="plan"]').first().innerText().catch(() => ''));
    say(`  plan text: ${plan.slice(0, 300)}`);
    const meter = clean(await p.locator('.hud, header').first().innerText().catch(() => '')).match(/Political capital.{0,40}/)?.[0];
    const railPc = clean(await p.locator('body').innerText()).match(/Political capital (\d+) of (\d+) left/)?.[0];
    say(`  bank at start ${world?.politicalCapital}; HUD "${meter}"; rail "${railPc ?? '-'}"`);
    req = null; res = null;
    await p.getByRole('button', { name: /Execute month/i }).first().click({ timeout: 12000 });
    const t0 = Date.now();
    while (!res && Date.now() - t0 < 40000) await p.waitForTimeout(300);
    say(`  SENT decisions: ${JSON.stringify(req?.decisions ?? [])}`);
    const rep = (res?.worldState?.turnReport?.decisions ?? []).filter((r) => !r.kind || r.kind === 'CRISIS');
    say(`  REPORT crisis decisions: ${JSON.stringify(rep.map((r) => ({ title: r.title, choice: r.choice })))}`);
    say(`  report causes: ${JSON.stringify((res?.worldState?.turnReport?.causes ?? []).filter((c) => /capital|waited/.test(c)))}`);
    await p.waitForTimeout(2500);
    await shot(p, `truth-${tag}-m${m}-report`);
    const body = clean(await p.locator('body').innerText());
    for (const d of pending) {
      const i = body.indexOf(d.title);
      say(`  report screen mentions "${d.title}": ${i >= 0 ? body.slice(i, i + 160) : 'NO'}`);
    }
    say(`  bank after resolve ${res?.worldState?.politicalCapital}`);
    if (await p.getByRole('button', { name: /^See everything/i }).first().click({ timeout: 3000 }).then(() => true, () => false)) {
      await p.waitForTimeout(1500);
      await shot(p, `truth-${tag}-m${m}-everything`);
      const ev = clean(await p.locator('body').innerText());
      for (const d of pending) { const i = ev.indexOf(d.title); say(`  everything mentions "${d.title}": ${i >= 0 ? ev.slice(Math.max(0, i - 40), i + 200) : 'NO'}`); }
    }
    if (m === 3) break;
    const next = p.getByRole('button', { name: /^Next month/i }).first();
    await next.waitFor({ timeout: 30000 });
    for (let i = 0; i < 3 && (await next.isVisible().catch(() => false)); i++) { await next.click().catch(() => {}); await p.waitForTimeout(1500); }
    await p.waitForTimeout(1500);
  }
} catch (e) {
  say(`THREW ${e.message.split('\n')[0]}`);
  await shot(p, `truth-${tag}-fail`);
}
say(`errors: ${errors.slice(0, 3).join(' | ')}`);
fs.writeFileSync(path.join(SCRATCH, `truth-${tag}.txt`), log.join('\n'));
await ctx.close();
