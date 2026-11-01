// Screenshot one scene from the dev gallery: node scripts/shoot-scene.cjs <kind> <out.png> [port]
const { chromium } = require('playwright');
(async () => {
  const [kind, out, port = '5173'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${port}/#scenes/${kind}`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out, fullPage: true });
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
  await browser.close();
})();
