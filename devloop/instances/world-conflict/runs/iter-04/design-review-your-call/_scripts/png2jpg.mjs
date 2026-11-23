// Convert PNG screenshots to JPEG quality 70 with Playwright (keeps the evidence folder small).
//   node png2jpg.mjs <outDir> <png> [<png> ...]
import path from 'node:path';
import { chromium } from 'playwright';

const [outDir, ...files] = process.argv.slice(2);
const b = await chromium.launch();
for (const f of files) {
  const p = await b.newPage();
  await p.goto(`file:///${path.resolve(f).replace(/\\/g, '/')}`);
  const { w, h } = await p.evaluate(() => ({ w: document.images[0].naturalWidth, h: document.images[0].naturalHeight }));
  await p.setViewportSize({ width: w, height: h });
  await p.addStyleTag({ content: 'body{margin:0} img{display:block}' });
  await p.screenshot({ path: path.join(outDir, path.basename(f).replace(/\.png$/, '.jpg')), type: 'jpeg', quality: 70 });
  await p.close();
}
await b.close();
