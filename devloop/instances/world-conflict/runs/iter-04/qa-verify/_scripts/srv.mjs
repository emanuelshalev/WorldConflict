// QA4 persistent browser: node srv.mjs <port> <width> <height> <tag>
// POST JS body to http://localhost:<port>/ ; it runs as async (page, ctx, S) => {...}; returns JSON.
import http from 'node:http';
import fs from 'node:fs';
import { chromium } from 'file:///C:/MyData/git/WorldConflict/node_modules/playwright/index.mjs';
const [port, W, H, tag] = [Number(process.argv[2]), Number(process.argv[3]), Number(process.argv[4]), process.argv[5]];
const OUT = 'C:/MyData/git/WorldConflict/devloop/instances/world-conflict/runs/iter-04/qa-verify';
const SCR = 'C:/Users/emanu/AppData/Local/Temp/claude/d3ee1a5a4c6f8003/c790e4f0-25ab-45ad-bcda-a1bb0eac880c/scratchpad/qa4/shots';
fs.mkdirSync(SCR, { recursive: true });
const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'] });
const mobile = W < 700;
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
let page = await ctx.newPage();
const S = { errors: [], consoleErr: [], failed: [], dialogs: [], external: [], OUT, SCR, tag, n: 0 };
const wire = (p) => {
  p.on('pageerror', (e) => S.errors.push(e.message.slice(0, 300)));
  p.on('console', (m) => { if (m.type() === 'error') S.consoleErr.push(m.text().slice(0, 300)); });
  p.on('requestfailed', (r) => S.failed.push(`${r.url().slice(0, 150)} ${r.failure()?.errorText}`));
  p.on('response', (r) => { if (r.status() >= 400) S.failed.push(`${r.status()} ${r.url().slice(0, 150)}`); });
  p.on('request', (r) => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) S.external.push(u.slice(0, 150)); });
  p.on('dialog', (d) => { S.dialogs.push(`${d.type()}: ${d.message()}`); d.dismiss().catch(() => {}); });
};
wire(page);
S.shot = async (name, full = false) => { await page.waitForTimeout(500); const f = `${SCR}/${tag}-${String(++S.n).padStart(3, '0')}-${name}.png`; await page.screenshot({ path: f, fullPage: full }); return f; };
S.keep = (f, name) => { fs.copyFileSync(f, `${OUT}/${name}.png`); return name; };
S.txt = async (sel = 'body') => (await page.locator(sel).first().innerText().catch(() => '')).replace(/\s+/g, ' ');
S.btns = () => page.evaluate(() => [...document.querySelectorAll('button, [role=tab], a[href], summary, [role=button]')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map((b) => { const r = b.getBoundingClientRect(); return `${(b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 70)} @${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}${b.disabled ? ' [dis]' : ''}`; }));
S.state = async () => (await page.locator('[data-region="state"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
S.ctx = ctx; S.browser = b;
S.newPage = async () => { page = await ctx.newPage(); wire(page); return page; };
http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  let out;
  try {
    const fn = new Function('page', 'ctx', 'S', `return (async () => { ${body} })();`);
    out = await fn(page, ctx, S);
  } catch (e) { out = { ERROR: e.message.split('\n').slice(0, 4).join(' | ') }; }
  res.end(JSON.stringify(out ?? null, null, 1));
  if (body.trim() === 'STOP') { await b.close(); process.exit(0); }
}).listen(port, () => console.log('ready', port));
