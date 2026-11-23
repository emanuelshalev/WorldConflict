import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.png'))) {
  const data = fs.readFileSync(path.join(dir, f)).toString('base64');
  await p.setContent(`<body style="margin:0"><img id=i src="data:image/png;base64,${data}"></body>`);
  const { w, h } = await p.evaluate(() => ({ w: i.naturalWidth, h: i.naturalHeight }));
  await p.setViewportSize({ width: w, height: Math.min(h, 4000) });
  await p.screenshot({ path: path.join(dir, `baseline-${f.replace('.png', '.jpg')}`), type: 'jpeg', quality: 70, fullPage: true });
  fs.rmSync(path.join(dir, f));
}
await b.close();
