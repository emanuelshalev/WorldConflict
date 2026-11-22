// Order family colours: WCAG contrast and colour-vision-deficiency separation.
// Run: node order-family-contrast.mjs   (prints the tables used in design-order-cards.md)
const FAM = {
  diplo: { name: 'Diplomacy', accent: process.env.DIPLO || '#4691ff' },
  mil: { name: 'Military', accent: process.env.MIL || '#ff7d4f' },
  intel: { name: 'Covert', accent: process.env.INTEL || '#f48fd2' },
  econ: { name: 'Economy', accent: process.env.ECON || '#1fbf95' },
  home: { name: 'Home', accent: process.env.HOME_ || '#f1ede4' },
  nuke: { name: 'Nuclear', accent: '#f5d547' },
};
const CARD = '#1d2738'; // proposed card body top (--card-top)
const CARD_BOT = '#161e2c';
const PLATE_INK = '#0c1322'; // icon colour on a family plate
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round((v * t + hex(b)[i] * (1 - t)) * 255).toString(16).padStart(2, '0')).join('');
// Machado et al. 2009, severity 1.0, on linear RGB
const M = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const sim = (h, m) => { const v = hex(h).map(lin); return m.map((r) => Math.max(0, Math.min(1, r[0] * v[0] + r[1] * v[1] + r[2] * v[2]))); };
const toLab = (rgbLin) => {
  const [r, g, b] = rgbLin;
  let x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [x, y, z] = [f(x), f(y), f(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); // CIE76, good enough for a screen check
const keys = Object.keys(FAM);
console.log('family  accent   plate/ink  edge/card  chip-ink  chip text/bg');
for (const k of keys) {
  const f = FAM[k];
  const chipBg = mix(f.accent, CARD, 0.16);
  const ink = mix(f.accent, '#ffffff', 0.62); // light ink for chip words
  console.log(k.padEnd(7), f.accent, cr(f.accent, PLATE_INK).toFixed(2).padStart(9), cr(f.accent, CARD).toFixed(2).padStart(10), ink, cr(ink, chipBg).toFixed(2).padStart(9), chipBg);
}
for (const view of ['normal', 'protan', 'deutan', 'tritan']) {
  const lab = Object.fromEntries(keys.map((k) => [k, view === 'normal' ? toLab(hex(FAM[k].accent).map(lin)) : toLab(sim(FAM[k].accent, M[view]))]));
  let min = 1e9, pair = '';
  const rows = [];
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { const d = dE(lab[keys[i]], lab[keys[j]]); rows.push(`${keys[i]}-${keys[j]} ${d.toFixed(0)}`); if (d < min) { min = d; pair = `${keys[i]}/${keys[j]}`; } }
  console.log(`${view.padEnd(7)} min dE ${min.toFixed(1)} (${pair})   ${rows.join('  ')}`);
}
