// Confirmation pass: desktop look, Recommended sentence on/off, a deputy badge. node confirm2.mjs <seat> <w> <h> [on]
import fs from 'node:fs';
import path from 'node:path';
import { SCRATCH, SEATS, clean, shot, start } from './lib.mjs';

const [seatKey, W, H, mode] = process.argv.slice(2);
const w = Number(W), h = Number(H), chief = mode === 'on';
const tag = `${seatKey}-${w}x${h}${chief ? '-on' : ''}`;
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const { ctx, page: p, errors } = await start({ seat: SEATS[seatKey], w, h, chief, tag: `cf2-${tag}` });
const badges = async () => p.evaluate(() => [...document.querySelectorAll('.sel-badge')].filter((b) => b.getBoundingClientRect().width > 0).map((b) => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); return `${b.textContent.trim()} [${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)} radius ${s.borderRadius}]`; }));
try {
  await shot(p, `cf2-${tag}-m1`);
  say(`m1 badges: ${(await badges()).join(' | ')}`);
  await p.getByRole('button', { name: /Execute month/i }).first().click({ timeout: 12000 });
  const next = p.getByRole('button', { name: /^Next month/i }).first();
  await next.waitFor({ timeout: 40000 });
  for (let i = 0; i < 3 && (await next.isVisible().catch(() => false)); i++) { await next.click().catch(() => {}); await p.waitForTimeout(1500); }
  await p.waitForTimeout(1500);
  if (w < 800) await p.locator('button:has-text("decided")').first().click({ timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(600);
  await shot(p, `cf2-${tag}-m2`);
  say(`m2 badges: ${(await badges()).join(' | ')}`);
  const panel = clean(await p.locator('[data-staff-picks], section.staff-picks').first().innerText().catch(() => ''));
  say(`m2 Recommended panel: ${panel.slice(0, 700)}`);
  if (w < 800) await p.locator('button:has-text("decided")').first().click({ timeout: 3000 }).catch(() => {});
  // Full desk, then each meeting in the navigator
  await p.getByRole('tab', { name: /Full desk/i }).first().click().catch(() => p.getByRole('button', { name: /Full desk/i }).first().click().catch(() => {}));
  await p.waitForTimeout(900);
  const navRows = await p.evaluate(() => [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).filter((l) => /: (A deputy|Open|Recommended|No answer|Accepted)/.test(l ?? '')));
  say(`nav labels: ${navRows.join(' || ')}`);
  const dep = navRows.find((l) => /deputy/i.test(l));
  const target = dep ?? navRows.find((l) => /Staff meeting|Open/.test(l));
  const meet = p.locator('nav.navigator').getByText(/Staff meeting|^Call$/).first();
  if (await meet.click({ timeout: 3000 }).then(() => true, () => false)) {
    await p.waitForTimeout(900);
    await p.evaluate(() => document.querySelector('.sel-badge')?.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await p.evaluate(() => { for (const x of document.querySelectorAll('*')) if (x.scrollLeft) x.scrollLeft = 0; });
    await p.waitForTimeout(500);
    await shot(p, `cf2-${tag}-m2-meeting`);
    say(`meeting badges: ${(await badges()).join(' | ')}`);
  } else say('no meeting in navigator');
  if (false) {
    await p.locator(`[aria-label="${target.replace(/"/g, '\\"')}"]`).first().click({ timeout: 3000 }).catch((e) => say(`nav click failed ${e.message.split('\n')[0]}`));
    await p.waitForTimeout(900);
    await p.evaluate(() => document.querySelector('.sel-badge')?.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await p.evaluate(() => { for (const x of document.querySelectorAll('*')) if (x.scrollLeft) x.scrollLeft = 0; });
    await p.waitForTimeout(500);
    await shot(p, `cf2-${tag}-m2-meeting`);
    say(`meeting badges: ${(await badges()).join(' | ')}`);
  }
} catch (e) { say(`THREW ${e.message.split('\n')[0]}`); await shot(p, `cf2-${tag}-fail`); }
say(`errors: ${errors.slice(0, 3).join(' | ')}`);
fs.writeFileSync(path.join(SCRATCH, `confirm2-${tag}.txt`), log.join('\n'));
await ctx.close();
