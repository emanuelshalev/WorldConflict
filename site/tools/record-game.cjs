// Records game footage for the landing page from the dev servers (npm run dev), frame by
// frame on a virtual clock (see framecap.cjs) so the video is smooth on any machine.
//   node site/tools/record-game.cjs [inspect|execute|reel]
// -> site/assets/clips/{inspect,execute,reel}.mp4 (+ posters), site/assets/img/{briefing,advisors,desk,board,chronicle}.jpg
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { installClock, captureClip } = require('./framecap.cjs');

const OUT = path.join(__dirname, '..', 'assets');
const clipPath = (n) => path.join(OUT, 'clips', n);
const still = (n) => path.join(OUT, 'img', n);
fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
const poster = (mp4, jpg, at) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(at), '-i', mp4, '-frames:v', '1', '-q:v', '4', jpg]);

async function newGame(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('dialog', (d) => d.accept());
  await installClock(page);
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /play today/i }).first().click({ force: true, timeout: 60000 });
  await page.waitForSelector('.desk', { timeout: 30000 });
  await page.waitForTimeout(800);
  for (let k = 0; k < 3; k++) {
    const b = page.locator('.overlay .wc-btn.primary').first();
    if (!(await b.count()) || !(await b.isVisible().catch(() => false))) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(400);
  }
  // Dismiss the first-run tip so it doesn't sit in every shot
  await page.getByRole('button', { name: /no more tips/i }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  return page;
}

