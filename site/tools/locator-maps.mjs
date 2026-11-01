// Newspaper-style locator maps for the "real" side of each parallel.
// node site/tools/locator-maps.mjs -> site/assets/maps/<id>.svg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const geo = JSON.parse(fs.readFileSync(path.join(here, '../../ui/public/world.geojson'), 'utf8'));
const OUT = path.join(here, '../assets/maps');
fs.mkdirSync(OUT, { recursive: true });

// id, highlighted countries, marker [lng, lat], label
const MAPS = [
  ['p-iran', ['IRN'], [51.39, 35.69], 'Tehran'],
  ['p-ukraine', ['UKR'], [35.0, 47.4], 'Front line'],
  ['p-europe', ['FRA', 'ITA', 'DEU', 'CHE', 'IRL'], [2.35, 48.86], 'Paris'],
  ['p-taiwan', ['TWN'], [119.8, 24.2], 'Taiwan Strait'],
  ['p-caracas', ['VEN'], [-66.9, 10.48], 'Caracas'],
  ['p-bab', ['YEM'], [43.25, 13.32], 'Mokha'],
  ['p-scarborough', ['PHL'], [117.76, 15.15], 'Scarborough Shoal', 6],
  ['p-sudan', ['SDN'], [25.35, 13.63], 'El Fasher'],
  ['p-kashmir', ['IND', 'PAK'], [74.8, 34.1], 'Kashmir'],
];

const W = 640;
const H = 400;
const rings = (f) => {
  const g = f.geometry;
  return g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.flat() : [];
};

for (const [id, hi, marker, label, maxRings = 1] of MAPS) {
  // Frame the highlighted countries' main rings plus the marker, padded
  let [x0, y0, x1, y1] = [180, 90, -180, -90];
  const grow = ([x, y]) => {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  };
  for (const f of geo.features.filter((f) => hi.includes(f.properties.ADM0_A3))) {
    for (const r of rings(f).sort((a, b) => b.length - a.length).slice(0, maxRings)) r.forEach(grow);
  }
  grow(marker);
  const span = Math.max(14, Math.max(x1 - x0, (y1 - y0) * (W / H)) * 1.9);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const sx = W / span;
  const sy = sx * 1.15; // light latitude stretch
  const px = ([x, y]) => [((x - cx) * sx + W / 2).toFixed(1), (-(y - cy) * sy + H / 2).toFixed(1)];
  const inView = (r) => r.some(([x, y]) => Math.abs(x - cx) < span && Math.abs(y - cy) < span);
  let land = '';
  let high = '';
  for (const f of geo.features) {
    const d = rings(f)
      .filter(inView)
      .map((r) => `M${r.map((p) => px(p).join(' ')).join('L')}Z`)
      .join('');
    if (!d) continue;
    if (hi.includes(f.properties.ADM0_A3)) high += `<path d="${d}"/>`;
    else land += `<path d="${d}"/>`;
  }
  const [mx, my] = px(marker);
  const grid =
    Array.from({ length: 9 }, (_, i) => `<line x1="${i * 80}" y1="0" x2="${i * 80}" y2="${H}"/>`).join('') +
    Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${i * 80}" x2="${W}" y2="${i * 80}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Locator map: ${label}">
<rect width="${W}" height="${H}" fill="#e9e4d8"/>
<g stroke="#d8d1c1" stroke-width="0.6">${grid}</g>
<g fill="#cfc7b4" stroke="#e9e4d8" stroke-width="0.8" stroke-linejoin="round">${land}</g>
<g fill="#2b2a27" stroke="#e9e4d8" stroke-width="0.8" stroke-linejoin="round">${high}</g>
<circle cx="${mx}" cy="${my}" r="14" fill="none" stroke="#c4271b" stroke-width="2"/>
<circle cx="${mx}" cy="${my}" r="4.5" fill="#c4271b"/>
<text x="${+mx + 20}" y="${+my + 6}" font-family="Georgia, serif" font-size="18" font-style="italic" fill="#1d1c1a" stroke="#e9e4d8" stroke-width="4" paint-order="stroke">${label}</text>
</svg>`;
  fs.writeFileSync(path.join(OUT, `${id}.svg`), svg);
  console.log(id, `${Math.round(svg.length / 1024)}KB`);
}
