// Iteration 3, design-agenda (D-65): screenshots the concept mocks at laptop, tablet and phone width.
//   node devloop/instances/world-conflict/runs/iter-03/agenda-shots.mjs [name ...]
import { chromium } from '../../../../../node_modules/playwright/index.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync } from 'node:fs';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'concepts');
const only = process.argv.slice(2);
const pages = readdirSync(dir).filter((f) => /^agenda-.*\.html$/.test(f)).map((f) => f.replace(/\.html$/, '')).filter((n) => !only.length || only.includes(n));
const sizes = [
  { w: 1440, h: 900, tag: '1440' },
  { w: 1024, h: 768, tag: '1024', only: (n) => n === 'agenda-a-desk-m4' || n.startsWith('agenda-h-') },
  { w: 390, h: 844, tag: '390', full: true },
];
const browser = await chromium.launch();
for (const name of pages) {
  for (const s of sizes) {
    if (s.only && !s.only(name)) continue;
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(join(dir, `${name}.html`)).href);
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await page.screenshot({ path: join(dir, `${name}-${s.tag}.png`), fullPage: !!s.full });
    console.log(`${name}-${s.tag}.png${overflow ? '  (horizontal overflow!)' : ''}`);
    await page.close();
  }
}
await browser.close();
