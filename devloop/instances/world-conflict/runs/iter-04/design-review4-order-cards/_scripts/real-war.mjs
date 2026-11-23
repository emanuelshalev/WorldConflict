// Review 4, caveat B on a real seat: Hormuz Convoy as the United States (the guards' default seat,
// seed 4242), phone 360x740 and 390x844, target Iran: the declare war / nuclear strike / mission
// faces in the real desk catalogue, their height against the free stage, title and answers visible.
//   node real-war.mjs <evidenceDir> <width> <height> [target]
import fs from 'node:fs';
import path from 'node:path';
import { startGame, SEAT } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const W = Number(process.argv[3] ?? 360);
const H = Number(process.argv[4] ?? 740);
const TARGET = process.argv[5] ?? 'Iran';
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-r4-war-${W}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `r4-war-${W}`, device: 'phone', out: tmp, base: 'http://localhost:5173/', seat: SEAT });
const p = s.page;
await p.setViewportSize({ width: W, height: H });
await p.waitForTimeout(600);
const tag = `${W}x${H}`;
const sel = (id) => `[data-order-catalog] .ord-wrap[data-order-id="${id}"]`;
const state = (id) => p.locator(sel(id)).first().getAttribute('data-order-state').catch(() => 'absent');
const facts = () =>
  p.evaluate(() => {
    const f = document.querySelector('.ord-confirm');
    if (!f) return 'NO FACE';
    const st = document.querySelector('#desk-stage').getBoundingClientRect();
    const bar = document.querySelector('aside.cmd-bar')?.getBoundingClientRect();
    const fr = f.getBoundingClientRect();
    const q = f.querySelector('h3, h4, [data-confirm-title], .ord-confirm-q');
    const t = q?.getBoundingClientRect();
    const tAt = t ? document.elementFromPoint(t.left + 10, t.top + t.height / 2) : null;
    const one = (k) => {
      const b = f.querySelector(k);
      const r = b.getBoundingClientRect();
      const ok = [
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + 6, r.top + 6],
        [r.right - 6, r.top + 6],
        [r.left + 6, r.bottom - 6],
        [r.right - 6, r.bottom - 6],
      ].map(([x, y]) => (y > 0 && y < innerHeight && b.contains(document.elementFromPoint(x, y)) ? 1 : 0)).join('');
      return `${b.innerText.trim().replace(/\s+/g, ' ')} y${Math.round(r.top)}..${Math.round(r.bottom)} uncovered=${ok}`;
    };
    return `${f.className} face ${Math.round(fr.top)}..${Math.round(fr.bottom)} h${Math.round(fr.height)}; free stage ${Math.round(st.top)}..${Math.round(bar?.top ?? st.bottom)} = ${Math.round((bar?.top ?? st.bottom) - st.top)} px; title "${q?.innerText.trim()}" top ${t ? Math.round(t.top) : '-'} visible ${t ? !!tAt && q.contains(tAt) : '-'} | ${one('[data-confirm-cancel]')} | ${one('[data-confirm-go]')}`;
  });
try {
  if (await s.click(/^Full desk/i, { timeout: 2000 })) await s.click(/^All orders/i, { timeout: 3000 });
  await p.waitForTimeout(1000);
  await p.getByRole('button', { name: /Target country/i }).first().click();
  await p.waitForTimeout(400);
  await p.keyboard.type(TARGET);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  const ids = ['declare-war', 'nuclear-strike', 'airstrike-military', 'airstrike-nuclear', 'deploy-border', 'arm-rebels', 'assassinate', 'coup', 'break-pact', 'fund-nuclear', 'sabotage'];
  const st = [];
  for (const id of ids) st.push(`${id}=${await state(id)}`);
  log(`${tag} USA, target ${TARGET}: ${st.join(' ')}`);
  for (const id of ids) {
    if ((await state(id)) !== 'available') continue;
    for (const where of [0.5, 'lowest']) {
      await p.evaluate(
        ([q, where]) => {
          const stg = document.querySelector('#desk-stage');
          const w = document.querySelector(q);
          const a = w.querySelector('.ord-act');
          const bar = document.querySelector('aside.cmd-bar').getBoundingClientRect().top;
          const cb = document.querySelector('.coach-bubble')?.getBoundingClientRect();
          if (where === 'lowest') stg.scrollTop += a.getBoundingClientRect().bottom - ((cb ? cb.top : bar) - 4);
          else stg.scrollTop += w.getBoundingClientRect().top - innerHeight * where;
        },
        [sel(id), where],
      );
      await p.waitForTimeout(350);
      const r = await p.locator(`${sel(id)} .ord-act`).first().boundingBox();
      await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
      await p.waitForTimeout(1200);
      const f = await facts();
      log(`${tag} ${id} @${where}: ${f}`);
      if (f !== 'NO FACE') {
        await p.screenshot({ path: path.join(ev, `i3-real-${id}-${where === 'lowest' ? 'lowest' : 'mid'}-${tag}.jpg`), type: 'jpeg', quality: 70 });
        await p.keyboard.press('Escape');
        await p.waitForTimeout(700);
      }
      if ((await state(id)) === 'queued') {
        await p.evaluate((q) => document.querySelector(`${q} .ord-act`).click(), sel(id));
        await p.waitForTimeout(500);
      }
    }
  }
  log(`page errors: ${s.errors.slice(0, 4).join(' | ') || 'none'}`);
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
} finally {
  fs.writeFileSync(path.join(ev, `probe-real-war-${tag}.txt`), `${out.join('\n')}\n`);
  await s.close();
}
