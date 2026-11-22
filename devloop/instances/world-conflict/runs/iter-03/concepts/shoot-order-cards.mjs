// Screenshots for the order-card concepts: node shoot-order-cards.mjs [name...]
import { chromium } from '/home/emanuel/git/WorldConflict/node_modules/playwright/index.mjs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const jobs = [
  ['order-icons/contact-sheet.html', 'order-icons/contact-sheet.png', 1440],
  ['order-icons-recognition-sheet.html', 'order-icons-recognition-sheet.png', 1300],
  ['order-cards-catalog.html', 'order-cards-catalog-1440.png', 1440],
  ['order-cards-catalog.html', 'order-cards-catalog-390.png', 390],
  ['order-cards-map-menu.html', 'order-cards-map-menu-1440.png', 1440],
  ['order-cards-map-menu.html', 'order-cards-map-menu-390.png', 390],
  ['order-cards-staff-picks.html', 'order-cards-staff-picks-1440.png', 1440],
  ['order-cards-staff-picks.html', 'order-cards-staff-picks-390.png', 390],
  ['order-cards-states.html', 'order-cards-states-1440.png', 1440],
  ['order-cards-states.html', 'order-cards-states-390.png', 390],
];
const only = process.argv.slice(2);
const b = await chromium.launch();
for (const [src, out, w] of jobs) {
  if (only.length && !only.some((o) => src.includes(o))) continue;
  const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: w < 500 ? 2 : 1 });
  try { await p.goto('file://' + path.join(here, src)); } catch { await p.close(); continue; }
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(here, out), fullPage: true });
  await p.close();
  console.log('shot', out);
}
await b.close();
