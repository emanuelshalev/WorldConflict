// Records game footage for the landing page from the dev servers (npm run dev).
// node site/tools/record-game.cjs -> site/assets/clips/{globe,reel}.mp4, site/assets/img/*.jpg
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const OUT = path.join(__dirname, '..', 'assets');
const TMP = path.join(OUT, 'clips', '.raw');
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });

// ss < 0 counts from the end (Playwright's video timeline doesn't match wall time)
const enc = (raw, out, ss, t, w, crf = 27) =>
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ss < 0 ? '-sseof' : '-ss', String(ss), '-i', raw, '-t', String(t), '-vf', `scale=${w}:-2,fps=30`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]);

async function startGame(page) {
  page.on('dialog', (d) => d.accept());
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /play today/i }).first().click({ force: true, timeout: 60000 });
  await page.waitForSelector('.desk', { timeout: 20000 });
  await page.waitForTimeout(800);
  for (let k = 0; k < 3; k++) {
    const b = page.locator('.overlay .wc-btn.primary').first();
    if (!(await b.count()) || !(await b.isVisible().catch(() => false))) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.locator('.coach .wc-btn, .tip button').first().click().catch(() => {});
}

(async () => {
  const browser = await chromium.launch();

  // 1) Globe: chrome hidden, slow spin across the hot zones
  if (process.argv[2] !== 'reel') {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, recordVideo: { dir: TMP, size: { width: 1600, height: 900 } } });
    const page = await ctx.newPage();
    await startGame(page);
    await page.addStyleTag({ content: '.hud,.desk,.objective-chip,.mission-chip,.ticker,.maplibregl-control-container,.map-container > div:not(:first-child):not(.map-sheen){display:none!important} .game{--under-top:0px;--under-bottom:0px} .game .map-stage{grid-row:1/-1}' });
    await page.evaluate(() => {
      const m = window.__wcMap;
      m.resize();
      m.setPadding({ top: 0, bottom: 0, left: 620, right: 0 });
      m.jumpTo({ center: [10, 28], zoom: 2.15 });
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__wcMap.easeTo({ center: [100, 24], zoom: 2.3, duration: 14000, easing: (x) => x }));
    await page.waitForTimeout(14200);
    const v = page.video();
    await ctx.close();
    const raw = await v.path();
    enc(raw, path.join(OUT, 'clips', 'globe.mp4'), -14, 14, 1600, 28);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1', '-i', path.join(OUT, 'clips', 'globe.mp4'), '-frames:v', '1', '-q:v', '4', path.join(OUT, 'clips', 'globe.jpg')]);
    fs.unlinkSync(raw);
    console.log('globe done');
  }

  // 2) Desk still, then the outcome reel and the paper
  if (process.argv[2] !== 'globe') {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: TMP, size: { width: 1440, height: 900 } } });
    const page = await ctx.newPage();
    await startGame(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, 'img', 'desk.jpg'), quality: 82, type: 'jpeg' });
    await page.locator('.desk .option').first().click();
    const sugg = page.locator('.desk .suggestion:not([disabled])');
    for (let k = 0; k < 2 && (await sugg.count()); k++) {
      await sugg.first().click();
      await page.waitForTimeout(900);
    }
    await page.getByRole('button', { name: /execute month/i }).click();
    await page.waitForSelector('.reel');
    await page.waitForTimeout(3600 * 3 + 2600);
    await page.screenshot({ path: path.join(OUT, 'img', 'board.jpg'), quality: 82, type: 'jpeg' });
    await page.locator('.reel-foot .wc-btn').click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT, 'img', 'chronicle.jpg'), quality: 82, type: 'jpeg' });
    const v = page.video();
    await ctx.close();
    const raw = await v.path();
    enc(raw, path.join(OUT, 'clips', 'reel.mp4'), -17.5, 15, 1280, 28);
    fs.unlinkSync(raw);
    console.log('reel done');
  }
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
})();
