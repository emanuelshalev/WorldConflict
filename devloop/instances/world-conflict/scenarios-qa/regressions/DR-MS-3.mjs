// DR-MS-3 (design-review-month-screen.md S2-2, sibling of D84-DESK-TRUTH): the review page ("Check
// what will happen") listed meetings and recommended orders under "Left to your advisers", on phones
// with "Recommended: X" under each, while Execute had the ministers take the meetings on their
// default answer and gave no recommended order at all.
// Rule: every line of the review page says what Execute will really do. Nothing chosen, Execute
// from the review page, then the POST /api/turn body and the turn report are compared with it:
//  - a meeting row names its minister's (default) answer X: nothing is sent for it and the report
//    has "X (you did not attend)";
//  - the recommended orders row says they are not given: the body carries no order;
//  - a crisis that is not a call names the cabinet's answer X: X is sent and reported;
//  - an open call says what leaving it does (Y, or "passes"): nothing is sent, the report has
//    "Y (no decision taken)" or no entry;
//  - no row says "Recommended: ..." or "Left to your advisers", and no line doubles "If you
//    execute now: If you leave it".
// Scenes: Hormuz Convoy as the United States (seed 4242), months 2 and 4 (meetings, recommended
// orders, open calls), on a laptop (1440x900, Check and execute) and a phone (390x844, the review
// screen with the phone's only Execute). Fixed and floating elements on the review page: the state
// band and month bar (top), the Execute block (the rail on the desk, the sticky bottom on a phone),
// the ticker; none is moved by this guard.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-MS-3.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { apiSave, args, openSaved, run, toPhoneReview } from './_lib.mjs';

const { out, base, api } = args('DR-MS-3');
const SIZES = (process.env.DRMS3_SIZES ?? '1440x900,390x844').split(',');
const MONTHS = [1, 3];

