// Order pictograms (D-66, RS-007): one source for the SVG files, the sprite used by the mocks,
// the contact sheet and the unlabeled recognition sheet.
// Run: node build.mjs   (writes into this folder and ../order-icons-recognition-sheet.html)
//
// Grid: 48 x 48 viewBox, live area 3..45, primary stroke 4 (2 px at 24 px), detail stroke >= 2.5,
// knockout gaps >= 2.5 units, filled silhouettes in currentColor, one idea per icon.
// Modifier badge (bottom right, r 9 at 37,37, cut ring 2.5): up = more, down = less,
// coin = money, talk = words. Slash = stop. Arrow towards a line = go, away = pull back.
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const K = '#000';
const W = '#fff';
const st = (d, w = 4, c = 'currentColor') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const fl = (d, c) => `<path d="${d}"${c ? ` fill="${c}"` : ''}/>`;
const circ = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}"${c ? ` fill="${c}"` : ''}/>`;
const rect = (x, y, w, h, rx = 0, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"${c ? ` fill="${c}"` : ''}/>`;
/** Main art with black cut shapes knocked out of it. */
const knock = (id, main, cut) =>
  `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48"><rect width="48" height="48" fill="${W}"/>${cut}</mask><g mask="url(#${id})">${main}</g>`;

const BADGE = {
  up: st('M37 42V32.5M33 36.5L37 32.5L41 36.5', 2.6, K),
  down: st('M37 32V41.5M33 37.5L37 41.5L41 37.5', 2.6, K),
  coin: st('M40 33.6C39 32.4 34.6 32.2 34.4 34.6C34.2 37 39.9 36.6 39.8 39.3C39.6 41.8 35 41.8 34 40.4M37 30.8V43.2', 2.2, K),
};
/** Main art, cut ring and badge with its glyph knocked out. */
function badged(id, main, glyph, extraCut = '') {
  return (
    knock(`${id}-m`, main, `${circ(37, 37, 11.6, K)}${extraCut}`) +
    knock(`${id}-b`, circ(37, 37, 9), BADGE[glyph])
  );
}
/** A speech-bubble badge (talk). */
function talkBadged(id, main) {
  const bub = 'M29.5 30H44.5Q46.5 30 46.5 32V39Q46.5 41 44.5 41H36L31 45.5L32 41H29.5Q27.5 41 27.5 39V32Q27.5 30 29.5 30Z';
  return (
    knock(`${id}-m`, main, `<path d="${bub}" fill="${K}" stroke="${K}" stroke-width="5" stroke-linejoin="round"/>`) +
    knock(`${id}-b`, fl(bub), `${circ(32, 35.5, 1.5, K)}${circ(37, 35.5, 1.5, K)}${circ(42, 35.5, 1.5, K)}`)
  );
}

const shieldD = (x, y, w, h) =>
  `M${x} ${y + 3}Q${x + w / 2} ${y - 1.5} ${x + w} ${y + 3}V${y + h * 0.48}C${x + w} ${y + h * 0.78} ${x + w * 0.72} ${y + h * 0.92} ${x + w / 2} ${y + h}C${x + w * 0.28} ${y + h * 0.92} ${x} ${y + h * 0.78} ${x} ${y + h * 0.48}Z`;

const star = (cx, cy, ro, ri, n = 8, rot = -90) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
};
const gear = (cx, cy, ro, ri, teeth) => {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const seq = [[ri, a - step * 0.5], [ri, a - step * 0.28], [ro, a - step * 0.18], [ro, a + step * 0.18], [ri, a + step * 0.28]];
    for (const [r, t] of seq) pts.push(`${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
};

// Reused parts
const tank = () =>
  rect(3, 32, 32, 9, 4.5) +
  fl('M6.5 31L10 25H32L35.5 31Z') +
  fl('M12.5 25L14.5 18.5Q15 17.5 16.5 17.5H26Q27.8 17.5 28 19.5L28.8 25Z') +
  rect(28, 20, 12, 3.2, 1.2);
const tankCut = () => [8, 14, 19, 24, 30].map((x) => circ(x, 36.5, 2, K)).join('') + rect(3, 30.6, 33, 1.4, 0, K);
const atom = (cx, cy, rx, ry, w = 3.4) =>
  [0, 60, 120].map((a) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${cx} ${cy})" fill="none" stroke="currentColor" stroke-width="${w}"/>`).join('') + circ(cx, cy, 3.6);
const spyHead = () =>
  fl('M14 18.5C14 10 17 6.5 24 7.2C31 6.5 34 10 34 18.5Z') +
  `<ellipse cx="24" cy="19.6" rx="19" ry="3.6"/>` +
  fl('M8.5 25.5H21.5V28.5C21.5 31.5 19.5 33 16.5 33H13.5C10.5 33 8.5 31 8.5 28Z') +
  fl('M39.5 25.5H26.5V28.5C26.5 31.5 28.5 33 31.5 33H34.5C37.5 33 39.5 31 39.5 28Z') +
  st('M21 27H27', 2.4) +
  fl('M6 46L13 36.5L19.5 42L24 38L28.5 42L35 36.5L42 46Z');
const spyCut = () => rect(14, 14.6, 20, 2.2, 0, K);
const crossedLine = (d, w) => `<path d="${d}" fill="none" stroke="${K}" stroke-width="${w}" stroke-linecap="round"/>`;

// Arrow along a circle (screen angles, clockwise), with its head at the end
function arcArrow(cx, cy, r, a0, a1, w = 3.4) {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1 - 9);
  const large = (a1 - 9 - a0 + 360) % 360 > 180 ? 1 : 0;
  const [ex, ey] = p(a1);
  const t = (a1 * Math.PI) / 180;
  const tx = -Math.sin(t);
  const ty = Math.cos(t);
  const nx = Math.cos(t);
  const ny = Math.sin(t);
  const tip = [ex + tx * 3, ey + ty * 3];
  const b1 = [ex - tx * 4 + nx * 5, ey - ty * 4 + ny * 5];
  const b2 = [ex - tx * 4 - nx * 5, ey - ty * 4 - ny * 5];
  const f = (v) => v.toFixed(2);
  return st(`M${f(x0)} ${f(y0)}A${r} ${r} 0 ${large} 1 ${f(x1)} ${f(y1)}`, w) + fl(`M${f(tip[0])} ${f(tip[1])}L${f(b1[0])} ${f(b1[1])}L${f(b2[0])} ${f(b2[1])}Z`);
}

