// D84-DESK-TRUTH (design-review-your-call.md RC-1, S1): a crisis the engine marks as a call was
// left without an answer while the desk said it would go ahead on "Recommended: X", so Execute sent
// nothing and the engine ran the default answer. Guard: on Hormuz Convoy USA (seed 4242) and
// CO-UKR-MAYA1, months 1 and 2, with and without pressing Accept all recommended first, the answer
// the desk names for every open crisis is the one in the POST /api/turn payload (or the engine
// default, when the desk names the default), the one the turn report says ran, and the one the
// replay record (world.inputs) carries.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/D84-DESK-TRUTH.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base, api } = args('D84-DESK-TRUTH');
const SEATS = [
  { name: 'hc-usa', seat: { flashpointId: 'hormuz-convoy', countryId: 'USA', title: 'Hormuz Convoy', seed: 4242 } },
  { name: 'co-ukr', seat: { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' } },
];
const MONTHS = 2;

/** The selection text the desk shows for a crisis: its stage badge, its "Also on your desk" row or its navigator row. */
const deskText = (p, title) =>
  p.evaluate((t) => {
    const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
    for (const a of document.querySelectorAll('article.stage')) {
      if (clean(a.querySelector('.stage-title')?.textContent) === t) {
        const b = a.querySelector('.sel-badge');
        if (b) return clean(b.textContent);
      }
    }
    for (const r of document.querySelectorAll('.also-row')) if (clean(r.querySelector('b')?.textContent) === t) return clean(r.querySelector('small')?.textContent);
    for (const e of document.querySelectorAll('[aria-label]')) {
      const l = e.getAttribute('aria-label') ?? '';
      if (l.startsWith(`${t}: `)) return clean(l.slice(t.length + 2));
    }
    return '';
  }, title);

await run('D84-DESK-TRUTH', async (g, track) => {
  for (const { name, seat } of SEATS)
    for (const accept of [false, true]) {
      const tag = `${name}${accept ? '-accept' : ''}`;
      const s = track(await startGame({ variant: `d84-desk-${tag}`, device: 'laptop', out: path.join(out, tag), base, seat }));
      const p = s.page;
      let req = null;
      let res = null;
      p.on('request', (r) => {
        if (/\/api\/turn$/.test(r.url()) && r.method() === 'POST') req = JSON.parse(r.postData() ?? '{}');
      });
      p.on('response', async (r) => {
        if (/\/api\/turn$/.test(r.url()) && r.request().method() === 'POST') res = await r.json().catch(() => null);
      });
      const sid = await p.evaluate(() => localStorage.getItem('worldconflict.lastSave'));
      for (let m = 1; m <= MONTHS; m++) {
        const where = `${tag} month ${m}`;
        const load = await p.evaluate(async (u) => (await fetch(u)).json().catch(() => null), `${api}/load/${sid}`);
        const pending = load?.pendingDecisions ?? load?.worldState?.pendingDecisions ?? [];
        const calls = new Set((load?.advice?.calls ?? []).filter((c) => c.kind === 'crisis').map((c) => c.id));
        g.check(pending.length > 0, `${where}: a crisis is open (${pending.length})`);
        if (accept) {
          await s.click(/^Review \d+ recommended/i, { timeout: 800 });
          await p.waitForTimeout(400);
          const pressed = await s.click(/^Accept all recommended/i, { timeout: 1500 });
          console.log(`     ${where}: Accept all ${pressed ? 'pressed' : 'not offered on this desk'}`);
          await p.waitForTimeout(800);
          // The button never claims every recommendation is decided while a crisis is still open
          const main = (await p.locator('.sp-main').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ');
          console.log(`     ${where}: the button now says "${main}"`);
          if (/every recommendation is decided/.test(main)) {
            const still = [];
            for (const d of pending) if (/^Recommended:/.test(await deskText(p, d.title))) still.push(d.title);
            g.check(!still.length, `${where}: "every recommendation is decided" only when no crisis is still on its recommendation (open: ${still.join(', ') || 'none'})`);
          }
        }
        const desk = {};
        for (const d of pending) {
          const text = await deskText(p, d.title);
          const label = text.replace(/^(Recommended|Accepted|Your pick):\s*/, '');
          const o = d.options.find((x) => x.label === label);
          desk[d.id] = o?.id;
          g.check(!!o, `${where}: the desk names an answer for "${d.title}"${calls.has(d.id) ? ' (a call)' : ''} ("${text}")`);
        }
        req = null;
        res = null;
        if (!(await s.click(/Execute month/i, { timeout: 12000 }))) throw new Error(`${where}: Execute month not clickable`);
        const t0 = Date.now();
        while (!res && Date.now() - t0 < 30000) await p.waitForTimeout(300);
        g.check(!!req && !!res, `${where}: the month was sent and resolved`);
        const sent = Object.fromEntries((req?.decisions ?? []).map((d) => [d.decisionId, d.optionId]));
        const world = res?.worldState;
        const report = (world?.turnReport?.decisions ?? []).filter((r) => !r.kind || r.kind === 'CRISIS');
        const input = world?.inputs?.[world.inputs.length - 1];
        const recorded = Object.fromEntries((input?.decisions ?? []).map((d) => [d.decisionId, d.optionId]));
        for (const d of pending) {
          const shown = desk[d.id];
          const runs = sent[d.id] ?? d.defaultOptionId;
          g.check(runs === shown, `${where} "${d.title}": the answer sent (${sent[d.id] ?? `none, engine default ${d.defaultOptionId}`}) is the one the desk names (${shown})`);
          const r = report.find((x) => x.id === d.id || x.decisionId === d.id || x.title === d.title);
          g.check(!!r && r.optionId === shown, `${where} "${d.title}": the turn report's answer (${r?.optionId ?? 'none'}: ${r?.choice ?? ''}) is the one the desk names (${shown})`);
          g.check((recorded[d.id] ?? d.defaultOptionId) === shown, `${where} "${d.title}": the replay record carries the answer sent (${recorded[d.id] ?? 'none'})`);
        }
        if (m === MONTHS) break;
        const next = p.getByRole('button', { name: /^Next month/i }).first();
        await next.waitFor({ timeout: 30000 });
        for (let i = 0; i < 3 && (await next.isVisible().catch(() => false)); i++) {
          await next.click().catch(() => {});
          await p.waitForTimeout(1500);
        }
        await p.waitForTimeout(1500);
      }
      g.check(!s.errors.length, `${tag}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
    }
});
