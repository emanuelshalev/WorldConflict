// Open a local or remote page, visit every tab-like button, fail on any script error.
// Use before committing status pages or reports.
//   node devloop/kit/page-check.mjs <file-or-url> ["css selector for tabs"] [screenshotDir]
//                                   [--freshness <status-protocol.json>] [--freshness-only]
// --freshness also fails when a section's as-of stamp is older than the last event of its tier
// (method/status-page.md; stamps and events from kit/status-refresh.mjs). Hand-written sections
// that were never stamped are listed as owed without failing.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const fi = argv.indexOf('--freshness');
const protocol = fi >= 0 ? argv.splice(fi, 2)[1] : null;
const onlyFresh = argv.includes('--freshness-only');
const [target, tabSel = '#tabs button', shots] = argv.filter((a) => a !== '--freshness-only');
let failed = false;

if (!onlyFresh) {
  const { chromium } = await import('playwright');
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
    failed = true;
  } else console.log(`PAGE CHECK OK: ${tabs.length} tabs, no errors`);
}

if (protocol) {
  const sr = await import('./status-refresh.mjs');
  const c = await sr.loadProtocol(protocol);
  const pageFile = target && !/^https?:/.test(target) ? path.resolve(target.replace(/^file:\/\//, '')) : c.page;
  const rows = sr.freshness(c, sr.readBlock(fs.readFileSync(pageFile, 'utf8'), 'STAMPS'));
  const stale = rows.filter((r) => r.stale && !(r.hand && r.missing));
  const owed = rows.filter((r) => r.stale && r.hand && r.missing);
  for (const r of stale) console.error(`STALE ${r.id} [${r.tier}]: stamp ${r.stamp ?? 'none'}, last ${r.tier} event ${r.last}`);
  for (const r of owed) console.log(`owed  ${r.id} [${r.tier}]: hand-written, never stamped${r.fields ? ` (${r.fields.join(', ')})` : ''}`);
  if (stale.length) {
    console.error(`FRESHNESS FAIL: ${stale.length} of ${rows.length} sections stale`);
    failed = true;
  } else console.log(`FRESHNESS OK: ${rows.length - owed.length} sections current${owed.length ? `, ${owed.length} hand section(s) owed` : ''}`);
}
process.exit(failed ? 1 : 0);
