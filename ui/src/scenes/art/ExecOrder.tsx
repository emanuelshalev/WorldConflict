import { useId } from 'react';
import type { SceneArtProps } from './types';
import NationFlag from './Flag';
import './civic.css';

const KEY = { good: '#ffc76e', bad: '#ff8a62', neutral: '#ffdcaa' };
const LEATHER = { good: '#5a1e22', bad: '#3a1416', neutral: '#4a1a20' };

/** Aides standing behind the desk: x, scale, bob delay. */
const AIDES: Array<[number, number, number]> = [
  [178, 1.02, 0], [246, 1.1, -2], [398, 1.08, -3.5], [468, 1.0, -1],
];
/** Pens laid out on the desk: x, y, angle. */
const PENS: Array<[number, number, number]> = [
  [470, 222, -18], [486, 228, -14], [502, 234, -10], [518, 240, -6], [534, 246, -2],
];

export default function ExecOrder({ a, mood }: SceneArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const u = (n: string) => `exec-${n}-${uid}`;
  const f = (n: string) => `url(#${u(n)})`;
  const key = KEY[mood];
  const accent = a[0] === '#ffffff' ? a[1] : a[0];
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-exec_order" aria-hidden>
      <defs>
        <linearGradient id={u('wall')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2b2017" />
          <stop offset="0.5" stopColor="#1c1612" />
          <stop offset="1" stopColor="#0d0b0a" />
        </linearGradient>
        <linearGradient id={u('shaft')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={key} stopOpacity="0.35" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={u('desk')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3e2414" />
          <stop offset="0.5" stopColor="#5a3420" />
          <stop offset="1" stopColor="#1a0e07" />
        </linearGradient>
        <radialGradient id={u('pool')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={key} stopOpacity="0.45" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={u('suit')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0d1119" />
          <stop offset="0.6" stopColor="#232b3c" />
          <stop offset="1" stopColor="#343f58" />
        </linearGradient>
        <linearGradient id={u('aide')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e2432" />
          <stop offset="1" stopColor="#0b0d13" />
        </linearGradient>
        <radialGradient id={u('head')} cx="0.6" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#6e4f3e" />
          <stop offset="1" stopColor="#231a17" />
        </radialGradient>
        <linearGradient id={u('paper')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9d2c2" />
          <stop offset="1" stopColor="#f6f1e6" />
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
          <stop offset="0.3" stopColor="#eaf3ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#cfe2ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Office wall, tall window light, flag */}
      <rect width="640" height="360" fill={f('wall')} />
      <rect x="20" y="10" width="90" height="160" fill={key} opacity="0.12" />
      <path d="M20 10 H110 V170 H20 Z M65 10 V170 M20 90 H110" stroke="#120d09" strokeWidth="5" fill="none" />
      <path d="M20 10 L110 10 L420 360 L140 360 Z" fill={f('shaft')} />
      {[520, 580].map((x) => (
        <rect key={x} x={x} y="20" width="44" height="130" rx="2" fill="none" stroke="#3a2a1c" strokeOpacity="0.5" strokeWidth="2" />
      ))}
      <g transform="translate(132 34)">
        <rect x="-1.5" y="-6" width="3" height="150" fill="#b28f55" />
        <circle cy="-8" r="4.5" fill="#e3bf77" />
        <g className="exec-flag">
          <NationFlag colors={a} x={0} y={0} w={40} h={102} d="M0 0 Q20 4 40 0 L36 96 Q18 104 0 96 Z" />
          <path d="M0 0 Q20 4 40 0 L36 96 Q18 104 0 96 Z" fill={f('fold')} />
        </g>
      </g>

      {/* Aides standing behind, slightly soft */}
      {AIDES.map(([x, s, d]) => (
        <g key={x} transform={`translate(${x} 176) scale(${s})`} opacity="0.85">
          <g className="exec-bob" style={{ animationDelay: `${d}s` }}>
            <path d="M-28 30 L-26 -66 Q-24 -82 -11 -84 L11 -84 Q24 -82 26 -66 L28 30 Z" fill={f('aide')} />
            <path d="M-7 -84 L0 -66 L7 -84 Z" fill="#9aa3b1" opacity="0.6" />
            <ellipse cx="0" cy="-98" rx="10" ry="12" fill="#2a201c" />
            <path d="M-10.5 -99 Q-10 -112 0 -112 Q10 -112 10.5 -99 Q5 -105 0 -104 Q-6 -105 -10.5 -99Z" fill="#0d0c0f" />
            <path d={x < 320 ? 'M9 -106 Q11 -98 8 -90' : 'M-9 -106 Q-11 -98 -8 -90'} stroke={key} strokeOpacity="0.5" strokeWidth="1.4" fill="none" />
            {x === 398 && <rect x="8" y="-60" width="18" height="24" rx="1.5" fill="#cfc8b8" opacity="0.7" />}
          </g>
        </g>
      ))}

      {/* The leader, head bowed over the folder */}
      <g transform="translate(320 186) scale(1.5)">
        <path d="M-34 6 L-30 -34 Q-27 -48 -12 -50 L12 -50 Q27 -48 30 -34 L34 6 Z" fill={f('suit')} />
        <path d="M-8 -50 L0 -34 L8 -50 Z" fill="#e1e5eb" />
        <path d="M-2.4 -48 L2.4 -48 L3.2 -38 L0 -34 L-3.2 -38 Z" fill="#8c1d26" />
        <ellipse cy="-58" rx="11" ry="12" fill={f('head')} />
        <path d="M-11.4 -58 Q-12 -71 0 -71 Q12 -71 11.4 -58 Q8 -62 0 -62 Q-8 -62 -11.4 -58Z" fill="#0d0c0f" />
        <path d="M10 -66 Q12 -58 9 -51 M30 -34 L33 2" stroke={key} strokeWidth="1.5" fill="none" opacity="0.85" strokeLinecap="round" />
      </g>

      {/* Desk */}
      <path d="M40 166 L600 166 L760 380 L-120 380 Z" fill={f('desk')} />
      <path d="M40 166 H600" stroke={key} strokeOpacity="0.5" strokeWidth="1.2" />
      <ellipse cx="320" cy="226" rx="200" ry="50" fill={f('pool')} />

      {/* Leather folder with the order */}
      <path d="M222 178 L418 178 L446 276 L194 276 Z" fill={LEATHER[mood]} />
      <path d="M222 178 L418 178" stroke={key} strokeOpacity="0.6" />
      <path d="M232 184 L316 184 L314 268 L208 268 Z" fill={f('paper')} />
      <path d="M324 184 L408 184 L432 268 L326 268 Z" fill={f('paper')} />
      <path d="M320 180 L320 274" stroke="#2a0c0f" strokeWidth="3" />
      <circle cx="272" cy="198" r="7" fill="none" stroke={accent} strokeWidth="2" />
      <circle cx="272" cy="198" r="3" fill={accent} />
      {[212, 222, 232, 242, 252].map((y, i) => (
        <path key={y} d={`M${236 - i * 2.4} ${y} L${306 + (i % 2) * -10} ${y}`} stroke="#7a7368" strokeWidth="2" />
      ))}
      {[196, 206, 216, 226].map((y, i) => (
        <path key={y} d={`M${332 + i * 0.6} ${y} L${400 + i * 2.4 - (i % 2) * 10} ${y}`} stroke="#7a7368" strokeWidth="2" />
      ))}
      <path d="M346 254 L420 254" stroke="#5a5348" strokeWidth="1.2" />
      <path className="exec-sign" pathLength={90} d="M350 250 Q356 236 362 248 T374 246 Q380 236 386 250 T400 244 Q406 240 412 248" stroke="#13204a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="408" y="200" width="14" height="14" rx="7" fill="#b51e2a" opacity="0.8" />

      {/* Arms, hands and pen */}
      <path d="M278 150 Q258 190 272 220 L284 236" stroke="#1a2030" strokeWidth="22" fill="none" strokeLinecap="round" />
      <path d="M278 228 L290 240" stroke="#e6e9ee" strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="294" cy="246" rx="11" ry="8" fill="#4a3428" />
      {/* Signing arm: upper arm swings from the shoulder, forearm and pen from the elbow */}
      <g className="exec-arm">
        <path d="M356 132 L390 192" stroke="#232b3c" strokeWidth="22" fill="none" strokeLinecap="round" />
        <path d="M374 140 Q392 166 400 186" stroke={key} strokeOpacity="0.45" strokeWidth="1.5" fill="none" />
        <g className="exec-fore">
          <path d="M390 192 L376 232" stroke="#232b3c" strokeWidth="22" fill="none" strokeLinecap="round" />
          <path d="M400 196 Q396 210 390 222" stroke={key} strokeOpacity="0.45" strokeWidth="1.5" fill="none" />
          <path d="M378 226 L370 240" stroke="#e6e9ee" strokeWidth="9" strokeLinecap="round" />
          <ellipse cx="366" cy="246" rx="10" ry="8" fill="#4a3428" />
          <path d="M362 252 L388 214" stroke="#0e0e12" strokeWidth="4" strokeLinecap="round" />
          <path d="M384 220 L388 214" stroke="#d8b46a" strokeWidth="4" strokeLinecap="round" />
          <circle cx="361" cy="253" r="1.5" fill="#d8b46a" />
        </g>
      </g>

      {/* Pens laid out and a pen tray */}
      <path d="M458 252 L556 252 L566 266 L452 266 Z" fill="#2a1a10" />
      {PENS.map(([x, y, r]) => (
        <g key={x} transform={`rotate(${r} ${x} ${y})`}>
          <rect x={x - 2} y={y - 22} width="4" height="34" rx="2" fill="#0d0e12" />
          <rect x={x - 2} y={y - 22} width="4" height="5" rx="1" fill="#d8b46a" />
        </g>
      ))}
      <path d="M150 230 L200 226 L206 252 L152 258 Z" fill="#e8e1d2" opacity="0.6" />
      <path d="M156 236 L198 233" stroke="#6a6458" strokeWidth="1.4" />

      {/* Camera flash */}
      <g className="exec-flash">
        <circle cx="560" cy="90" r="42" fill={f('burst')} />
        <path d="M560 60 L563 87 L590 90 L563 93 L560 120 L557 93 L530 90 L557 87 Z" fill="#fff" />
      </g>
      <g className="exec-flash" style={{ animationDelay: '-2.2s', animationDuration: '5.3s' }}>
        <circle cx="70" cy="200" r="36" fill={f('burst')} />
      </g>
    </svg>
  );
}
