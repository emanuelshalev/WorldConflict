// node crop.mjs <in.jpg> <out.jpg> x y w h [scale]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [i, o, x, y, w, h, sc = '2'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(w) * Number(sc), height: Number(h) * Number(sc) } });
const data = fs.readFileSync(i).toString('base64');
await p.setContent(`<body style="margin:0;overflow:hidden"><img src="data:image/jpeg;base64,${data}" style="position:absolute;left:${-x * sc}px;top:${-y * sc}px;transform-origin:0 0;transform:scale(${sc})"></body>`);
await p.waitForTimeout(300);
await p.screenshot({ path: o, type: 'jpeg', quality: 80 });
await b.close();
