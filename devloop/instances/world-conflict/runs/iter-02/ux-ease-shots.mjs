// Iteration 2 (ux-ease): screenshots and layout checks of the screens the fixes touch, at phone
// (390), tablet (1024x768) and laptop (1440).
//   DEVLOOP_BASE_URL=http://localhost:5293/ node devloop/instances/world-conflict/runs/iter-02/ux-ease-shots.mjs <outDir> [phone,tablet,laptop]
// Title, briefing, month 1 desk, All orders + country picker (typed), map mode, Execute, result
// card, month 2 desk. Exits non-zero when a check fails (F-01-1, F-01-4, Sam's tablet, QA S2-1/S3-3/S3-5).
import { launch } from '../../../../kit/kit.mjs';

const out = process.argv[2] ?? '/tmp/playtest/ux-ease';
const devices = (process.argv[3] ?? 'phone,tablet,laptop').split(',');
const failures = [];
const check = (device, ok, what) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${device}: ${what}`);
  if (!ok) failures.push(`${device}: ${what}`);
};

for (const device of devices) {
  const s = await launch({ variant: `ux-${device}`, device, out: `${out}/${device}` });
  const page = s.page;
  try {
    await s.goto();
    await s.look('title');
    await s.click(/^Take office/i);
    await page.waitForTimeout(2500);
    await s.look('briefing');
    check(device, (await page.locator('[data-briefing-goals="short"] li').count()) <= 3, 'briefing shows at most 3 goals');
    await s.click(/Take office|Begin|Start/i);
    await page.waitForTimeout(1500);
    await s.look('m1-desk');
    check(device, (await page.locator('[data-show-desk]').count()) === 1 && (await page.locator('.desk-stage .advisors').count()) === 0, 'month 1 focus view: crisis and Execute, the rest on demand');
    if (device === 'tablet') {
      const score = page.locator('.game-top .stat.score');
      check(device, await score.isVisible(), 'HUD shows Score (all seven indicators) at 1024');
    }
    // Full desk, All orders, the country picker
    await s.click(/Full desk/i);
    await page.waitForTimeout(800);
    if (await s.click(/All orders/i)) {
      await s.look('catalog');
      if (await s.click(/Target country/i)) {
        await s.look('picker');
        const rows = await page.locator('.cp-row').evaluateAll((els) => els.slice(0, 5).map((e) => e.getBoundingClientRect().height));
        check(device, rows.length > 0 && rows.every((h) => h >= 44), `picker rows are at least 44 px (${rows.map(Math.round).join(',')})`);
        await page.keyboard.type('ira');
        await page.waitForTimeout(300);
        await s.look('picker-typed');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        await s.look('picked');
        const label = await page.locator('[data-country-picker]').first().innerText();
        check(device, /Iran/.test(label), `typing "ira" + Enter picks Iran (trigger: ${label.replace(/\s+/g, ' ')})`);
        check(device, !/\(-?\d+\)/.test(label), 'no bracketed relation numbers');
        if (device === 'laptop') {
          // "Pick on the map": the map waits for a tap (banner), Cancel returns to the desk
          await s.click(/Target country/i);
          await s.click(/Pick on the map/i);
          await page.waitForTimeout(1200);
          await s.look('map-pick');
          check(device, await page.locator('.map-pick-banner').isVisible(), 'Pick on the map: the map asks for a tap');
          // Tap Mexico (fresh camera on the United States at 1440x900): back on the desk, aimed at Mexico
          await s.clickAt(513, 585);
          await page.waitForTimeout(1200);
          await s.look('map-picked');
          const aimed = (await page.locator('[data-country-picker]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
          check(device, /Mexico/.test(aimed), `a tap on the map sets the target (trigger: ${aimed})`);
          await s.click(/Target country/i);
          await s.click(/Pick on the map/i);
          await page.waitForTimeout(800);
          await s.click(/^Cancel$/);
          await page.waitForTimeout(800);
          check(device, (await page.locator('.map-pick-banner').count()) === 0, 'Cancel leaves map pick');
        }
      } else check(device, false, 'country picker trigger found');
    }
    await s.click(/^Map$/i);
    await page.waitForTimeout(1200);
    if (device !== 'laptop') await s.click(/Your advisors suggest/i);
    await s.look('map');
    const advW = await page.locator('.cmd-strip .adv-row').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
    check(device, advW.length === 0 || advW.every((w) => w >= 200), `map strip advisors readable (${advW.map(Math.round).join(',') || 'none'} px wide)`);
    await s.click(/Approve( \d+)?( \w+)? picks?/i);
    if (await s.click(/Execute month/i, { timeout: 12000 })) {
      await page.waitForTimeout(3500);
      await s.look('result');
      const next = page.locator('.rc-next');
      const box = await next.boundingBox();
      const vh = page.viewportSize().height;
      check(device, !!box && box.y + box.height <= vh, `result card: Next month in view (bottom ${box ? Math.round(box.y + box.height) : 'none'} of ${vh})`);
      check(device, (await page.locator('[data-result-big]').count()) <= 1, 'result card: one big outcome');
      await next.click();
      await page.waitForTimeout(1500);
      await s.look('m2-desk');
    }
    console.log(device, 'page errors:', s.errors.slice(0, 5));
    check(device, s.errors.length === 0, 'no page errors');
  } finally {
    await s.close();
  }
}
if (failures.length) {
  console.error(`${failures.length} check(s) failed`);
  process.exitCode = 1;
}
