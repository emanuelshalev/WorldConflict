import { useId } from 'react';
import type { SceneArtProps } from './types';
import './civic.css';

const KEY = { good: '#ffd38a', bad: '#ff8a6a', neutral: '#fff0d6' };
const CURTAIN = { good: ['#16306a', '#2c55a8'], bad: ['#2a1630', '#5a2440'], neutral: ['#102552', '#23489a'] };

/** Foreground press: heads x, y, r (back view, dark). */
const HEADS: Array<[number, number, number]> = [
  [18, 318, 22], [74, 330, 24], [132, 312, 21], [196, 334, 25], [258, 322, 22], [384, 326, 23],
  [446, 314, 21], [506, 332, 25], [566, 318, 22], [624, 334, 24], [320, 344, 24],
];
/** Raised cameras: x, y, tilt, flash delay. */
const CAMS: Array<[number, number, number, number]> = [
  [96, 262, -8, 0], [226, 268, 6, -1.4], [418, 264, -5, -2.6], [548, 258, 9, -0.7],
];
/** Raised hands: x, y, delay. */
const HANDS: Array<[number, number, number]> = [
  [160, 250, 0], [478, 246, -1.8], [600, 256, -3.1],
];
const FLASHES: Array<[number, number, number, number]> = [
  [104, 244, 0, 3.7], [233, 251, -1.4, 4.3], [425, 247, -2.6, 3.1], [556, 240, -0.7, 5.2], [30, 270, -3.3, 4.9], [612, 276, -2.1, 3.9],
];

function Flag({ f, x, flip }: { f: (n: string) => string; x: number; flip: boolean }) {
  const d = flip ? 'M0 0 Q-22 4 -44 0 L-40 104 Q-20 112 0 104 Z' : 'M0 0 Q22 4 44 0 L40 104 Q20 112 0 104 Z';
  return (
    <g transform={`translate(${x} 46)`}>
      <rect x="-1.5" y="-6" width="3" height="214" fill="#b89558" />
      <circle cy="-8" r="4.5" fill="#e6c27a" />
      <g className="press-flag" style={{ animationDelay: flip ? '-3s' : '0s' }}>
        <path d={d} fill={f('fa')} />
        <path d={d} fill={f('fold')} />
      </g>
    </g>
  );
}

