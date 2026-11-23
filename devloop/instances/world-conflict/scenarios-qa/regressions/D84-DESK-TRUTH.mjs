// D84-DESK-TRUTH (design-review-your-call.md RC-1, S1): a crisis the engine marks as a call was
// left without an answer while the desk said it would go ahead on "Recommended: X", so Execute sent
// nothing and the engine did something else. Rule: what the desk says will happen to each open
// crisis is what the POST /api/turn body (or, with no answer, the engine) does, and what the turn
// report and the replay record (world.inputs) record. A crisis with an answer shows it
// ("Recommended: X", "Accepted: X", "Your pick: X") and sends it. A call with "Let the Chief of
// Staff make my calls" off shows "No answer yet. If you leave it: Y" (with Y's cost when it has
// one): nothing is sent and the report shows Y "(no decision taken)", or no entry when the desk
// says the crisis passes. With the setting on, the Chief of Staff's pick everywhere.
// Guard: Hormuz Convoy USA (seed 4242) and CO-UKR-MAYA1, months 1 and 2: setting off with and
// without Accept all recommended, and setting on with Accept all. The greyed-out Accept all never
// says "every recommendation is decided" while a crisis is still open.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/D84-DESK-TRUTH.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base, api } = args('D84-DESK-TRUTH');
const SEATS = [
  { name: 'hc-usa', seat: { flashpointId: 'hormuz-convoy', countryId: 'USA', title: 'Hormuz Convoy', seed: 4242 } },
  { name: 'co-ukr', seat: { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' } },
];
const VARIANTS = [
  { key: '', accept: false, chief: false },
  { key: '-accept', accept: true, chief: false },
  { key: '-chief', accept: true, chief: true },
];
const MONTHS = 2;
const PASSES = 'no answer is given and the crisis passes';

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

/** What the desk says will happen: { pick } for an answer it shows, { left, cost } for a crisis with none. */
function readDesk(text) {
  const named = /^(Recommended|Accepted|Your pick):\s*(.+)$/.exec(text);
  if (named) return { pick: named[2] };
  const left = /^No answer yet\. If you leave it: (.+?)(?: · ◆ (\d+))?$/.exec(text);
  if (left) return { left: left[1], cost: left[2] ? Number(left[2]) : 0 };
  return {};
}

await run('D84-DESK-TRUTH', async (g, track) => {
  for (const { name, seat } of SEATS)
    for (const v of VARIANTS) {
      const tag = `${name}${v.key}`;
      const init = v.chief ? () => localStorage.setItem('worldconflict.chiefCalls', 'on') : undefined;
      const s = track(await startGame({ variant: `d84-desk-${tag}`, device: 'laptop', out: path.join(out, tag), base, seat, init }));
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
        const chiefPicks = load?.advice?.chief?.decisions ?? {};
        g.check(pending.length > 0, `${where}: a crisis is open (${pending.length})`);
        if (v.accept) {
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
            for (const d of pending) if (/^(Recommended:|No answer yet)/.test(await deskText(p, d.title))) still.push(d.title);
            g.check(!still.length, `${where}: "every recommendation is decided" only when no crisis is still open (open: ${still.join(', ') || 'none'})`);
          }
          for (const t of (main.match(/Still open: ([^|]+)/)?.[1] ?? '').split(', ').filter(Boolean))
            g.check(pending.some((d) => main.includes(d.title)), `${where}: the still-open line names a crisis on the desk ("${t.trim()}")`);
        }
        const desk = {};
        for (const d of pending) {
          const text = await deskText(p, d.title);
          const said = readDesk(text);
          const call = calls.has(d.id);
          if (said.pick) {
            const o = d.options.find((x) => x.label === said.pick);
            desk[d.id] = { send: o?.id, runs: o?.id };
            g.check(!!o, `${where}: the desk names an answer for "${d.title}"${call ? ' (a call)' : ''} ("${text}")`);
            if (call && v.chief && chiefPicks[d.id]) g.check(o?.id === chiefPicks[d.id], `${where} "${d.title}": with the setting on the call shows the Chief of Staff's pick (${chiefPicks[d.id]}, desk ${o?.id})`);
            if (call && !v.chief) g.check(/^Your pick/.test(text), `${where} "${d.title}": with the setting off a call shows an answer only when the player picked one ("${text}")`);
          } else if (said.left) {
            const passes = said.left === PASSES;
            const o = passes ? null : d.options.find((x) => x.label === said.left);
            g.check(passes || !!o, `${where}: the desk names what leaving "${d.title}" does ("${text}")`);
            desk[d.id] = { send: undefined, runs: o?.id ?? null };
            if (o) g.check(said.cost === Math.max(0, -(o.effects?.pc ?? 0)), `${where} "${d.title}": the cost shown for leaving it (◆ ${said.cost}) is the answer's (${o.effects?.pc ?? 0})`);
            g.check(call && !(v.chief && chiefPicks[d.id]), `${where} "${d.title}": only a call left to the player has no answer${v.chief ? ' (setting on)' : ''}`);
          } else {
            g.check(false, `${where}: the desk says what happens to "${d.title}" ("${text}")`);
          }
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
          const want = desk[d.id];
          if (!want) continue;
          g.check(sent[d.id] === want.send, `${where} "${d.title}": the answer sent (${sent[d.id] ?? 'none'}) is what the desk says (${want.send ?? 'none'})`);
          const r = report.find((x) => x.id === d.id || x.decisionId === d.id || x.title === d.title);
          const label = (id) => d.options.find((o) => o.id === id)?.label;
          const expected = want.runs == null ? null : want.send ? label(want.runs) : `${label(want.runs)} (no decision taken)`;
          g.check((r?.choice ?? null) === expected, `${where} "${d.title}": the turn report (${r?.choice ?? 'no entry'}) shows what the desk said would happen (${expected ?? 'no entry: it passes'})`);
          g.check(recorded[d.id] === want.send, `${where} "${d.title}": the replay record carries the answer sent (${recorded[d.id] ?? 'none'})`);
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
