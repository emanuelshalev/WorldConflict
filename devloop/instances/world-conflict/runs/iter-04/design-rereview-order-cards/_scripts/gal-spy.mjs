// Spy on India tile height in the orders gallery (states section) at 1440 and 390.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:5173/#orders');
await p.waitForSelector('[data-og=states] [data-order-id="spy"][data-order-state]', { timeout: 30000 });
for (const w of [1440, 390]) {
  await p.setViewportSize({ width: w, height: 900 });
  await p.waitForTimeout(800);
  console.log(w, await p.evaluate(() => [...document.querySelectorAll('[data-og=states] .ord-wrap')].slice(0, 6).map((e) => `${e.dataset.orderId}:${e.dataset.orderState} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`).join(' | ')));
}
await b.close();
