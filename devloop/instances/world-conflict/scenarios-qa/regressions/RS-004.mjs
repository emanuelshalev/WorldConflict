// RS-004 (CEO playtest): after the reveal there must always be a clear way back to play again.
// Checks the staged reveal and the final report at laptop and phone widths:
// "Main menu" is visible in both modes; the report also shows "Play again" without scrolling.
// QA3-S2-2: at 360 to 600 px Main menu must not cover the phone top bar's sound button or Skip.
// Called like every guard here (_lib.mjs): node RS-004.mjs <outDir> <baseUrl> <apiUrl>
// (it used to read the base URL from argv[2], which the gate fills with the output folder).
import path from 'node:path';
import { launch } from '../../../../kit/kit.mjs';
import { args, run } from './_lib.mjs';

const { out, base } = args('RS-004');

await run('RS-004', async (g, track) => {
  for (const device of ['laptop', 'phone']) {
    const s = track(await launch({ variant: `rs004-${device}`, device, out: path.join(out, device), base }));
    for (const route of ['#reveal-demo/0', '#reveal-demo/report']) {
      // Hash-only navigation does not reload the SPA, and the demo reads its stage at load
      await s.page.goto(`${base}${route}`);
      await s.page.reload();
      await s.page.waitForTimeout(1500);
      const menu = s.page.getByRole('button', { name: /main menu/i }).first();
      const menuOk = await menu.isVisible().catch(() => false);
      const box = menuOk ? await menu.boundingBox() : null;
      const vp = s.page.viewportSize();
      g.check(menuOk && box && box.y >= 0 && box.y + box.height <= (vp?.height ?? 0), `${device} ${route}: Main menu visible without scrolling`);
      if (route.endsWith('report')) {
        const again = s.page.getByRole('button', { name: /^play again$/i }).first();
        g.check(await again.isVisible().catch(() => false), `${device} ${route}: Play again visible`);
      }
    }
    // The demo wires Main menu to a notice; in a real game it returns to the title screen.
    await s.page.goto(`${base}#reveal-demo/report`);
    await s.page.reload();
    await s.page.waitForTimeout(1200);
    await s.page.getByRole('button', { name: /main menu/i }).first().click();
    await s.page.waitForTimeout(600);
    const said = await s.page.evaluate(() => document.body.innerText.includes('return to the title screen'));
    g.check(said, `${device}: Main menu is wired to New game (title screen)`);
    if (device === 'phone') {
      // QA3-S2-2: below 700 px Main menu lay on top of the sound button and Skip (tapping Skip left
      // the reveal). At each narrow width the top of the staged reveal must answer a tap at the
      // centre of Skip and of the sound button with that control, and Main menu stays clear of both.
      for (const width of [360, 390, 430, 600]) {
        await s.page.setViewportSize({ width, height: 844 });
        await s.page.goto(`${base}#reveal-demo/1`);
        await s.page.reload();
        await s.page.waitForTimeout(1200);
        const hits = await s.page.evaluate(() => {
          const vis = (el) => !!el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden';
          const skip = [...document.querySelectorAll('.rv-dots .rv-skip')].find(vis);
          const sound = [...document.querySelectorAll('.rv-dots .rv-dots-sound')].find(vis);
          const menu = [...document.querySelectorAll('button[aria-label="Main menu"]')].find(vis);
          const at = (el) => {
            if (!el) return { found: false, own: false, on: 'not found' };
            const b = el.getBoundingClientRect();
            const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
            const on = top ? (top.closest('button,a')?.getAttribute('aria-label') ?? top.textContent ?? '').trim().slice(0, 24) : 'nothing';
            return { found: true, own: !!top && (top === el || el.contains(top)), on };
          };
          const box = (el) => el?.getBoundingClientRect();
          const clash = (a, c) => !!a && !!c && a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1;
          return { skip: at(skip), sound: at(sound), menu: !!menu, menuClash: clash(box(menu), box(skip)) || clash(box(menu), box(sound)) };
        });
        g.check(hits.skip.own, `phone ${width}px: a tap on Skip reaches Skip (top element: "${hits.skip.on}")`);
        g.check(hits.sound.own, `phone ${width}px: a tap on the sound button reaches it (top element: "${hits.sound.on}")`);
        g.check(hits.menu && !hits.menuClash, `phone ${width}px: Main menu is shown and clear of sound and Skip`);
        if (width === 390) await s.look('phone-390-topbar');
      }
    }
    g.check(!s.errors.length, `${device}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
