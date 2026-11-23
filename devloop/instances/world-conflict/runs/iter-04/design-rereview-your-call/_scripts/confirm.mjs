// Confirmation pass c254058. node confirm.mjs <seat> <w> <h> [on]
import fs from 'node:fs';
import path from 'node:path';
import { SCRATCH, SEATS, clean, shot, start } from './lib.mjs';

const [seatKey, W, H, mode] = process.argv.slice(2);
const w = Number(W), h = Number(H), chief = mode === 'on';
const tag = `${seatKey}-${w}x${h}${chief ? '-on' : ''}`;
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const { ctx, page: p, errors } = await start({ seat: SEATS[seatKey], w, h, chief, tag: `cf-${tag}` });

// Scroll the nearest vertical scroller so el sits at 40% height; never touch scrollLeft
const vshow = (sel, nth = 0) => p.evaluate(({ sel, nth }) => {
  const b = [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0)[nth];
  if (!b) return false;
  let e = b.parentElement;
  while (e) { const s = getComputedStyle(e); if (e.scrollHeight > e.clientHeight + 2 && /(auto|scroll)/.test(s.overflowY)) { e.scrollTop += b.getBoundingClientRect().top - innerHeight * 0.4; return true; } e = e.parentElement; }
  window.scrollBy(0, b.getBoundingClientRect().top - innerHeight * 0.4);
  return true;
}, { sel, nth });

const measure = (sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((b) => b.getBoundingClientRect().width > 0).map((b) => {
  const r = b.getBoundingClientRect();
  const lh = parseFloat(getComputedStyle(b).lineHeight) || 20;
  const pts = [[r.left + 6, r.top + r.height / 2], [r.right - 6, r.top + r.height / 2], [r.left + r.width / 2, r.top + 6], [r.left + r.width / 2, r.bottom - 6]];
  const covered = pts.map(([x, y]) => { if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) return 'off'; const hit = document.elementFromPoint(x, y); return hit && (b.contains(hit) || hit.contains(b)) ? 'ok' : `${hit?.tagName}.${String(hit?.className).slice(0, 25)}`; });
  // clipped by any ancestor that hides overflow
  let clip = '';
  let e = b.parentElement;
  while (e) { const s = getComputedStyle(e); if (/(hidden|clip)/.test(s.overflowX)) { const pr = e.getBoundingClientRect(); if (r.right > pr.right + 1 || r.left < pr.left - 1) clip = `clipped by ${e.className.slice(0, 25)} (${Math.round(pr.left)}-${Math.round(pr.right)})`; } e = e.parentElement; }
  return { text: b.textContent.replace(/\s+/g, ' ').trim(), l: Math.round(r.left), r: Math.round(r.right), top: Math.round(r.top), hgt: Math.round(r.height), lines: Math.round((r.height - 10) / lh), vw: innerWidth, sw: b.scrollWidth, cw: b.clientWidth, covered: covered.join(','), clip };
}), sel);

async function look(name) {
  if (await vshow('.sel-badge')) {
    await p.waitForTimeout(500);
    await shot(p, `cf-${tag}-${name}`);
    for (const m of await measure('.sel-badge')) say(`  ${name} badge ${JSON.stringify(m)}`);
  } else say(`  ${name}: no .sel-badge`);
}
const recText = async () => clean((await p.locator('body').innerText()).match(/Your advisers recommend these[^\n]*/)?.[0] ?? '');