const only = process.argv[2];
(async () => {
  const browser = await chromium.launch();

  // Hero: the globe on the page's light background, one seamless full turn
  if (only === 'globe') {
    const page = await newGame(browser);
    await page.setViewportSize({ width: 960, height: 960 });
    await page.addStyleTag({
      content: `.hud,.desk,.objective-chip,.mission-chip,.ticker,.maplibregl-control-container,.map-container > div:not(:first-child),.map-action-menu,.reel,.overlay{display:none!important}
        .game{--under-top:0px;--under-bottom:0px;background:#f7f4ee!important} .game .map-stage{grid-row:1/-1}
        .map-container{background:#f7f4ee!important} .map-container::before{display:none!important}`,
    });
    await page.evaluate(() => {
      const m = window.__wcMap;
      m.resize();
      m.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
      // Light, colourful globe: pale ocean, warm land, soft atmosphere matching the page
      m.setPaintProperty('ocean', 'background-color', '#cfe2f7');
      m.setSky({ 'sky-color': '#f7f4ee', 'horizon-color': '#ffffff', 'fog-color': '#f7f4ee', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.9, 'atmosphere-blend': 0.85 });
      if (m.getLayer('land-fill')) m.setPaintProperty('land-fill', 'fill-color', '#e7dfcf');
      if (m.getLayer('land-borders')) m.setPaintProperty('land-borders', 'line-color', '#ffffff');
      if (m.getLayer('graticule')) m.setPaintProperty('graticule', 'line-color', '#b7cde8');
      if (m.getLayer('country-fills')) m.setPaintProperty('country-fills', 'fill-opacity', 0.92);
      if (m.getLayer('country-borders')) m.setPaintProperty('country-borders', 'line-color', ['case', ['get', 'isPlayer'], '#d9480f', '#ffffff']);
      for (const id of ['country-labels', 'capitals', 'capital-dots', 'country-icons', 'pulse-labels', 'order-heads', 'deploy-units']) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', 'none');
      m.jumpTo({ center: [20, 24], zoom: 2.15, bearing: 0, pitch: 0 });
    });
    await page.waitForTimeout(2500);
    await captureClip(page, {
      seconds: Number(process.env.GLOBE_SECONDS ?? 30),
      fps: 24,
      out: clipPath('globe.mp4'),
      width: 900,
      crf: 28,
      onFrame: (f, _t, total) => page.evaluate((lng) => window.__wcMap.jumpTo({ center: [lng, 22 + 6 * Math.sin((lng - 20) * Math.PI / 180)] }), 20 + (360 * f) / total),
    });
    poster(clipPath('globe.mp4'), clipPath('globe.jpg'), 2);
    await page.close();
    console.log('globe done');
  }

  // Step 1: inspect the world. Walk the map layers, then open a country's order menu.
  if (!only || only === 'inspect') {
    const page = await newGame(browser);
    await page.locator('.desk .crisis').first().screenshot({ path: still('briefing.jpg'), quality: 85, type: 'jpeg' });
    await page.screenshot({ path: still('desk.jpg'), quality: 82, type: 'jpeg' });
    await page.locator('.desk-head button').first().click();
    await page.waitForTimeout(1200);
    const layer = (name) => () => page.locator('.layer-bar button', { hasText: name }).first().click().catch(() => {});
    await captureClip(page, {
      seconds: 12,
      out: clipPath('inspect.mp4'),
      width: 1280,
      script: [
        [0.05, () => page.evaluate(() => { const m = window.__wcMap; const c = m.getCenter(); m.easeTo({ center: [c.lng + 14, c.lat + 3], zoom: m.getZoom() + 0.35, duration: 11500, easing: (x) => x * x * (3 - 2 * x) }); })],
        [0.6, layer(/Military/)],
        [2.4, layer(/Economic/)],
        [4.2, layer(/Stability/)],
        [6.0, layer(/Nuclear/)],
        [7.8, layer(/Relations/)],
        [9.2, () => page.mouse.click(820, 300)],
      ],
    });
    poster(clipPath('inspect.mp4'), clipPath('inspect.jpg'), 3);
    await page.close();
    console.log('inspect done');
  }

  // Steps 3 and 4: advisors' orders queued, then Execute and the reel starting
  if (!only || only === 'execute') {
    const page = await newGame(browser);
    const sugg = () => page.locator('.desk .suggestion:not([disabled])').first().click().catch(() => {});
    await captureClip(page, {
      seconds: 10,
      out: clipPath('execute.mp4'),
      width: 1280,
      script: [
        [0.5, () => page.locator('.desk .option').first().click().catch(() => {})],
        [1.6, sugg],
        [3.0, sugg],
        [4.4, () => page.locator('.desk .orders').first().screenshot({ path: still('advisors.jpg'), quality: 85, type: 'jpeg' }).catch(() => {})],
        [4.6, () => page.getByRole('button', { name: /execute month/i }).click()],
      ],
    });
    poster(clipPath('execute.mp4'), clipPath('execute.jpg'), 1);
    await page.close();
    console.log('execute done');
  }

  // Step 5: the outcome reel from start to the paper
  if (!only || only === 'reel') {
    const page = await newGame(browser);
    await page.locator('.desk .option').first().click();
    for (let k = 0; k < 2; k++) {
      await page.locator('.desk .suggestion:not([disabled])').first().click().catch(() => {});
      await page.waitForTimeout(1200);
    }
    await page.getByRole('button', { name: /execute month/i }).click();
    await page.waitForSelector('.reel', { timeout: 30000 });
    const shots = await page.locator('.reel-dots span').count();
    // Each shot advances on its own timer; the last (the scoreboard) waits for a click
    const seconds = Math.min(26, 1.2 + (shots - 1) * 5.4 + 4);
    await captureClip(page, {
      seconds,
      out: clipPath('reel.mp4'),
      width: 1280,
      crf: 27,
      script: [[seconds - 1.2, () => page.screenshot({ path: still('board.jpg'), quality: 82, type: 'jpeg' })]],
    });
    await page.locator('.reel-foot .wc-btn').click().catch(() => {});
    await page.evaluate(() => window.__clockAdvance(2000));
    await page.screenshot({ path: still('chronicle.jpg'), quality: 82, type: 'jpeg' });
    await page.close();
    console.log('reel done');
  }
  await browser.close();
})();
