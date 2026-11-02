// Exports the game's animated scene illustrations as standalone SVG files (inline CSS
// animations included) for the landing page: node site/tools/export-scenes.cjs
// Needs the UI dev server (npm run dev:ui). Output: site/assets/scenes/<kind>.svg
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const OUT = path.join(__dirname, '..', 'assets', 'scenes');
fs.mkdirSync(OUT, { recursive: true });
const KINDS = ['cabinet', 'tv_interview', 'press', 'parliament', 'econ_tv', 'field_visit', 'summit', 'signing', 'exec_order', 'address', 'war_room', 'deployment', 'airstrike', 'nuclear', 'covert', 'streets', 'election', 'disaster', 'ceasefire', 'un_vote'];
// Flag pairs that read well for each scene on the page
const FLAGS = { summit: ['USA', 'JPN'], signing: ['FRA', 'DEU'], ceasefire: ['UKR', 'RUS'], deployment: ['UKR', 'RUS'], airstrike: ['ISR', 'IRN'], war_room: ['TWN', 'CHN'], covert: ['GBR', 'RUS'], press: ['USA', 'CHN'], address: ['USA', 'CHN'], streets: ['FRA', 'DEU'], parliament: ['DEU', 'FRA'], election: ['BRA', 'ARG'], field_visit: ['IND', 'PAK'], un_vote: ['USA', 'IRN'], cabinet: ['GBR', 'FRA'], exec_order: ['USA', 'MEX'], tv_interview: ['ISR', 'IRN'], econ_tv: ['DEU', 'CHN'], nuclear: ['IRN', 'ISR'], disaster: ['PHL', 'CHN'] };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  for (const k of KINDS) {
    const [home, other] = FLAGS[k] ?? ['USA', 'CHN'];
    for (const mood of ['neutral', 'bad']) {
      await p.goto(`http://127.0.0.1:5173/?r=${k}-${mood}#clip?kind=${k}&home=${home}&other=${other}&mood=${mood}&bare=1`);
      await p.waitForSelector('.scene-art svg');
      await p.waitForTimeout(300);
      const svg = await p.evaluate((kind) => {
        const el = document.querySelector('.scene-art svg');
        const cls = [...el.classList];
        const keep = (t) => cls.some((c) => t.includes(`.${c}`)) || t.includes('svg.art') || t.includes(`art-${kind}`);
        const rules = [];
        const frames = new Set();
        for (const sh of document.styleSheets) {
          let list;
          try { list = sh.cssRules; } catch { continue; }
          for (const r of list) {
            if (r instanceof CSSStyleRule && keep(r.selectorText)) {
              rules.push(r.cssText);
              const m = r.style.animationName || r.style.animation;
              if (m) for (const n of m.split(/[ ,]+/)) frames.add(n);
            } else if (r instanceof CSSMediaRule && keep(r.cssText)) rules.push(r.cssText);
          }
        }
        for (const sh of document.styleSheets) {
          let list;
          try { list = sh.cssRules; } catch { continue; }
          for (const r of list) if (r instanceof CSSKeyframesRule && frames.has(r.name)) rules.push(r.cssText);
        }
        const clone = el.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.removeAttribute('aria-hidden');
        clone.setAttribute('role', 'img');
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.textContent = `:root{--font-display:'Geist',system-ui,sans-serif;--font-mono:'Geist Mono',monospace}\n${rules.join('\n')}`;
        clone.insertBefore(style, clone.firstChild);
        return clone.outerHTML;
      }, k);
      const name = mood === 'neutral' ? `${k}.svg` : `${k}-alert.svg`;
      fs.writeFileSync(path.join(OUT, name), svg);
      console.log(name, Math.round(svg.length / 1024) + 'KB');
    }
  }
  await b.close();
})();
