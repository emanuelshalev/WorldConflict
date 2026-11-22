// Open a local or remote page, visit every tab-like button, fail on any script error.
// Use before committing status pages or reports.
//   node devloop/kit/page-check.mjs <file-or-url> ["css selector for tabs"] [screenshotDir]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [target, tabSel = '#tabs button', shots] = process.argv.slice(2);
const url = /^https?:|^file:/.test(target) ? target : `file://${path.resolve(target)}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url);
await page.waitForTimeout(1200);
const tabs = await page.$$(tabSel);
if (shots) fs.mkdirSync(shots, { recursive: true });
for (let i = 0; i < tabs.length; i++) {
  await tabs[i].click();
  await page.waitForTimeout(1500);
  if (shots) await page.screenshot({ path: path.join(shots, `tab-${i}.png`), fullPage: true });
}
await browser.close();
if (errors.length) {
  console.error(`PAGE CHECK FAIL (${errors.length} errors):\n${[...new Set(errors)].slice(0, 5).join('\n')}`);
  process.exit(1);
}
console.log(`PAGE CHECK OK: ${tabs.length} tabs, no errors`);
