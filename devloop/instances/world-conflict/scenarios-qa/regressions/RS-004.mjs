// RS-004 (CEO playtest): after the reveal there must always be a clear way back to play again.
// Checks the staged reveal and the final report at laptop and phone widths:
// "Main menu" is visible in both modes; the report also shows "Play again" without scrolling.
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
    g.check(!s.errors.length, `${device}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