await run('DR-MS-3', async (g) => {
  for (const months of MONTHS)
    for (const size of SIZES) {
      const where = `month ${months + 1} ${size}`;
      const sv = await apiSave(api, months, undefined, 'drms3');
      const load = await fetch(`${api}/load/${sv.save}`).then((r) => r.json());
      const pending = load.pendingDecisions ?? [];
      const meetings = load.worldState?.agenda ?? [];
      const { browser, page: p, errors } = await openSaved(base, size, sv);
      try {
        let req = null;
        let res = null;
        p.on('request', (r) => {
          if (/\/api\/turn$/.test(r.url()) && r.method() === 'POST') req = JSON.parse(r.postData() ?? '{}');
        });
        p.on('response', async (r) => {
          if (/\/api\/turn$/.test(r.url()) && r.request().method() === 'POST') res = await r.json().catch(() => null);
        });
        const phone = Number(size.split('x')[0]) <= 700;
        if (phone) await toPhoneReview(p);
        else await p.getByRole('button', { name: /^Check and execute/ }).first().click();
        await p.waitForTimeout(800);
        const page = p.locator('[data-review]').first();
        g.check(await page.isVisible().catch(() => false), `${where}: the review page is open`);
        // Every row outside "You chose" and "You skipped", with its kind and its sentence
        const rows = await page.evaluate((el) =>
          [...el.querySelectorAll('.rv-rows section')]
            .filter((s) => !/^You (chose|skipped)/.test(s.getAttribute('aria-label') ?? ''))
            .flatMap((s) =>
              [...s.querySelectorAll('.prow')].map((r) => {
                const t = r.querySelector('.prow-t');
                const small = (t?.querySelector('small')?.textContent ?? '').replace(/\s+/g, ' ').trim();
                const title = (t?.textContent ?? '').replace(small, '').replace(/\s+/g, ' ').trim();
                return { section: s.getAttribute('aria-label') ?? '', kind: r.getAttribute('data-review-row') ?? '', title, small };
              }),
            ),
        );
        const heads = await page.locator('.rv-rows h2').allInnerTexts();
        const text = (await page.innerText()).replace(/\s+/g, ' ');
        console.log(`     ${where}: ${rows.map((r) => `[${r.kind || '?'}] ${r.title}: ${r.small}`).join(' | ')}`);
        g.check(rows.length > 0, `${where}: the review lists what is not decided (${rows.length})`);
        g.check(!heads.some((h) => /Left to your advisers/i.test(h)), `${where}: no "Left to your advisers" heading (${heads.join(' / ')})`);
        g.check(!rows.some((r) => /^Recommended:/.test(r.small)), `${where}: no row says "Recommended: ..." for something not decided`);
        g.check(!/If you execute now: If you leave it/.test(text), `${where}: no doubled "If you execute now: If you leave it"`);
        // Folded by the page's fit rule, the section's one line says the same (not just the titles)
        const sum = p.locator('[data-review] .rv-sum').first();
        if (await sum.isVisible().catch(() => false)) {
          const s = (await sum.innerText()).replace(/\s+/g, ' ');
          const meetingRows = rows.filter((r) => r.kind === 'meeting').length;
          g.check(/^If you execute now: /.test(s) && (!meetingRows || /ministers take/.test(s)) && (!rows.some((r) => r.kind === 'orders') || /not given/.test(s)), `${where}: the folded line says what Execute does ("${s}")`);
        }
        g.check(rows.every((r) => r.kind), `${where}: every not-decided row says which kind of thing it is (${rows.filter((r) => !r.kind).map((r) => r.title).join(', ') || 'all'})`);
        await p.screenshot({ path: path.join(out, `review-m${months + 1}-${size}.png`), fullPage: phone });
        // Execute from the review page
        await p.getByRole('button', { name: /Execute month/i }).first().click({ timeout: 12000 });
        const t0 = Date.now();
        while (!res && Date.now() - t0 < 30000) await p.waitForTimeout(300);
        g.check(!!req && !!res, `${where}: the month was sent and resolved`);
        const sent = Object.fromEntries((req?.decisions ?? []).map((d) => [d.decisionId, d.optionId]));
        const report = res?.worldState?.turnReport?.decisions ?? [];
        for (const r of rows) {
          if (r.kind === 'meeting') {
            const x = r.small.match(/takes it: (.+?)\. (Free|Costs)/)?.[1];
            const m = meetings.find((mm) => mm.options.find((o) => o.id === mm.defaultOptionId)?.label === x && report.some((e) => e.title === mm.title));
            const e = m && report.find((rr) => rr.title === m.title);
            g.check(!!x && !!m, `${where} "${r.title}": the row names the minister's answer ("${r.small}")`);
            if (m) {
              g.check(!sent[m.id] || sent[m.id] === m.defaultOptionId, `${where} "${r.title}": nothing but the default is sent (${sent[m.id] ?? 'none'})`);
              g.check(e?.choice === `${x} (you did not attend)`, `${where} "${r.title}": the turn report has the minister's answer (${e?.choice ?? 'no entry'})`);
            }
          } else if (r.kind === 'meetings') {
            g.check(/ministers take them/.test(r.small), `${where} "${r.title}": the row says the ministers take them ("${r.small}")`);
            for (const m of meetings) if (!sent[m.id] || sent[m.id] === m.defaultOptionId) g.check(report.some((e) => e.title === m.title && / \(you did not attend\)$/.test(e.choice)), `${where} small meeting "${m.title}": taken by a minister in the report`);
          } else if (r.kind === 'orders') {
            g.check(/^If you execute now: Not given unless you choose them/.test(r.small), `${where} "${r.title}": the row says the orders are not given ("${r.small}")`);
            g.check((req?.playerActions ?? []).length === 0, `${where}: no order is sent (${(req?.playerActions ?? []).map((a) => a.type).join(', ') || 'none'})`);
          } else if (r.kind === 'crisis') {
            const d = pending.find((x) => x.title === r.title);
            const x = r.small.match(/answer goes: (.+?)\.$/)?.[1];
            const o = d?.options.find((oo) => oo.label === x);
            g.check(!!o, `${where} "${r.title}": the row names the cabinet's answer ("${r.small}")`);
            if (o) {
              g.check(sent[d.id] === o.id, `${where} "${r.title}": that answer is sent (${sent[d.id] ?? 'none'})`);
              g.check(report.find((e) => e.title === d.title)?.choice === o.label, `${where} "${r.title}": the report has it`);
            }
          } else if (r.kind === 'call') {
            const d = pending.find((x) => x.title === r.title);
            if (!d) continue; // the move for the mission: an order call, Hold sends nothing
            const passes = /crisis passes with no effect/.test(r.small);
            const y = r.small.match(/^If you leave it: (.+?)(?: · ◆ \d+)?\.$/)?.[1];
            g.check(passes || !!y, `${where} "${r.title}": the row says what leaving it does ("${r.small}")`);
            g.check(!sent[d.id], `${where} "${r.title}": nothing is sent for the open call (${sent[d.id] ?? 'none'})`);
            const e = report.find((rr) => rr.title === d.title);
            g.check(passes ? !e : e?.choice === `${y} (no decision taken)`, `${where} "${r.title}": the report shows what the row said (${e?.choice ?? 'no entry'})`);
          }
        }
        g.check(!errors.length, `${where}: no page errors (${errors.slice(0, 2).join(' | ')})`);
      } finally {
        await browser.close();
      }
    }
});
