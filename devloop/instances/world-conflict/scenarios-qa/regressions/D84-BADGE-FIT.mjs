// D84-BADGE-FIT (design-rereview-your-call.md RC2-1, S2): on a phone the crisis selection badge
// ("No answer yet. If you leave it: ...") was wider than the screen and clipped at the right edge
// (".stage-staff .sel-badge { flex: none }" plus its 46 px margin): "...no answer is g",
// "...Break the str". Guard: at 390x844 and 360x740, Hormuz Convoy USA months 1 and 2 and Ukraine
// (CO-UKR-MAYA1) month 1, every selection badge on a crisis or meeting stage lies inside the
// viewport, its text is not clipped (scrollWidth <= clientWidth, no ancestor with hidden overflow
// cutting it), it carries the whole sentence the desk means, and the page has no horizontal scroll.
// The same holds after picking the answer with the longest label (a long "Your pick: ..." badge)
// and after Accept all recommended (the "Accepted: ..." badges), the old condition C-3 for this pill.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/D84-BADGE-FIT.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('D84-BADGE-FIT');
const SEATS = [
  { name: 'hc-usa', months: 2, seat: { flashpointId: 'hormuz-convoy', countryId: 'USA', title: 'Hormuz Convoy', seed: 4242 } },
  { name: 'co-ukr', months: 1, seat: { flashpointId: 'ceasefire-or-collapse', countryId: 'UKR', title: 'Ceasefire or Collapse', seedCode: 'CO-UKR-MAYA1' } },
];
const SIZES = [
  [390, 844],
  [360, 740],
];
/** A badge says one whole thing: an answer named, or what leaving the crisis does. */
const WHOLE = /^(Recommended|Accepted|Your pick|Staff attend): \S.*\S$|^No answer yet\. If you leave it: \S.*\S$|^A deputy goes$|^Staff would answer: \S.*\S$|^Waiting for you$/;

/** Every selection badge on a stage, measured against the viewport and its clipping ancestors. */
const measure = (p) =>
  p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return [...document.querySelectorAll('article.stage .sel-badge')].map((b) => {
      const r = b.getBoundingClientRect();
      let cutBy = '';
      for (let e = b.parentElement; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.overflowX === 'visible') continue;
        const er = e.getBoundingClientRect();
        if (r.right > er.right + 1 || r.left < er.left - 1) {
          cutBy = `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`;
          break;
        }
      }
      return {
        text: (b.textContent ?? '').replace(/\s+/g, ' ').trim(),
        left: Math.round(r.left),
        right: Math.round(r.right),
        vw,
        scroll: b.scrollWidth,
        client: b.clientWidth,
        cutBy,
        stage: (b.closest('article.stage')?.querySelector('.stage-title')?.textContent ?? '').trim(),
      };
    });
  });

async function checkBadges(g, p, where) {
  await p.waitForTimeout(500);
  const badges = await measure(p);
  g.check(badges.length > 0, `${where}: a selection badge is on the desk (${badges.length})`);
  for (const b of badges) {
    const w = `${where} "${b.stage}"`;
    g.check(b.left >= 0 && b.right <= b.vw, `${w}: the badge lies inside the screen (${b.left} to ${b.right} px of ${b.vw}): "${b.text}"`);
    g.check(b.scroll <= b.client + 1, `${w}: the badge text is not clipped (scrollWidth ${b.scroll}, clientWidth ${b.client})`);
    g.check(!b.cutBy, `${w}: no ancestor cuts the badge off (${b.cutBy || 'none'})`);
    g.check(WHOLE.test(b.text), `${w}: the badge carries a whole sentence ("${b.text}")`);
  }
  const page = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  g.check(page.sw <= page.cw, `${where}: no horizontal scroll (page ${page.sw} px, screen ${page.cw} px)`);
}

/** Pick the answer with the longest label on the first crisis stage (a long "Your pick: ..."). */
async function pickLongest(p) {
  const cards = p.locator('article.stage .move-card');
  const n = await cards.count();
  let best = -1;
  let len = -1;
  for (let i = 0; i < n; i++) {
    const t = ((await cards.nth(i).locator('.wc-card-title').first().textContent().catch(() => '')) ?? '').trim();
    if (t.length > len) {
      len = t.length;
      best = i;
    }
  }
  if (best < 0) return false;
  await cards.nth(best).scrollIntoViewIfNeeded().catch(() => {});
  await cards.nth(best).click({ timeout: 3000 }).catch(() => {});
  return true;
}

async function nextMonth(s) {
  const p = s.page;
  if (!(await s.click(/Execute month/i, { timeout: 12000 }))) throw new Error('Execute month not clickable');
  const next = p.getByRole('button', { name: /^Next month/i }).first();
  await next.waitFor({ timeout: 30000 });
  for (let i = 0; i < 3 && (await next.isVisible().catch(() => false)); i++) {
    await next.click().catch(() => {});
    await p.waitForTimeout(1500);
  }
  await p.waitForTimeout(1500);
}

await run('D84-BADGE-FIT', async (g, track) => {
  for (const [W, H] of SIZES)
    for (const { name, months, seat } of SEATS) {
      const tag = `${name}-${W}x${H}`;
      const s = track(await startGame({ variant: `d84-badge-${tag}`, device: `${W}x${H}`, out: path.join(out, tag), base, seat }));
      const p = s.page;
      for (let m = 1; m <= months; m++) {
        const where = `${tag} month ${m}`;
        await checkBadges(g, p, `${where} open`);
        await s.look(`${where}-open`.replace(/\W+/g, '-'));
        if (m === 1 && (await pickLongest(p))) await checkBadges(g, p, `${where} after picking the longest answer`);
        if (m === 2) {
          await s.click(/^Review \d+ recommended/i, { timeout: 800 });
          if (await s.click(/^Accept all recommended/i, { timeout: 1500 })) {
            await s.key('Escape');
            await checkBadges(g, p, `${where} after Accept all`);
          }
        }
        if (m < months) await nextMonth(s);
      }
      g.check(!s.errors.length, `${tag}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
    }
});
