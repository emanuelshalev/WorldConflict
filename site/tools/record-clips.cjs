// Records looping scene clips from the game's dev server (npm run dev:ui, port 5173).
// Usage: node site/tools/record-clips.cjs  -> site/assets/clips/*.mp4 + posters (needs ffmpeg)
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { installClock, captureClip } = require('./framecap.cjs');

const OUT = path.join(__dirname, '..', 'assets', 'clips');
fs.mkdirSync(OUT, { recursive: true });

// Parallels: the game side of each real event (key = parallel id used by main.js)
const PARALLELS = [
  ['p-iran', { kind: 'airstrike', home: 'USA', other: 'IRN', mood: 'bad', kicker: 'In the game · Hormuz Convoy', headline: 'Three days to the midterms: a tanker ablaze off Fujairah' }],
  ['p-ukraine', { kind: 'ceasefire', home: 'UKR', other: 'RUS', mood: 'neutral', kicker: 'In the game · Ceasefire or Collapse', headline: 'Washington floats a free economic zone in Donetsk' }],
  ['p-europe', { kind: 'streets', home: 'FRA', mood: 'bad', kicker: 'In the game · One Term as France', headline: 'General strike paralyses France' }],
  ['p-taiwan', { kind: 'war_room', home: 'TWN', other: 'CHN', mood: 'bad', kicker: 'In the game · Quarantine', headline: 'The coast guard begins "customs inspections"' }],
  ['p-caracas', { kind: 'field_visit', home: 'VEN', other: 'USA', mood: 'neutral', kicker: 'In the game · Caracas After Maduro', headline: 'Machado comes home' }],
  ['p-bab', { kind: 'deployment', home: 'SAU', other: 'YEM', mood: 'bad', kicker: 'In the game · Bab al-Mandab Burning', headline: 'The island in the strait' }],
  ['p-scarborough', { kind: 'press', home: 'PHL', other: 'CHN', mood: 'bad', kicker: 'In the game · The Scarborough Line', headline: 'Manila weighs invoking the 1951 treaty' }],
  ['p-sudan', { kind: 'cabinet', home: 'SDN', other: 'ETH', mood: 'bad', kicker: 'In the game · Fire on the Nile', headline: 'The siege of El Obeid' }],
  ['p-kashmir', { kind: 'covert', home: 'IND', other: 'PAK', mood: 'neutral', kicker: 'In the game · Water War', headline: 'Engineers stand ready to hold back the Chenab' }],
];
const KINDS = ['cabinet', 'tv_interview', 'press', 'parliament', 'econ_tv', 'field_visit', 'summit', 'signing', 'exec_order', 'address', 'war_room', 'deployment', 'airstrike', 'nuclear', 'covert', 'streets', 'election', 'disaster', 'ceasefire', 'un_vote'];
const TILES = KINDS.map((k, i) => [`s-${k}`, { kind: k, home: ['USA', 'FRA', 'DEU', 'JPN', 'BRA', 'IND', 'GBR', 'UKR', 'ISR', 'TUR'][i % 10], other: ['CHN', 'RUS', 'IRN', 'PRK', 'VEN'][i % 5], mood: i % 3 === 0 ? 'good' : i % 3 === 1 ? 'bad' : 'neutral', bare: '1' }]);

// Hero montage sources: bare, full width, no captions
const HERO = [['address', 'USA', 'CHN'], ['war_room', 'TWN', 'CHN'], ['parliament', 'DEU', 'RUS'], ['airstrike', 'ISR', 'IRN'], ['summit', 'FRA', 'IND'], ['streets', 'FRA', 'DEU']].map(
  ([k, home, other], i) => [`h-${i}`, { kind: k, home, other, mood: i % 2 ? 'bad' : 'neutral', bare: '1' }],
);
const only = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  for (const [name, params] of [...PARALLELS, ...TILES, ...HERO]) {
    if (only && !name.startsWith(only)) continue;
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await installClock(page);
    await page.goto(`http://127.0.0.1:5173/#clip?${new URLSearchParams(params)}`);
    await page.waitForTimeout(1500);
    const mp4 = path.join(OUT, `${name}.mp4`);
    let size = 0;
    if (name.startsWith('s-')) {
      // Scene tiles ship as stills only: step the clock to a lively moment and screenshot
      await page.evaluate(() => window.__clockFreeze());
      await page.evaluate(() => window.__clockAdvance(4000));
      const big = path.join(OUT, `${name}.big.jpg`);
      await page.screenshot({ path: big, type: 'jpeg', quality: 90 });
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', big, '-vf', 'scale=400:-2', '-q:v', '4', path.join(OUT, `${name}.jpg`)]);
      fs.unlinkSync(big);
    } else {
      await captureClip(page, { seconds: 6.5, out: mp4, width: 1280, crf: 27 });
      size = fs.statSync(mp4).size;
      if (!name.startsWith('h-')) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '4', '-i', mp4, '-frames:v', '1', '-q:v', '4', path.join(OUT, `${name}.jpg`)]);
    }
    await page.close();
    console.log(name, Math.round(size / 1024) + 'KB');
  }
  await browser.close();
  // Stitch the hero montage: 2.6 s of each, cross-faded, then drop the parts
  const parts = HERO.map(([n]) => path.join(OUT, `${n}.mp4`)).filter((f) => fs.existsSync(f));
  if (parts.length === HERO.length) {
    const seg = 2.6;
    const fade = 0.5;
    const inputs = parts.flatMap((f) => ['-ss', '0.5', '-t', String(seg), '-i', f]);
    let chain = '';
    let last = '[0:v]';
    for (let i = 1; i < parts.length; i++) {
      const out = i === parts.length - 1 ? '[v]' : `[x${i}]`;
      chain += `${last}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${(i * (seg - fade)).toFixed(2)}${out};`;
      last = out;
    }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', chain.replace(/;$/, ''), '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(OUT, 'hero.mp4')]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.5', '-i', path.join(OUT, 'hero.mp4'), '-frames:v', '1', '-q:v', '4', path.join(OUT, 'hero.jpg')]);
    for (const f of parts) fs.unlinkSync(f);
    console.log('hero', Math.round(fs.statSync(path.join(OUT, 'hero.mp4')).size / 1024) + 'KB');
  }
})();
