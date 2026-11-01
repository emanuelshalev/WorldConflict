// Records looping scene clips from the game's dev server (npm run dev:ui, port 5173).
// Usage: node site/tools/record-clips.cjs  -> site/assets/clips/*.mp4 + posters (needs ffmpeg)
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, '..', 'assets', 'clips');
const TMP = path.join(OUT, '.raw');
fs.mkdirSync(TMP, { recursive: true });

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

const only = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  for (const [name, params] of [...PARALLELS, ...TILES]) {
    if (only && !name.startsWith(only)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: TMP, size: { width: 1280, height: 720 } } });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:5173/#clip?${new URLSearchParams(params)}`);
    await page.waitForTimeout(8200);
    const video = page.video();
    await ctx.close();
    const raw = await video.path();
    const mp4 = path.join(OUT, `${name}.mp4`);
    const w = name.startsWith('s-') ? 640 : 1280;
    // Skip the first 1.2 s (page load), keep 6.5 s
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.2', '-i', raw, '-t', '6.5', '-vf', `scale=${w}:-2,fps=30`, '-c:v', 'libx264', '-preset', 'slow', '-crf', name.startsWith('s-') ? '30' : '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '5.5', '-i', mp4, '-frames:v', '1', '-q:v', '4', path.join(OUT, `${name}.jpg`)]);
    fs.unlinkSync(raw);
    console.log(name, Math.round(fs.statSync(mp4).size / 1024) + 'KB');
  }
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
})();