/**
 * The catalogue. `id` is the registry id (ui/src/lib/orders.ts), `family` the proposed family,
 * `idea` the one idea, `accept` the answers counted as correct in the recognition test.
 */
export const ICONS = [
  // ---------------- Diplomacy ----------------
  {
    id: 'court', family: 'diplo', label: 'Court', idea: 'Handshake',
    accept: ['court', 'improve relations', 'friendship', 'handshake', 'deal', 'agreement', 'make friends', 'cooperation', 'diplomacy'],
    svg: (id) =>
      knock(id,
        fl('M0.5 25L8.5 18.5L15 27L7 33.5Z') + fl('M47.5 25L39.5 18.5L33 27L41 33.5Z') +
        fl('M12 23.5L19.5 15.5H28.5L36.5 23.5L28.5 33.5Q24 37.5 19.5 33.5Z'),
        crossedLine('M18.4 28.6L23.4 23.6M21.6 31.8L26.6 26.8M25.4 33.6L29.6 29.4M19 20.5L27 20.5L33 26', 2.2) + crossedLine('M9.6 20L15.6 28M38.4 20L32.4 28', 2.6)),
  },
  {
    id: 'denounce', family: 'diplo', label: 'Denounce', idea: 'Megaphone shouting',
    accept: ['denounce', 'condemn', 'criticise', 'criticize', 'protest', 'shout', 'megaphone', 'call out', 'public statement', 'accuse'],
    svg: () =>
      rect(4.5, 18, 6.5, 12, 2) + fl('M12 18L29.5 9.2Q32 8 32 10.6V37.4Q32 40 29.5 38.8L12 30Z') +
      fl('M15 30.5H19.5L21.5 40.5Q21.8 42.5 19.8 42.5H18.6Q16.8 42.5 16.4 40.6Z') +
      st('M37 15L43.5 11M38 24H45.5M37 33L43.5 37', 3.6),
  },
  {
    id: 'offer-pact', family: 'diplo', label: 'Offer defence pact', idea: 'Two shields side by side',
    accept: ['defence pact', 'defense pact', 'alliance', 'ally', 'mutual defence', 'protect', 'join forces', 'treaty', 'security pact'],
    svg: (id) =>
      knock(id, fl(shieldD(3.5, 9, 23, 31)), `<path d="${shieldD(21.5, 7, 23, 31)}" fill="${K}" stroke="${K}" stroke-width="5"/>`) +
      knock(`${id}-r`, fl(shieldD(21.5, 7, 23, 31)), st('M33 14V31M26.5 21.5H39.5', 3.6, K)),
  },
  {
    id: 'break-pact', family: 'diplo', label: 'Break pact', idea: 'A shield split in two',
    accept: ['break pact', 'break alliance', 'betray', 'end alliance', 'leave alliance', 'broken alliance', 'cancel treaty', 'split', 'broken protection'],
    svg: (id) =>
      `<clipPath id="${id}-l"><path d="M0 0H25.5L20.5 14L27 23L20 33L24 48H0Z"/></clipPath><clipPath id="${id}-r"><path d="M25.5 0H48V48H24L20 33L27 23L20.5 14Z"/></clipPath>` +
      `<g transform="translate(-2.6 1.2) rotate(-7 20 44)"><path clip-path="url(#${id}-l)" d="${shieldD(9, 5, 30, 38)}"/></g>` +
      `<g transform="translate(2.6 -0.6) rotate(7 28 44)"><path clip-path="url(#${id}-r)" d="${shieldD(9, 5, 30, 38)}"/></g>`,
  },
  {
    id: 'ceasefire', family: 'diplo', label: 'Propose ceasefire', idea: 'White flag',
    accept: ['ceasefire', 'truce', 'white flag', 'surrender', 'stop fighting', 'armistice', 'peace offer', 'end war', 'stop the war'],
    svg: () =>
      rect(9, 8, 4, 37, 2) + circ(11, 6, 3) +
      st('M15.5 10C21 7 26 13 31.5 10.2C35.5 8.2 39.5 8 42.5 9V26.5C39.5 25.5 35.5 25.8 31.5 27.8C26 30.6 21 24.5 15.5 27.5Z', 3.6),
  },
  {
    id: 'mediate', family: 'diplo', label: 'Mediate peace', idea: 'Dove with an olive branch',
    accept: ['mediate', 'mediation', 'peace', 'peace talks', 'broker peace', 'dove', 'negotiate', 'peacemaker', 'make peace'],
    svg: (id) =>
      knock(id,
        circ(12.5, 19, 5) + fl('M8 17.6L3 20.4L8.4 21.6Z') +
        fl('M10 21.5C14 30 23.5 34 34 32.2L44.5 37.5L41.5 30.2C43.4 29 44 27 43 25H36C28 25 20 24 15.5 20.6Z'),
        `<path d="M17 22C18 12 26 6 40.5 4C37.5 9 36.5 15 31 20.5C27 24 21 24.6 17 22Z" fill="${K}" stroke="${K}" stroke-width="4.5"/>`) +
      fl('M17 22C18 12 26 6 40.5 4C37.5 9 36.5 15 31 20.5C27 24 21 24.6 17 22Z') +
      st('M5.5 22.5C5 28 7 33 11 37', 2.5) +
      `<ellipse cx="4.2" cy="28.5" rx="2.6" ry="1.5" transform="rotate(-60 4.2 28.5)"/><ellipse cx="9.6" cy="31" rx="2.6" ry="1.5" transform="rotate(30 9.6 31)"/><ellipse cx="7.2" cy="36.6" rx="2.6" ry="1.5" transform="rotate(-40 7.2 36.6)"/>`,
  },
  // ---------------- Military ----------------
  {
    id: 'declare-war', family: 'mil', label: 'Declare war', idea: 'Crossed swords',
    accept: ['declare war', 'war', 'go to war', 'attack', 'invade', 'invasion', 'fight', 'battle', 'swords', 'combat'],
    svg: (id) => {
      const sword = (c = '') => fl('M5.5 5.5L11.2 7.2L33.2 29.6L29.6 33.2L7.2 11.2Z', c) + st('M25.6 38.6L38.6 25.6', 4.6, c || 'currentColor') + st('M33.5 33.5L40 40', 4.4, c || 'currentColor') + circ(42.2, 42.2, 3.6, c);
      const mirror = (s) => `<g transform="translate(48 0) scale(-1 1)">${s}</g>`;
      return knock(id, sword(), mirror(`<path d="M5.5 5.5L11.2 7.2L33.2 29.6L29.6 33.2L7.2 11.2Z" fill="${K}" stroke="${K}" stroke-width="4.5" stroke-linejoin="round"/>`)) + mirror(sword());
    },
  },
  {
    id: 'mobilize', family: 'mil', label: 'Mobilize forces', idea: 'Soldiers, up',
    accept: ['mobilize', 'mobilise', 'call up', 'reserves', 'raise army', 'recruit', 'more troops', 'build army', 'draft', 'troops up'],
    svg: (id) => {
      const helmet = (cx, cy, s) =>
        fl(`M${cx - 10 * s} ${cy}C${cx - 10 * s} ${cy - 14 * s} ${cx + 10 * s} ${cy - 14 * s} ${cx + 10 * s} ${cy}Z`) + rect(cx - 13 * s, cy + 0.8 * s, 26 * s, 3.6 * s, 1.8 * s) + st(`M${cx - 7 * s} ${cy + 4.4 * s}Q${cx} ${cy + 11 * s} ${cx + 7 * s} ${cy + 4.4 * s}`, 2.4 * s);
      const front = `<path d="M7 33C7 13 33 13 33 33Z" fill="${K}" stroke="${K}" stroke-width="5"/><rect x="2.5" y="31.5" width="35" height="8" fill="${K}"/>`;
      return badged(id, knock(`${id}-k`, helmet(12, 16, 0.75) + helmet(34, 16, 0.75), front) + helmet(20, 33, 1), 'up');
    },
  },
  {
    id: 'demobilize', family: 'mil', label: 'Stand down forces', idea: 'Soldiers, down',
    accept: ['demobilize', 'demobilise', 'stand down', 'send troops home', 'disband', 'fewer troops', 'reduce army', 'troops down', 'de-escalate'],
    svg: (id) => ICONS.find((i) => i.id === 'mobilize').svg(id).replace(BADGE.up, BADGE.down),
  },
  {
    id: 'procure', family: 'mil', label: 'Buy weapons', idea: 'Shells and a coin',
    accept: ['buy weapons', 'procure', 'arms purchase', 'buy arms', 'ammunition', 'weapons', 'arms deal', 'military spending', 'buy ammo'],
    svg: (id) => {
      const shell = (x) => fl(`M${x} 23C${x} 15 ${x + 3.5} 9.5 ${x + 3.5} 9.5C${x + 3.5} 9.5 ${x + 7} 15 ${x + 7} 23Z`) + rect(x, 24.2, 7, 18.5, 1);
      return badged(id, shell(4) + shell(13) + shell(22), 'coin', rect(3, 35, 28, 1.8, 0, K));
    },
  },
  {
    id: 'deploy-border', family: 'mil', label: 'Mass troops at border', idea: 'Tank driving at a border line',
    accept: ['deploy troops', 'mass troops', 'troops to border', 'border', 'deploy', 'advance', 'move tanks', 'threaten', 'border pressure'],
    svg: (id) => knock(id, tank(), tankCut()) + st('M44.5 5V43', 3, 'currentColor').replace('/>', ' stroke-dasharray="4.2 4.2"/>') + st('M6 9.5H29M24.5 5L29.5 9.5L24.5 14', 3.4),
  },
  {
    id: 'withdraw-border', family: 'mil', label: 'Withdraw troops', idea: 'Tank turning away from the line',
    accept: ['withdraw', 'withdraw troops', 'pull back', 'retreat', 'leave border', 'de-escalate', 'bring troops back', 'pull out'],
    svg: (id) => `<g transform="translate(44 0) scale(-1 1)">${knock(id, tank(), tankCut())}</g>` + st('M44.5 5V43', 3).replace('/>', ' stroke-dasharray="4.2 4.2"/>') + st('M35 9.5H12M16.5 5L11.5 9.5L16.5 14', 3.4),
  },
  {
    id: 'airstrike-military', family: 'mil', label: 'Strike military targets', idea: 'Jet diving on a blast',
    accept: ['airstrike', 'air strike', 'bomb', 'bombing', 'air raid', 'strike', 'jet attack', 'attack from the air', 'military strike'],
    svg: () =>
      `<g transform="translate(32 15) rotate(-135) scale(0.64) translate(-24 -24)">${fl('M24 3L27.2 13.5V20L42.5 30V34.5L27.2 29.5V37L32 41V43.5L24 41.5L16 43.5V41L20.8 37V29.5L5.5 34.5V30L20.8 20V13.5Z')}</g>` +
      fl(star(13.5, 35, 10.5, 4.6, 8)) + `<ellipse cx="22.5" cy="25.5" rx="3.2" ry="1.7" transform="rotate(-45 22.5 25.5)"/>`,
  },
  {
    id: 'airstrike-nuclear', family: 'mil', label: 'Strike nuclear sites', idea: 'Crosshair on an atom',
    accept: ['strike nuclear sites', 'bomb nuclear', 'target nuclear program', 'hit nuclear facility', 'attack reactor', 'destroy nuclear program', 'nuclear target'],
    svg: () => atom(24, 24, 15, 5.8, 3.6) + `<circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3.2"/>` + st('M24 0.5V7.5M24 40.5V47.5M0.5 24H7.5M40.5 24H47.5', 3.6),
  },
  // ---------------- Nuclear (military, hazard) ----------------
  {
    id: 'fund-nuclear', family: 'nuke', label: 'Fund nuclear program', idea: 'Atom and a coin',
    accept: ['fund nuclear', 'nuclear program', 'build nuclear', 'nuclear research', 'invest nuclear', 'develop the bomb', 'nuclear funding', 'atom', 'nuclear'],
    svg: (id) => badged(id, atom(21, 21, 17, 6.6, 3.6), 'coin'),
  },
  {
    id: 'nuclear-strike', family: 'nuke', label: 'Nuclear strike', idea: 'Mushroom cloud',
    accept: ['nuclear strike', 'nuke', 'nuclear attack', 'atomic bomb', 'nuclear war', 'launch nukes', 'mushroom cloud', 'nuclear bomb'],
    svg: (id) =>
      knock(id,
        fl('M10.5 21C6.5 21 4.6 15.5 8.6 13C9.6 6.6 16.6 4.4 21 7.4C24 3.2 32 4 33.6 9C38.6 8 43.4 12.4 40.6 17.2C42.4 21.4 38.2 24.4 34.2 22.6H14C12.6 23.4 10.5 22.6 10.5 21Z') +
        fl('M19.5 22H28.5L27.4 35H20.6Z') + `<ellipse cx="24" cy="28" rx="9" ry="2.6"/>` +
        fl('M6.5 44C8.5 37.6 17 35 24 36C31 35 39.5 37.6 41.5 44Z'),
        rect(14, 22.2, 20, 1.6, 0, K) + st('M14.5 15.5C17 14 20 14.4 22 16M26 13.5C28 12.4 31 12.6 33 14.4', 2, K)),
  },
  // ---------------- Covert ----------------
  {
    id: 'spy', family: 'intel', label: 'Spy on', idea: 'Spy in a hat and dark glasses',
    accept: ['spy', 'spy on', 'espionage', 'intelligence', 'gather intel', 'surveillance', 'agent', 'secret agent', 'investigate', 'watch'],
    svg: (id) => knock(id, spyHead(), spyCut()),
  },
  {
    id: 'counter-intel', family: 'intel', label: 'Hunt foreign spies', idea: 'Spy with a no sign',
    accept: ['counter intelligence', 'counter-intel', 'counterintelligence', 'hunt spies', 'catch spies', 'no spies', 'stop spies', 'anti spy', 'security'],
    svg: (id) =>
      knock(id, `<g transform="translate(24 25) scale(0.6) translate(-24 -26)">${knock(`${id}-s`, spyHead(), spyCut())}</g>`, crossedLine('M10 10L38 38', 9)) +
      `<circle cx="24" cy="24" r="19.5" fill="none" stroke="currentColor" stroke-width="4.4"/>` + st('M10.4 10.4L37.6 37.6', 4.4),
  },
  {
    id: 'sabotage', family: 'intel', label: 'Sabotage', idea: 'Dynamite with a lit fuse',
    accept: ['sabotage', 'dynamite', 'blow up', 'explosives', 'bomb', 'destroy infrastructure', 'tnt', 'demolish', 'attack infrastructure'],
    svg: (id) => knock(id, rect(7, 22, 8, 22, 2) + rect(16.5, 22, 8, 22, 2) + rect(26, 22, 8, 22, 2), rect(6, 29, 30, 1.6, 0, K) + rect(6, 35.4, 30, 1.6, 0, K)) + st('M20.5 22C20.5 15.5 26 13.6 30.5 11.6', 2.8) + fl(star(35, 9, 7, 2.8, 8)),
  },
  {
    id: 'destabilize', family: 'intel', label: 'Destabilize', idea: 'A government building cracking and tilting',
    accept: ['destabilize', 'destabilise', 'undermine', 'unrest', 'weaken government', 'topple', 'chaos', 'crack', 'collapse', 'subvert', 'unstable government'],
    svg: (id) =>
      `<g transform="rotate(-9 24 44)">${knock(id,
        fl('M5 17L24 6L43 17Z') + rect(6, 18.6, 36, 3.6, 0.8) + rect(9, 23.6, 5, 14) + rect(17, 23.6, 5, 14) + rect(26, 23.6, 5, 14) + rect(34, 23.6, 5, 14) + rect(4, 39, 40, 5, 1),
        `<path d="M27.5 4L22 17.5L28.5 26L21 35.5L25 46" fill="none" stroke="${K}" stroke-width="2.8" stroke-linejoin="miter"/>`)}</g>` +
      st('M44 5.5Q47 9 45.5 13M40 3Q42.5 4 43 6', 2.4),
  },
  {
    id: 'arm-rebels', family: 'intel', label: 'Arm rebels', idea: 'Raised fist and a rifle',
    accept: ['arm rebels', 'support rebels', 'rebels', 'insurgents', 'revolution', 'uprising', 'guerrilla', 'arm the opposition', 'rebellion', 'militia'],
    svg: (id) => {
      const rifle = `<g transform="rotate(-45 24 24)">${fl('M1 21.4L11 20.4V27.6L2 30.6Z') + rect(11, 20.6, 19, 5.6, 1) + fl('M23 26H27.5L29 34H24.6Z') + rect(30, 21.8, 17, 3, 1) + rect(43, 19.2, 2, 2.8, 0.5)}</g>`;
      const fist = rect(17.5, 15, 15, 12, 4) + rect(20, 26, 10, 19, 2);
      return knock(id, rifle, `<rect x="15" y="12.5" width="20" height="17" rx="6" fill="${K}"/><rect x="17.5" y="24" width="15" height="24" rx="3" fill="${K}"/>`) +
        knock(`${id}-f`, fist, crossedLine('M21.4 15.5V20.5M25 15.5V20.5M28.6 15.5V20.5', 1.8) + crossedLine('M17.5 22.3H27', 1.8));
    },
  },
  {
    id: 'disinformation', family: 'intel', label: 'Feed disinformation', idea: 'A speech bubble wearing a mask',
    accept: ['disinformation', 'misinformation', 'fake news', 'deception', 'deceive', 'lie', 'lies', 'propaganda', 'false information', 'mislead', 'disguise'],
    svg: (id) =>
      knock(id, rect(4, 6, 40, 29, 9) + fl('M12 33L9 43L21.5 34Z'),
        fl('M9 17C13 12 20 13 24 16.5C28 13 35 12 39 17C41 22 37 28 32 28C28 28 26 25 24 24C22 25 20 28 16 28C11 28 7 22 9 17Z', K) +
        `<ellipse cx="16.5" cy="20.5" rx="3.6" ry="2.5" fill="${W}"/><ellipse cx="31.5" cy="20.5" rx="3.6" ry="2.5" fill="${W}"/>`),
  },
  {
    id: 'assassinate', family: 'intel', label: 'Assassinate leader', idea: 'Crosshair on a person',
    accept: ['assassinate', 'assassination', 'kill leader', 'kill', 'target leader', 'sniper', 'eliminate', 'murder', 'hit', 'take out the leader'],
    svg: (id) => {
      const ret = `<circle cx="24" cy="24" r="19" fill="none" stroke="X" stroke-width="W"/><path d="M24 1.5V13M24 35V46.5M1.5 24H13M35 24H46.5" fill="none" stroke="X" stroke-width="W" stroke-linecap="round"/>`;
      return knock(id, circ(24, 18.5, 7) + fl('M10.5 43C10.5 33.5 16.5 29 24 29C31.5 29 37.5 33.5 37.5 43Z'), ret.replace(/X/g, K).replace(/W/g, '7.4')) + ret.replace(/X/g, 'currentColor').replace(/W/g, '3.2');
    },
  },
  {
    id: 'coup', family: 'intel', label: 'Back a coup', idea: 'A crown with arrows swapping it',
    accept: ['coup', 'regime change', 'overthrow', 'replace leader', 'seize power', 'take over', 'change government', 'topple leader', 'new ruler'],
    svg: () =>
      `<g transform="translate(24 24.5) scale(0.7) translate(-24 -24)">${fl('M12 31L9.5 13.5L17.5 21.5L24 10L30.5 21.5L38.5 13.5L36 31Z') + rect(12, 33, 24, 5, 1.5)}</g>` +
      arcArrow(24, 24, 20.5, 200, 330) + arcArrow(24, 24, 20.5, 20, 150),
  },
  // ---------------- Economy ----------------
  {
    id: 'reform', family: 'econ', label: 'Reform program', idea: 'A sprout growing from a gear',
    accept: ['reform', 'reforms', 'economic reform', 'growth', 'modernise', 'modernize', 'develop', 'invest', 'improve economy', 'industry', 'progress', 'build'],
    svg: (id) =>
      knock(id, fl(gear(24, 36, 12.5, 9.6, 9)), circ(24, 36, 4.2, K)) +
      st('M24 23.5V11', 3.4) + fl('M23.6 16C17.6 16 12.6 13 11.6 6.4C17.6 6.4 22.6 9.4 23.6 16Z') + fl('M24.4 13C28 7.6 33 5.2 38.4 5.8C37.6 11.2 32 14.4 24.4 14Z'),
  },
  // ---------------- Home ----------------
  {
    id: 'address', family: 'home', label: 'National address', idea: 'Microphone on a podium',
    accept: ['national address', 'speech', 'address the nation', 'rally', 'press conference', 'speak', 'announcement', 'podium', 'broadcast', 'propaganda'],
    svg: (id) =>
      knock(id, rect(9, 25, 30, 3.6, 1.5) + fl('M11.5 29.4H36.5L33.6 45H14.4Z'), circ(24, 36.5, 3.6, K)) +
      st('M24 25V18', 2.6) + rect(20.4, 4.5, 7.2, 13.5, 3.6) +
      st('M15.5 7Q12.5 11.5 15.5 16M10.5 4Q5.5 11.5 10.5 19M32.5 7Q35.5 11.5 32.5 16M37.5 4Q42.5 11.5 37.5 19', 2.8),
  },
  {
    id: 'policing-soft', family: 'home', label: 'Soft policing', idea: 'Police cap and a speech bubble',
    accept: ['soft policing', 'community policing', 'police talks', 'negotiate', 'police dialogue', 'calm policing', 'police', 'dialogue', 'mediation police'],
    svg: (id) =>
      talkBadged(id,
        knock(`${id}-c`, fl('M3 14.5C3 9 13.5 6.5 24 6.5C34.5 6.5 45 9 45 14.5L38.5 22H9.5Z') + rect(10, 23.4, 28, 5, 1) + fl('M10 30H38C36.5 34.6 31 36.4 24 36.4C17 36.4 11.5 34.6 10 30Z'), fl(star(24, 14.4, 5, 2.1, 5), K))),
  },
  {
    id: 'policing-hard', family: 'home', label: 'Hard crackdown', idea: 'Riot shield and baton',
    accept: ['crackdown', 'hard crackdown', 'riot police', 'repression', 'force', 'martial law', 'suppress', 'riot control', 'hard policing', 'police'],
    svg: (id) =>
      knock(id, rect(6.5, 4.5, 25, 39, 5), rect(10.5, 8.5, 17, 7.5, 2, K) + rect(10.5, 21, 17, 2.4, 1, K) + crossedLine('M28.5 45L44 13', 9.5)) +
      st('M28.5 45L44 13', 5) + st('M31.2 36.6L38.6 40.2', 3.6),
  },
];