export default function Press({ a, mood }: SceneArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const u = (n: string) => `press-${n}-${uid}`;
  const f = (n: string) => `url(#${u(n)})`;
  const key = KEY[mood];
  const [c0, c1] = CURTAIN[mood];
  const crest = a[0] === '#ffffff' ? a[1] : a[0];
  const star = a[1] === crest ? a[2] : a[1];
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-press" aria-hidden>
      <defs>
        <linearGradient id={u('fold-c')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c0} />
          <stop offset="0.5" stopColor={c1} />
          <stop offset="1" stopColor={c0} />
        </linearGradient>
        <pattern id={u('curtain')} width="34" height="360" patternUnits="userSpaceOnUse">
          <rect width="34" height="360" fill={f('fold-c')} />
        </pattern>
        <radialGradient id={u('spot')} cx="0.5" cy="0.45" r="0.5">
          <stop offset="0" stopColor={key} stopOpacity="0.55" />
          <stop offset="0.6" stopColor={key} stopOpacity="0.12" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={u('shade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0.2" />
          <stop offset="1" stopColor="#000" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={u('pod')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1a1410" />
          <stop offset="0.45" stopColor="#4a3424" />
          <stop offset="1" stopColor="#120d0a" />
        </linearGradient>
        <linearGradient id={u('suit')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0d1119" />
          <stop offset="0.6" stopColor="#222a3b" />
          <stop offset="1" stopColor="#323d55" />
        </linearGradient>
        <radialGradient id={u('head')} cx="0.6" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#6e5040" />
          <stop offset="1" stopColor="#231a17" />
        </radialGradient>
        <linearGradient id={u('fa')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.333" stopColor={a[0]} />
          <stop offset="0.333" stopColor={a[1]} />
          <stop offset="0.666" stopColor={a[1]} />
          <stop offset="0.666" stopColor={a[2]} />
        </linearGradient>
        <linearGradient id={u('fold')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.5" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0.4" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={u('burst')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.25" stopColor="#eaf3ff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#cfe2ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={u('beam')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={key} stopOpacity="0.3" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Curtain backdrop with folds, valance and spotlight */}
      <rect width="640" height="360" fill={f('curtain')} />
      <rect width="640" height="360" fill={f('shade')} />
      <rect width="640" height="22" fill={c0} />
      <rect y="22" width="640" height="3" fill="#d9b46a" opacity="0.7" />
      <ellipse className="press-beam" cx="320" cy="120" rx="190" ry="140" fill={f('spot')} />
      <path className="press-beam" d="M270 -10 L370 -10 L470 260 L170 260 Z" fill={f('beam')} />

      <Flag f={f} x={196} flip={false} />
      <Flag f={f} x={444} flip />

      {/* Stage */}
      <rect y="252" width="640" height="108" fill="#0b0d14" />
      <rect y="252" width="640" height="2" fill={key} opacity="0.25" />
      <ellipse cx="320" cy="262" rx="150" ry="14" fill={key} opacity="0.12" />

      {/* The leader at the lectern, one hand raised */}
      <g className="press-sway">
        <g transform="translate(320 178) scale(1.25)">
          <path d="M-30 4 L-28 -36 Q-25 -50 -12 -52 L12 -52 Q25 -50 28 -36 L30 4 Z" fill={f('suit')} />
          <path d="M-8 -52 L0 -32 L8 -52 Z" fill="#dfe4ea" />
          <path d="M-2.4 -50 L2.4 -50 L3.4 -38 L0 -32 L-3.4 -38 Z" fill="#8c1d26" />
          <rect x="-5" y="-60" width="10" height="9" fill="#241b19" />
          <ellipse cy="-67" rx="10.5" ry="12.5" fill={f('head')} />
          <path d="M-10.8 -68 Q-11 -81 0 -81 Q11 -81 10.8 -68 Q5 -75 0 -74 Q-6 -75 -10.8 -68Z" fill="#0d0c0f" />
          <path d="M9.5 -74 Q11.5 -66 8 -58 M28 -36 L30 0" stroke={key} strokeWidth="1.6" fill="none" opacity="0.85" strokeLinecap="round" />
          <path d="M26 -40 Q40 -36 42 -52 L44 -70" stroke="#232b3c" strokeWidth="10" fill="none" strokeLinecap="round" />
          <ellipse cx="44.5" cy="-76" rx="5" ry="7" fill={f('head')} />
          <path d="M48 -80 L48 -70" stroke={key} strokeWidth="1.2" opacity="0.8" />
        </g>
      </g>

      {/* Lectern with crest and microphones */}
      <path d="M318 166 Q306 150 300 142 M322 166 Q334 150 340 142" stroke="#1a1d24" strokeWidth="1.6" fill="none" />
      <rect x="296" y="137" width="7" height="9" rx="3" fill="#1d2028" />
      <rect x="337" y="137" width="7" height="9" rx="3" fill="#1d2028" />
      <path d="M262 164 L378 164 L384 174 L256 174 Z" fill="#5a4030" />
      <path d="M256 174 L384 174" stroke={key} strokeOpacity="0.6" />
      <path d="M266 174 L374 174 L362 302 L278 302 Z" fill={f('pod')} />
      <path d="M374 174 L362 302" stroke={key} strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="320" cy="216" r="25" fill="#d6b16a" />
      <circle cx="320" cy="216" r="22" fill={crest} />
      <circle cx="320" cy="216" r="16" fill="#0e1424" />
      <path d="M320 204 L323.5 212.5 L332.5 213 L325.5 218.5 L328 227 L320 222 L312 227 L314.5 218.5 L307.5 213 L316.5 212.5 Z" fill={star} />
      <circle cx="320" cy="216" r="22" fill="none" stroke={a[2]} strokeWidth="1.2" strokeDasharray="2 3" opacity="0.8" />

      {/* Foreground press: raised hands, cameras, heads */}
      {HANDS.map(([x, y, d]) => (
        <g key={x} className="press-hand" style={{ animationDelay: `${d}s` }}>
          <path d={`M${x + 10} ${y + 84} L${x} ${y + 14}`} stroke="#1a1f2b" strokeWidth="12" strokeLinecap="round" />
          <path d={`M${x + 4} ${y + 84} L${x - 5} ${y + 16}`} stroke={key} strokeOpacity="0.35" strokeWidth="1.4" />
          <path d={`M${x - 7} ${y + 14} L${x - 9} ${y - 4} M${x - 3} ${y + 10} L${x - 3} ${y - 9} M${x + 1} ${y + 10} L${x + 2} ${y - 8} M${x + 5} ${y + 12} L${x + 7} ${y - 4} M${x + 6} ${y + 16} L${x + 12} ${y + 8}`} stroke="#3b2c27" strokeWidth="3.6" strokeLinecap="round" />
          <ellipse cx={x} cy={y + 14} rx="7.5" ry="7" fill="#3b2c27" />
          <path d={`M${x - 9} ${y - 4} L${x - 7} ${y + 14}`} stroke={key} strokeOpacity="0.55" strokeWidth="1.2" />
        </g>
      ))}
      {CAMS.map(([x, y, t]) => (
        <g key={x} transform={`rotate(${t} ${x} ${y})`}>
          <path d={`M${x - 10} ${y + 22} L${x - 16} ${y + 80} M${x + 10} ${y + 22} L${x + 16} ${y + 80}`} stroke="#11141c" strokeWidth="9" strokeLinecap="round" />
          <rect x={x - 22} y={y - 2} width="44" height="28" rx="5" fill="#090b10" stroke="#2a3040" />
          <rect x={x - 10} y={y - 12} width="20" height="11" rx="2" fill="#0d1017" stroke="#2a3040" />
          <circle cx={x} cy={y + 12} r="10" fill="#05060a" stroke="#3a4255" strokeWidth="2" />
          <circle cx={x - 3} cy={y + 9} r="3" fill="#6f87b8" opacity="0.6" />
        </g>
      ))}
      {HEADS.map(([x, y, r]) => (
        <g key={x}>
          <path d={`M${x - r * 2} 380 Q${x - r * 2} ${y + r * 0.6} ${x} ${y + r * 0.6} Q${x + r * 2} ${y + r * 0.6} ${x + r * 2} 380 Z`} fill="#07080c" />
          <circle cx={x} cy={y} r={r} fill="#10131b" />
          <path d={`M${x - r * 0.7} ${y - r * 0.72} Q${x} ${y - r * 1.05} ${x + r * 0.7} ${y - r * 0.72}`} stroke={key} strokeOpacity="0.45" strokeWidth="1.6" fill="none" />
        </g>
      ))}

      {/* Camera flashes */}
      {FLASHES.map(([x, y, d, dur]) => (
        <g key={x} className="press-flash" style={{ animationDelay: `${d}s`, animationDuration: `${dur}s` }}>
          <circle cx={x} cy={y} r="34" fill={f('burst')} />
          <path d={`M${x} ${y - 26} L${x + 3} ${y - 3} L${x + 26} ${y} L${x + 3} ${y + 3} L${x} ${y + 26} L${x - 3} ${y + 3} L${x - 26} ${y} L${x - 3} ${y - 3} Z`} fill="#fff" />
        </g>
      ))}
    </svg>
  );
}
