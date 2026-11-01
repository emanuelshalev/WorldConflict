import { useId } from 'react';
import type { SceneArtProps } from './types';
import './civic.css';

const LED = {
  good: ['#0d3a4a', '#1f7a7a', '#ffc66e'],
  bad: ['#3a0b12', '#8a1f24', '#ff5a3d'],
  neutral: ['#0c2346', '#1d4f9a', '#6fb6ff'],
};
const KEY = { good: '#ffd08a', bad: '#ff9a7a', neutral: '#ffe3bd' };

/** Skyline blocks on the LED wall: x, width, height. */
const TOWERS: Array<[number, number, number]> = [
  [44, 30, 46], [76, 18, 70], [96, 26, 52], [124, 14, 88], [140, 30, 60], [172, 22, 40],
  [196, 34, 74], [232, 16, 54], [400, 24, 58], [426, 14, 92], [442, 30, 66], [474, 20, 48],
  [496, 28, 80], [526, 16, 56], [544, 34, 70], [580, 20, 44],
];

/** Seated guest in profile facing right, seat front at 0,0. */
function Seated({ f, x, y, s, flip, rim, tie, nod }: { f: (n: string) => string; x: number; y: number; s: number; flip: boolean; rim: string; tie: string; nod: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M-44 -2 Q-52 -56 -38 -84 Q-30 -92 -22 -84 Q-18 -44 -14 -2 Z" fill="#1a1d26" />
      <path d="M-38 -84 Q-30 -92 -22 -84" stroke={rim} strokeWidth="2" fill="none" opacity="0.6" />
      <rect x="-15" y="6" width="7" height="36" fill="#0d0f14" />
      <ellipse cx="-11" cy="43" rx="28" ry="4.5" fill="#0d0f14" />
      <rect x="-46" y="-8" width="70" height="15" rx="7" fill="#232734" />
      <path d="M-30 -4 L-28 -54 Q-26 -68 -13 -68 L-2 -68 Q9 -66 9 -52 L5 -4 Z" fill={f('suit')} />
      <path d="M-1 -66 L4 -50 L7 -63 Z" fill="#d9dee6" />
      <path d="M2 -60 L5 -48 L6 -58 Z" fill={tie} />
      <path d="M-26 -10 L30 -15 Q39 -15 39 -6 L37 3 L-24 5 Z" fill={f('suit')} />
      <path d="M27 -5 L38 -5 L42 40 L31 40 Z" fill="#141822" />
      <path d="M29 39 L50 39 Q53 44 48 46 L29 46 Z" fill="#07080b" />
      <g className="tv-nod" style={{ animationDelay: `${nod}s` }}>
        <rect x="-14" y="-76" width="9" height="10" fill="#241b19" />
        <ellipse cx="-8" cy="-82" rx="11" ry="13" fill={f('head')} />
        <path d="M-19.5 -82 Q-20 -97 -7 -96 Q4 -96 3 -86 Q-4 -91 -10 -88 Q-14 -84 -19.5 -82Z" fill="#0b0b0e" />
        <path d="M2 -88 Q4 -80 1 -72" stroke={rim} strokeWidth="1.6" fill="none" opacity="0.85" strokeLinecap="round" />
      </g>
      <path d="M-14 -60 Q-12 -36 -2 -24 L22 -18" stroke="#161a24" strokeWidth="11" fill="none" strokeLinecap="round" />
      <path d="M8 -52 Q9 -44 8 -38" stroke={rim} strokeWidth="1.6" fill="none" opacity="0.7" />
    </g>
  );
}