/** Reserve pictograms for economy orders the registry does not have yet (sanctions, aid, trade). */
export const RESERVE = [
  {
    id: 'reserve-sanctions', family: 'econ', label: 'Sanctions (reserve)', idea: 'Padlock on money',
    svg: (id) => knock(id, rect(9, 21, 30, 23, 4) + st('M16 21.5V15C16 6.5 32 6.5 32 15V21.5', 4.6), st('M28 27.6C26.6 26 20.6 25.8 20.4 29C20.2 32.2 27.8 31.8 27.7 35.4C27.5 38.8 21.2 38.8 19.9 36.9M24 24.6V40.4', 2.8, K)),
  },
  {
    id: 'reserve-aid', family: 'econ', label: 'Aid (reserve)', idea: 'Care package with a heart',
    svg: (id) => knock(id, rect(4, 9, 40, 8, 2) + rect(7, 18.5, 34, 26, 2.5), fl('M24 39C17 34 14.5 31 14.5 27.5C14.5 24.5 17 22.5 19.5 22.5C21.5 22.5 23 23.6 24 25.2C25 23.6 26.5 22.5 28.5 22.5C31 22.5 33.5 24.5 33.5 27.5C33.5 31 31 34 24 39Z', K)),
  },
  {
    id: 'reserve-trade', family: 'econ', label: 'Trade deal (reserve)', idea: 'Container ship with two-way arrows',
    svg: (id) =>
      knock(id, fl('M3 31H45L40 42H9Z') + rect(9, 23.5, 8, 6.2, 1) + rect(18, 23.5, 8, 6.2, 1) + rect(27, 23.5, 8, 6.2, 1) + rect(36, 19, 5, 10.7, 1), '') +
      st('M8 7H30M26 3L30.5 7L26 11', 3) + st('M40 15H18M22 11L17.5 15L22 19', 3),
  },
];

