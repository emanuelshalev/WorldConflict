// Design review "Your call": the Settings rows "Staff propose orders" and "Let the Chief of Staff
// make my calls" at every size: screenshot of the row, its wrap (lines), the checkbox and label hit
// sizes, and whether the row is reachable without horizontal scroll.
//   node settings.mjs <evidenceDir> <device> <WxH,...>
import fs from 'node:fs';
import path from 'node:path';
import { startGame } from '../../../../scenarios-qa/regressions/_lib.mjs';

const ev = path.resolve(process.argv[2]);
const DEVICE = process.argv[3];
const SIZES = process.argv[4].split(',').map((s) => s.split('x').map(Number));
const tmp = path.join(process.env.TEMP ?? '/tmp', `wc-yc-set-${DEVICE}`);
const out = [];
const log = (m) => {
  out.push(m);
  console.log(m);
};
const s = await startGame({ variant: `yc-set-${DEVICE}`, device: DEVICE, out: tmp, base: 'http://localhost:5173/' });
const p = s.page;

async function openSettings() {
  if (await p.locator('[role="dialog"][aria-label="Settings"]').isVisible().catch(() => false)) return true;
  const direct = p.locator('button[aria-label="Settings"]').first();
  if (await direct.isVisible().catch(() => false)) {
    await direct.click();
  } else {
    // Phone: the menu
    await p.locator('.hud button[aria-label*="enu" i], button[aria-label*="Menu" i], button[aria-label*="More" i]').first().click().catch(() => {});
    await p.waitForTimeout(500);
    await p.getByRole('button', { name: /Settings/i }).first().click().catch(() => p.getByText(/^Settings/).first().click().catch(() => {}));
  }
  await p.waitForTimeout(800);
  return p.locator('[role="dialog"][aria-label="Settings"]').isVisible().catch(() => false);
}

for (const [w, h] of SIZES) {
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(700);
  const ok = await openSettings();
  log(`=== ${w}x${h} settings open: ${ok}`);
  if (!ok) {
    await p.screenshot({ path: path.join(ev, `settings-fail-${w}x${h}.jpg`), type: 'jpeg', quality: 70 });
    continue;
  }
  const rows = p.locator('label.setting-row').filter({ hasText: /Staff propose orders|Chief of Staff make my calls/ });
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const r = rows.nth(i);
    await r.scrollIntoViewIfNeeded();
    const m = await r.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const cb = el.querySelector('input').getBoundingClientRect();
      const span = el.querySelector('span');
      const lh = parseFloat(getComputedStyle(span).lineHeight) || 20;
      const fs = getComputedStyle(span).fontSize;
      const hit = document.elementFromPoint(cb.left + cb.width / 2, cb.top + cb.height / 2);
      return {
        text: el.innerText.replace(/\s+/g, ' ').trim(),
        row: `x${Math.round(b.left)} y${Math.round(b.top)} w${Math.round(b.width)} h${Math.round(b.height)}`,
        checkbox: `w${Math.round(cb.width)} h${Math.round(cb.height)}`,
        lines: Math.round(span.getBoundingClientRect().height / lh),
        font: fs,
        checkboxHitsLabel: el.contains(hit),
        checked: el.querySelector('input').checked,
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    log(`row ${i}: ${JSON.stringify(m)}`);
  }
  // Screenshot the two rows together
  const last = rows.nth(n - 1);
  await last.scrollIntoViewIfNeeded();
  const b1 = await rows.nth(0).boundingBox();
  const b2 = await last.boundingBox();
  if (b1 && b2) {
    const y = Math.max(0, Math.min(b1.y, b2.y) - 40);
    const clip = { x: 0, y, width: w, height: Math.min(h - y, Math.max(b1.y + b1.height, b2.y + b2.height) - y + 60) };
    await p.screenshot({ path: path.join(ev, `settings-rows-${w}x${h}.jpg`), type: 'jpeg', quality: 70, clip });
  }
  await p.screenshot({ path: path.join(ev, `settings-${w}x${h}.jpg`), type: 'jpeg', quality: 70 });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
}
log(`page errors: ${s.errors.join(' | ') || 'none'}`);
fs.writeFileSync(path.join(ev, `probe-settings-${DEVICE}.txt`), out.join('\n'));
await s.close();