export default function TvInterview({ a, mood }: SceneArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const u = (n: string) => `tv-${n}-${uid}`;
  const f = (n: string) => `url(#${u(n)})`;
  const [deep, mid, glow] = LED[mood];
  const key = KEY[mood];
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-tv_interview" aria-hidden>
      <defs>
        <linearGradient id={u('led')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#04060c" />
          <stop offset="0.55" stopColor={deep} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
        <radialGradient id={u('halo')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={glow} stopOpacity="0.55" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <pattern id={u('px')} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="none" />
          <rect x="3" width="1" height="4" fill="#000" opacity="0.18" />
          <rect y="3" width="4" height="1" fill="#000" opacity="0.18" />
        </pattern>
        <linearGradient id={u('floor')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mid} stopOpacity="0.35" />
          <stop offset="0.4" stopColor="#0a0c12" />
          <stop offset="1" stopColor="#050609" />
        </linearGradient>
        <linearGradient id={u('suit')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c3447" />
          <stop offset="1" stopColor="#0c0f17" />
        </linearGradient>
        <radialGradient id={u('head')} cx="0.65" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#6a4c3e" />
          <stop offset="1" stopColor="#201715" />
        </radialGradient>
        <linearGradient id={u('cone')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={key} stopOpacity="0.32" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={u('cam')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#05060a" />
          <stop offset="1" stopColor="#151925" />
        </linearGradient>
      </defs>

      <rect width="640" height="360" fill="#05070c" />

      {/* LED backdrop: night skyline and a turning globe */}
      <rect x="34" y="26" width="572" height="196" rx="6" fill="#020306" />
      <rect x="40" y="32" width="560" height="184" fill={f('led')} />
      <ellipse cx="320" cy="112" rx="150" ry="90" fill={f('halo')} />
      {TOWERS.map(([x, w, h], i) => (
        <g key={x}>
          <rect x={x} y={216 - h} width={w} height={h} fill="#03050a" opacity="0.85" />
          {[0, 1, 2, 3].map((r) =>
            h > 20 + r * 16 ? (
              <rect key={r} className="tv-twinkle" style={{ animationDelay: `${-((i * 7 + r * 3) % 9) * 0.5}s` }} x={x + 4} y={216 - h + 8 + r * 16} width={w - 8} height="2" fill={glow} opacity="0.5" />
            ) : null,
          )}
        </g>
      ))}
      <g stroke={glow} strokeOpacity="0.7" fill="none" strokeWidth="1.3">
        <circle cx="320" cy="112" r="58" strokeWidth="2" />
        <ellipse cx="320" cy="112" rx="58" ry="20" />
        <line x1="262" y1="112" x2="378" y2="112" />
        <ellipse cx="320" cy="82" rx="49" ry="10" strokeOpacity="0.4" />
        <ellipse cx="320" cy="142" rx="49" ry="10" strokeOpacity="0.4" />
        <g className="tv-globe">
          <ellipse cx="320" cy="112" rx="22" ry="58" />
          <ellipse cx="320" cy="112" rx="44" ry="58" strokeOpacity="0.45" />
        </g>
      </g>
      <circle cx="320" cy="112" r="58" fill={glow} opacity="0.07" />
      <rect x="40" y="200" width="560" height="16" fill="#02040a" opacity="0.7" />
      <g className="tv-crawl">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => (
          <rect key={i} x={48 + i * 65} y="205" width={i % 3 === 0 ? 20 : 44} height="5" rx="1" fill={i % 3 === 0 ? a[0] === '#ffffff' ? a[1] : a[0] : glow} opacity="0.75" />
        ))}
      </g>
      <rect x="40" y="32" width="560" height="184" fill={f('px')} />

      {/* Lighting truss and fresnels */}
      <rect x="0" y="6" width="640" height="7" fill="#0d1018" />
      {[120, 250, 390, 520].map((x, i) => (
        <g key={x}>
          <g className="tv-sweep" style={{ animationDelay: `${-i * 2.7}s` }}>
            <path d={`M${x - 9} 26 L${x + 9} 26 L${x + 70 - i * 30} 300 L${x - 60 - i * 15} 300 Z`} fill={f('cone')} opacity={i === 1 || i === 2 ? 0.9 : 0.45} />
          </g>
          <rect x={x - 11} y="12" width="22" height="16" rx="3" fill="#161a24" />
          <ellipse cx={x} cy="28" rx="9" ry="3" fill="#fff4dc" />
          <ellipse cx={x} cy="30" rx="22" ry="8" fill={key} opacity="0.35" />
        </g>
      ))}

      {/* Glossy studio floor and round riser */}
      <rect x="0" y="216" width="640" height="144" fill={f('floor')} />
      <ellipse cx="320" cy="270" rx="250" ry="34" fill="#0d1019" />
      <ellipse cx="320" cy="266" rx="250" ry="34" fill="none" stroke={glow} strokeOpacity="0.55" strokeWidth="1.5" />
      <ellipse cx="320" cy="262" rx="120" ry="12" fill={key} opacity="0.12" />

      {/* Host (left) and leader (right), angled toward each other */}
      <Seated f={f} x={222} y={224} s={1.22} flip={false} rim={glow} tie="#3a3f52" nod={0} />
      <Seated f={f} x={420} y={224} s={1.28} flip rim={key} tie={a[2] === '#ffffff' ? a[0] : a[2]} nod={-2.2} />

      {/* Coffee table with mugs */}
      <ellipse cx="321" cy="244" rx="30" ry="6" fill="#1b1f2a" stroke={glow} strokeOpacity="0.4" />
      <rect x="318" y="246" width="6" height="26" fill="#0d1018" />
      <rect x="306" y="234" width="8" height="9" rx="1.5" fill="#e9e4da" />
      <rect x="328" y="235" width="8" height="8" rx="1.5" fill={a[0] === '#ffffff' ? a[1] : a[0]} />

      {/* Foreground studio camera seen from behind, with tally light */}
      <g>
        <path d="M66 360 L80 280 L98 280 L112 360 Z" fill="#05060a" />
        <path d="M-10 300 L40 262 L48 270 L-2 310 Z" fill="#0a0c12" />
        <path d="M108 194 L172 186 Q180 186 180 194 L180 238 Q180 246 172 246 L108 240 Z" fill="#0b0e15" />
        <path d="M108 194 L172 186 Q180 186 180 194" stroke={glow} strokeOpacity="0.8" strokeWidth="1.6" fill="none" />
        <path d="M180 184 L206 176 L206 254 L180 248 Z" fill="#0d1018" />
        <path d="M206 176 L206 254" stroke={glow} strokeWidth="2.2" strokeOpacity="0.85" />
        <rect x="-4" y="178" width="120" height="96" rx="14" fill={f('cam')} />
        <path d="M8 178 L104 178 Q116 178 116 190" stroke={glow} strokeOpacity="0.75" strokeWidth="1.8" fill="none" />
        <rect x="10" y="196" width="58" height="36" rx="3" fill="#03040a" stroke="#1d2230" strokeWidth="2" />
        <rect x="13" y="199" width="52" height="30" fill={deep} />
        <circle cx="39" cy="210" r="8" fill="none" stroke={glow} strokeOpacity="0.6" />
        <rect x="22" y="219" width="6" height="8" fill="#0a0c12" />
        <rect x="50" y="219" width="6" height="8" fill="#0a0c12" />
        <rect x="80" y="200" width="24" height="5" rx="2" fill="#1f2433" />
        <rect x="80" y="210" width="24" height="5" rx="2" fill="#1f2433" />
        <rect x="80" y="220" width="16" height="5" rx="2" fill={glow} opacity="0.5" />
        <rect x="24" y="156" width="62" height="24" rx="5" fill="#0d1018" />
        <path d="M27 157 L83 157" stroke={glow} strokeOpacity="0.6" />
        <g opacity="0.25">
          <ellipse className="tv-tally" cx="76" cy="165" rx="24" ry="12" fill="#ff2a2a" />
        </g>
        <rect className="tv-tally" x="66" y="161" width="20" height="8" rx="3" fill="#ff2a2a" />
      </g>
    </svg>
  );
}