export const FAMILIES = {
  diplo: { name: 'Diplomacy', accent: '#4691ff', ink: '#8cbbff', chipBg: '#243858' },
  mil: { name: 'Military', accent: '#ff7d4f', ink: '#ffae92', chipBg: '#41353c' },
  nuke: { name: 'Nuclear', accent: '#f5d547', ink: '#f9e58d', chipBg: '#40433a' },
  intel: { name: 'Covert', accent: '#f48fd2', ink: '#f8bae3', chipBg: '#3f3851' },
  econ: { name: 'Economy', accent: '#1fbf95', ink: '#74d7bd', chipBg: '#1d3f47' },
  home: { name: 'Home', accent: '#f1ede4', ink: '#f6f4ee', chipBg: '#3f4754' },
};

const fileSvg = (icon) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="currentColor" role="img" aria-label="${icon.label}" data-order-id="${icon.id}" data-family="${icon.family}">\n  <title>${icon.label}</title>\n  ${icon.svg(`oi-${icon.id}`)}\n</svg>\n`;

const all = [...ICONS, ...RESERVE];
for (const icon of all) fs.writeFileSync(path.join(here, `${icon.id}.svg`), fileSvg(icon));

// Sprite for the mocks: symbols injected once per page, used with <svg><use href="#oi-ID"/></svg>
const symbols = all.map((i) => `<symbol id="oi-${i.id}" viewBox="0 0 48 48" fill="currentColor">${i.svg(`oim-${i.id}`)}</symbol>`).join('');
const meta = all.map(({ id, family, label, idea }) => ({ id, family, label, idea }));
fs.writeFileSync(
  path.join(here, 'sprite.js'),
  `// Generated by build.mjs: the order pictograms as an inline SVG sprite, plus their metadata.\n(function () {\n  var d = document.createElement('div');\n  d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';\n  d.setAttribute('aria-hidden', 'true');\n  d.innerHTML = ${JSON.stringify(`<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">${symbols}</svg>`)};\n  (document.body || document.documentElement).appendChild(d);\n  window.ORDER_ICONS = ${JSON.stringify(meta)};\n  window.ORDER_FAMILIES = ${JSON.stringify(FAMILIES)};\n})();\n`,
);

