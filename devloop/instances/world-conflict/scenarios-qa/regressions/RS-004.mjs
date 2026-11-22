// RS-004 (CEO playtest): after the reveal there must always be a clear way back to play again.
// Checks the staged reveal and the final report at laptop and phone widths:
// "Main menu" is visible in both modes; the report also shows "Play again" without scrolling.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/RS-004.mjs [baseUrl]
import { launch } from '../../../../kit/kit.mjs';

const base = process.argv[2] ?? process.env.DEVLOOP_BASE_URL ?? 'http://localhost:5173/';
let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) failed++;
};
for (const device of ['laptop', 'phone']) {
  const s = await launch({ variant: `rs004-${device}`, device, out: `/tmp/playtest/rs004-${device}`, base });
  try {
    for (const route of ['#reveal-demo/0', '#reveal-demo/report']) {
      // Hash-only navigation does not reload the SPA, and the demo reads its stage at load
      await s.page.goto(`${base}${route}`);
      await s.page.reload();
      await s.page.waitForTimeout(1500);
      const menu = s.page.getByRole('button', { name: /main menu/i }).first();
      const menuOk = await menu.isVisible().catch(() => false);
      const box = menuOk ? await menu.boundingBox() : null;
      const vp = s.page.viewportSize();
      check(menuOk && box && box.y >= 0 && box.y + box.height <= (vp?.height ?? 0), `${device} ${route}: Main menu visible without scrolling`);
      if (route.endsWith('report')) {
        const again = s.page.getByRole('button', { name: /^play again$/i }).first();
        check(await again.isVisible().catch(() => false), `${device} ${route}: Play again visible`);
      }
    }
    // The demo wires Main menu to a notice; in a real game it returns to the title screen.
    await s.page.goto(`${base}#reveal-demo/report`);
    await s.page.reload();
    await s.page.waitForTimeout(1200);
    await s.page.getByRole('button', { name: /main menu/i }).first().click();
    await s.page.waitForTimeout(600);
    const said = await s.page.evaluate(() => document.body.innerText.includes('return to the title screen'));
    check(said, `${device}: Main menu is wired to New game (title screen)`);
  } finally {
    await s.close();
  }
}
if (failed) {
  console.error(`RS-004: ${failed} check(s) failed`);
  process.exit(1);
}
console.log('RS-004 OK');