try {
  for (let m = 1; m <= 2; m++) {
    say(`== ${tag} month ${m}`);
    await look(`m${m}`);
    say(`  recommended sentence: ${await recText()}`);
    // pick the longest answer of the open crisis
    const labels = await p.evaluate(() => [...document.querySelectorAll('article.stage h3, article.stage h4, article.stage [class*="card-title"]')].map((e) => e.textContent.trim()).filter((t) => t.length > 3 && t.length < 60));
    say(`  answer labels: ${labels.join(' | ')}`);
    if (m === 2 && labels.length) {
      const longest = labels.reduce((a, b) => (b.length > a.length ? b : a));
      await p.locator('article.stage .wc-card-hit').nth(labels.indexOf(longest)).click({ timeout: 3000, force: true }).catch((e) => say(`  click failed ${e.message.split('\n')[0]}`));
      await p.waitForTimeout(800);
      // a confirm step may appear
      for (const re of [/^Choose/i, /^Pick this/i, /^Confirm/i]) await p.getByRole('button', { name: re }).first().click({ timeout: 600 }).catch(() => {});
      await p.waitForTimeout(500);
      await look(`m2-picked-longest`);
      // deputy badge on a meeting
      const dep = await p.evaluate(() => [...document.querySelectorAll('.sel-badge')].map((b) => b.textContent.trim()));
      say(`  badges now: ${dep.join(' | ')}`);
      // phone: open the plan sheet and Accept all; desktop: rail Accept all
      if (w < 800) {
        await p.locator('button:has-text("decided")').first().click({ timeout: 3000 }).catch(() => say('  no plan bar'));
        await p.waitForTimeout(800);
        await shot(p, `cf-${tag}-m2-sheet`);
        say(`  sheet recommended sentence: ${await recText()}`);
        const aa = p.getByRole('button', { name: /^Accept all recommended/i }).first();
        await aa.scrollIntoViewIfNeeded().catch(() => {});
        await aa.click({ timeout: 3000 }).catch(() => say('  no Accept all in the sheet'));
        await p.waitForTimeout(800);
        await shot(p, `cf-${tag}-m2-sheet-after-accept`);
        say(`  button: ${clean((await p.locator('.sp-main').allInnerTexts().catch(() => [])).join(' | '))}`);
        await p.locator('button:has-text("decided")').first().click({ timeout: 3000 }).catch(() => say('  could not close sheet'));
        await p.waitForTimeout(800);
      } else {
        await p.getByRole('button', { name: /^Accept all recommended/i }).first().click({ timeout: 3000 }).catch(() => say('  no Accept all'));
        await p.waitForTimeout(800);
      }
      await look('m2-after-accept');
      // walk to meetings: find a deputy badge in the agenda
      const n = await p.evaluate(() => [...document.querySelectorAll('.sel-badge')].length);
      say(`  sel-badges on the page: ${n}`);
      const depIdx = await p.evaluate(() => [...document.querySelectorAll('.sel-badge')].filter((e) => e.getBoundingClientRect().width > 0).findIndex((b) => /deputy/i.test(b.textContent)));
      if (depIdx >= 0) { await vshow('.sel-badge', depIdx); await p.waitForTimeout(400); await shot(p, `cf-${tag}-m2-deputy`); }
      else {
        // try next item in the stage (meetings follow the crisis on the Focus desk)
        const nextBtn = p.getByRole('button', { name: /^Next/i }).filter({ hasNotText: /month/i }).first();
        for (let i = 0; i < 5; i++) {
          if (!(await nextBtn.click({ timeout: 800 }).then(() => true, () => false))) break;
          await p.waitForTimeout(700);
          const t = await p.evaluate(() => [...document.querySelectorAll('.sel-badge')].map((b) => b.textContent.trim()).join(' | '));
          say(`  next item badges: ${t}`);
          if (/deputy/i.test(t)) { await vshow('.sel-badge'); await p.waitForTimeout(400); await shot(p, `cf-${tag}-m2-deputy`); for (const mm of await measure('.sel-badge')) say(`  deputy badge ${JSON.stringify(mm)}`); break; }
        }
      }
      break;
    }
    await p.getByRole('button', { name: /Execute month/i }).first().click({ timeout: 12000 });
    const next = p.getByRole('button', { name: /^Next month/i }).first();
    await next.waitFor({ timeout: 40000 });
    for (let i = 0; i < 3 && (await next.isVisible().catch(() => false)); i++) { await next.click().catch(() => {}); await p.waitForTimeout(1500); }
    await p.waitForTimeout(1500);
  }
} catch (e) { say(`THREW ${e.message.split('\n')[0]}`); await shot(p, `cf-${tag}-fail`); }
say(`errors: ${errors.slice(0, 3).join(' | ')}`);
fs.writeFileSync(path.join(SCRATCH, `confirm-${tag}.txt`), log.join('\n'));
await ctx.close();