// Recognition sheet: a fixed shuffle (no family grouping, no colour, no labels)
const order = ICONS.map((i, n) => ({ i, k: (n * 17 + 5) % 29 })).sort((a, b) => a.k - b.k).map((x) => x.i);
fs.writeFileSync(path.join(here, 'recognition-key.json'), JSON.stringify(order.map((i, n) => ({ n: n + 1, id: i.id, label: i.label, accept: i.accept })), null, 2));
const cell = (i, n) =>
  `<figure><span class="n">${n + 1}</span><div class="big"><svg viewBox="0 0 48 48"><use href="#oi-${i.id}"/></svg></div><div class="small"><svg viewBox="0 0 48 48"><use href="#oi-${i.id}"/></svg><svg viewBox="0 0 48 48" class="inv"><use href="#oi-${i.id}"/></svg></div><div class="line"></div></figure>`;
fs.writeFileSync(
  path.join(here, '..', 'order-icons-recognition-sheet.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order icon test</title>
<style>
body{margin:0;background:#0b0f17;color:#e8ecf2;font:15px/1.4 Geist,Inter,system-ui,sans-serif;padding:28px}
h1{font-size:22px;margin:0 0 4px}p{margin:0 0 20px;color:#a3aebf;max-width:880px}
.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:14px;max-width:1240px}
figure{margin:0;position:relative;background:#1d2738;border:1px solid #3a4759;border-radius:14px;padding:14px 10px 10px;display:grid;justify-items:center;gap:10px}
.n{position:absolute;top:8px;left:10px;font:700 15px Geist Mono,ui-monospace,monospace;color:#e8ecf2}
.big{width:72px;height:72px;border-radius:18px;background:#d9dee7;color:#0c1322;display:grid;place-items:center}
.big svg{width:48px;height:48px}
.small{display:flex;gap:10px;align-items:center}.small svg{width:24px;height:24px;color:#0c1322;background:#d9dee7;border-radius:6px;padding:4px}
.small svg.inv{color:#e8ecf2;background:none;padding:0}
.line{width:100%;border-bottom:1px dashed #56657c;height:18px}
</style></head><body><script src="order-icons/sprite.js"></script>
<h1>Order icons: what does each one do?</h1>
<p>Each picture is one order you can give as a head of government. For each number, write the order in a few words (for example "build a school"). Do not look anything up. Shown at 48 px on a plate, and at 24 px on a plate and bare.</p>
<div class="grid">${order.map(cell).join('')}</div></body></html>\n`,
);

// Contact sheet: every icon by family, at 96, 48 and 24 px, plate and bare, with the 48 grid
const famOrder = ['diplo', 'mil', 'nuke', 'intel', 'econ', 'home'];
const row = (i) => {
  const f = FAMILIES[i.family];
  const u = `<use href="#oi-${i.id}"/>`;
  return `<div class="row" style="--a:${f.accent};--ink:${f.ink};--chip:${f.chipBg}">
<div class="g96"><svg viewBox="0 0 48 48">${u}</svg></div>
<div class="p48"><svg viewBox="0 0 48 48">${u}</svg></div>
<div class="p24"><svg viewBox="0 0 48 48">${u}</svg></div>
<div class="b24"><svg viewBox="0 0 48 48">${u}</svg></div>
<div class="n24"><svg viewBox="0 0 48 48">${u}</svg></div>
<div class="txt"><b>${i.label}</b><span class="chip">${f.name}</span><br><code>${i.id}</code> &middot; ${i.idea}</div></div>`;
};
const cvdFilters = `<svg width="0" height="0" style="position:absolute"><filter id="protan" color-interpolation-filters="linearRGB"><feColorMatrix values="0.152286 1.052583 -0.204868 0 0 0.114503 0.786281 0.099216 0 0 -0.003882 -0.048116 1.051998 0 0 0 0 0 1 0"/></filter><filter id="deutan" color-interpolation-filters="linearRGB"><feColorMatrix values="0.367322 0.860646 -0.227968 0 0 0.280085 0.672501 0.047413 0 0 -0.01182 0.04294 0.968881 0 0 0 0 0 1 0"/></filter><filter id="tritan" color-interpolation-filters="linearRGB"><feColorMatrix values="1.255528 -0.076749 -0.178779 0 0 -0.078411 0.930809 0.147602 0 0 0.004733 0.691367 0.3039 0 0 0 0 0 1 0"/></filter></svg>`;
const strip = famOrder.map((k) => `<div class="sw" style="--a:${FAMILIES[k].accent}"><svg viewBox="0 0 48 48"><use href="#oi-${ICONS.find((i) => i.family === k).id}"/></svg><span>${FAMILIES[k].name}</span></div>`).join('');
fs.writeFileSync(
  path.join(here, 'contact-sheet.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order icon set</title>
<style>
:root{--card:#1d2738}
body{margin:0;background:#0b0f17;color:#e8ecf2;font:14px/1.4 Geist,Inter,system-ui,sans-serif;padding:28px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#a3aebf;margin:28px 0 8px}
p{color:#a3aebf;margin:0 0 12px;max-width:960px}
.cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 28px}
.row{display:grid;grid-template-columns:96px 64px 40px 32px 32px 1fr;gap:14px;align-items:center;padding:8px 0;border-bottom:1px solid #2a3546}
.g96{width:96px;height:96px;background:#fff;color:#0c1322;border-radius:8px;background-image:linear-gradient(#e3e7ee 1px,transparent 1px),linear-gradient(90deg,#e3e7ee 1px,transparent 1px);background-size:8px 8px;outline:1px dashed #c4ccd8;outline-offset:-12px}
.g96 svg{width:96px;height:96px}
.p48{width:64px;height:64px;border-radius:16px;background:var(--a);color:#0c1322;display:grid;place-items:center;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}
.p48 svg{width:48px;height:48px}
.p24{width:34px;height:34px;border-radius:9px;background:var(--a);color:#0c1322;display:grid;place-items:center}.p24 svg{width:24px;height:24px}
.b24 svg{width:24px;height:24px;color:var(--ink)}.n24 svg{width:24px;height:24px;color:#e8ecf2}
.txt code{color:#8693a6;font:12px Geist Mono,monospace}
.chip{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:999px;background:var(--chip);color:var(--ink);border:1px solid var(--a);font-size:12px;font-weight:700;letter-spacing:.04em}
.strips{display:grid;gap:8px}.strip{display:flex;gap:10px;align-items:center}.strip>b{width:150px;color:#a3aebf;font-weight:600}
.sw{display:flex;flex-direction:column;align-items:center;gap:4px;width:84px}.sw svg{width:40px;height:40px;padding:8px;border-radius:12px;background:var(--a);color:#0c1322}.sw span{font-size:12px;color:#e8ecf2}
</style></head><body><script src="sprite.js"></script>${cvdFilters}
<h1>Order pictograms: contact sheet</h1>
<p>28 orders in the registry plus 3 reserve pictograms. Columns: 96 px on the 48-unit grid (dashed: live area), 48 px on the family plate, 24 px on the plate, 24 px bare in family ink, 24 px bare in text colour. Icons are monochrome; the family colour is only the plate.</p>
<h2>Family plates under colour vision deficiency (simulated)</h2>
<div class="strips"><div class="strip"><b>Normal vision</b>${strip}</div><div class="strip" style="filter:url(#protan)"><b>Protanopia</b>${strip}</div><div class="strip" style="filter:url(#deutan)"><b>Deuteranopia</b>${strip}</div><div class="strip" style="filter:url(#tritan)"><b>Tritanopia</b>${strip}</div></div>
${famOrder.map((k) => `<h2>${FAMILIES[k].name}</h2><div class="cols">${ICONS.filter((i) => i.family === k).map(row).join('')}</div>`).join('')}
<h2>Reserve (no registry order yet)</h2><div class="cols">${RESERVE.map(row).join('')}</div>
</body></html>\n`,
);
console.log(`wrote ${all.length} icons, sprite.js, contact-sheet.html, recognition sheet`);
