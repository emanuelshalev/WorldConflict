import { useId } from 'react';
import type { SceneArtProps } from './types';
import NationFlag from './Flag';
import './civic.css';

const KEY = { good: '#ffc56a', bad: '#ff8660', neutral: '#ffd9a6' };
const SKY = { good: ['#2a1f3e', '#a0563a'], bad: ['#0a0710', '#5a1418'], neutral: ['#060b1c', '#1d3766'] };
const BOOKS = ['#5a2a24', '#28374f', '#6b5531', '#1f3b33', '#4b2236', '#7a6a4a', '#2f2a44', '#5d3b22'];

function Flag({ f, x, id, delay, colors }: { f: (n: string) => string; x: number; id: string; delay: string; colors?: readonly string[] }) {
  const d = 'M0 0 Q20 4 40 0 L36 100 Q18 108 0 100 Z';
  return (
    <g transform={`translate(${x} 40)`}>
      <rect x="-1.5" y="-6" width="3" height="170" fill="#b28f55" />
      <circle cy="-8" r="4.5" fill="#e3bf77" />
      <g className="addr-flag" style={{ animationDelay: delay }}>
        {colors ? <NationFlag colors={colors} x={0} y={0} w={40} h={108} d={d} /> : <path d={d} fill={f(id)} />}
        <path d={d} fill={f('fold')} />
      </g>
    </g>
  );
}

export default function Address({ a, mood }: SceneArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const u = (n: string) => `addr-${n}-${uid}`;
  const f = (n: string) => `url(#${u(n)})`;
  const key = KEY[mood];
  const [s0, s1] = SKY[mood];
  const accent = a[0] === '#ffffff' ? a[1] : a[0];
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-address" aria-hidden>
      <defs>
        <clipPath id={u('prompt')}>
          <path d="M519 203 L582 195 L592 289 L530 296 Z" />
        </clipPath>
        <linearGradient id={u('wall')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#140e0b" />
          <stop offset="0.6" stopColor="#3a2a1d" />
          <stop offset="1" stopColor="#1a120d" />
        </linearGradient>
        <linearGradient id={u('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s0} />
          <stop offset="1" stopColor={s1} />
        </linearGradient>
        <linearGradient id={u('drape')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a0d10" />
          <stop offset="0.3" stopColor="#6a2228" />
          <stop offset="0.55" stopColor="#3a1216" />
          <stop offset="0.8" stopColor="#7a2a2e" />
          <stop offset="1" stopColor="#2a0d10" />
        </linearGradient>
        <linearGradient id={u('desk')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4e2e1a" />
          <stop offset="1" stopColor="#160c07" />
        </linearGradient>
        <linearGradient id={u('suit')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0d1119" />
          <stop offset="0.65" stopColor="#222a3a" />
          <stop offset="1" stopColor="#36405a" />
        </linearGradient>
        <radialGradient id={u('head')} cx="0.62" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#7a5844" />
          <stop offset="1" stopColor="#261b17" />
        </radialGradient>
        <radialGradient id={u('key')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={key} stopOpacity="0.5" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={u('lamp')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe9b8" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffb85a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={u('fs')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} />
          <stop offset="1" stopColor={accent} />
        </linearGradient>
        <linearGradient id={u('fold')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.5" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0.4" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={u('glass')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9fc4ff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#d8e8ff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#9fc4ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Office wall, window with drapes, bookshelves */}
      <rect width="640" height="360" fill={f('wall')} />
      <rect x="244" y="22" width="152" height="164" fill={f('sky')} />
      {[262, 284, 300, 318, 336, 352, 372].map((x, i) => (
        <rect key={x} x={x} y={150 - ((i * 37) % 50)} width={12 + (i % 3) * 4} height={40 + ((i * 37) % 50)} fill="#04060c" opacity="0.85" />
      ))}
      {[268, 290, 322, 340, 358, 378].map((x, i) => (
        <rect key={x} className="addr-city" style={{ animationDelay: `${-i * 0.8}s` }} x={x} y={160 - (i % 3) * 12} width="3" height="3" fill={key} opacity="0.8" />
      ))}
      <path d="M244 22 H396 V186 H244 Z M318 22 V186 M244 100 H396" stroke="#24180f" strokeWidth="6" fill="none" />
      <path d="M232 14 Q250 100 236 196 L262 196 Q252 100 270 14 Z" fill={f('drape')} />
      <path d="M408 14 Q390 100 404 196 L378 196 Q388 100 370 14 Z" fill={f('drape')} />
      <rect x="222" y="8" width="196" height="9" rx="3" fill="#c9a35e" opacity="0.8" />
      {[0, 1].map((side) => (
        <g key={side} transform={side ? 'translate(640 0) scale(-1 1)' : undefined}>
          <rect x="0" y="0" width="150" height="250" fill="#120c08" />
          {[44, 104, 164].map((y, r) => (
            <g key={y}>
              {Array.from({ length: 13 }, (_, i) => (
                <rect key={i} x={8 + i * 10.5} y={y - 34 + ((i + r) % 4) * 3} width="8.5" height={34 - ((i + r) % 4) * 3} fill={BOOKS[(i * 3 + r * 5 + side) % BOOKS.length]} />
              ))}
              <rect x="0" y={y} width="150" height="7" fill="#2e1e12" />
            </g>
          ))}
          <rect x="146" y="0" width="8" height="250" fill="#24170e" />
          <rect x="0" y="0" width="150" height="250" fill="#0a0604" opacity="0.5" />
          <rect x="0" y="0" width="60" height="250" fill="#000" opacity="0.35" />
        </g>
      ))}

      {/* Flags behind the desk */}
      <Flag f={f} x={186} id="fa" delay="0s" colors={a} />
      <Flag f={f} x={452} id="fs" delay="-4s" />

      {/* Warm key light */}
      <ellipse cx="350" cy="120" rx="170" ry="120" fill={f('key')} />

      {/* The leader, hands folded */}
      <g className="addr-breathe">
        <g transform="translate(320 206) scale(1.38)">
          <path d="M-32 6 L-29 -36 Q-26 -50 -12 -52 L12 -52 Q26 -50 29 -36 L32 6 Z" fill={f('suit')} />
          <path d="M-8 -52 L0 -32 L8 -52 Z" fill="#e1e5eb" />
          <path d="M-2.4 -50 L2.4 -50 L3.4 -38 L0 -32 L-3.4 -38 Z" fill="#8c1d26" />
          <circle cx="-15" cy="-40" r="1.6" fill={accent} />
          <rect x="-5" y="-60" width="10" height="9" fill="#241b19" />
          <ellipse cy="-67" rx="10.5" ry="12.5" fill={f('head')} />
          <path d="M-10.8 -68 Q-11 -81 0 -81 Q11 -81 10.8 -68 Q5 -75 0 -74 Q-6 -75 -10.8 -68Z" fill="#0d0c0f" />
          <path d="M9.5 -74 Q11.5 -66 8 -58 M29 -36 L32 2" stroke={key} strokeWidth="1.5" fill="none" opacity="0.85" strokeLinecap="round" />
        </g>
      </g>

      {/* Desk with lamp, flag and papers */}
      <rect x="140" y="194" width="360" height="12" rx="2" fill="#5e3820" />
      <path d="M140 194 H500" stroke={key} strokeOpacity="0.55" />
      <rect x="150" y="206" width="340" height="110" fill={f('desk')} />
      <rect x="150" y="206" width="340" height="40" fill={key} opacity="0.06" />
      {[166, 270, 384].map((x) => (
        <rect key={x} x={x} y="220" width={x === 270 ? 100 : 90} height="80" rx="3" fill="none" stroke="#7a4e2c" strokeOpacity="0.45" strokeWidth="2" />
      ))}
      <path d="M272 184 Q290 176 304 190 L300 196 Q288 186 276 194 Z" fill="#2a2f3d" />
      <path d="M368 184 Q350 176 336 190 L340 196 Q352 186 364 194 Z" fill="#2a2f3d" />
      <ellipse cx="306" cy="192" rx="8" ry="5" fill="#4a3428" />
      <ellipse cx="334" cy="192" rx="8" ry="5" fill="#4a3428" />
      <path d="M296 196 L346 196 L350 192 L292 192 Z" fill="#eee7d8" opacity="0.85" />
      <rect x="178" y="150" width="3" height="44" fill="#c9a35e" />
      <path d="M160 152 L200 152 L192 136 L168 136 Z" fill="#1f5a3a" />
      <ellipse cx="180" cy="160" rx="38" ry="24" fill={f('lamp')} />
      <ellipse cx="180" cy="193" rx="14" ry="3" fill="#c9a35e" />
      <rect x="440" y="164" width="2" height="30" fill="#c9a35e" />
      <NationFlag colors={a} x={442} y={165} w={18} h={12} />
      <rect x="402" y="174" width="22" height="20" rx="1" fill="#c9a35e" />
      <rect x="405" y="177" width="16" height="14" fill={s1} />

      {/* Foreground: teleprompter glass and camera with tally light */}
      <path d="M18 70 L44 360" stroke="#cfe0ff" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M0 60 L18 70 L44 360 L0 360 Z" fill="#9fc4ff" opacity="0.05" />
      <g className="addr-glint">
        <path d="M0 40 L40 40 L80 360 L40 360 Z" fill={f('glass')} />
      </g>
      <circle cx="320" cy="258" r="17" fill="none" stroke="#c9a35e" strokeOpacity="0.55" strokeWidth="2" />
      <circle cx="320" cy="258" r="12" fill={accent} opacity="0.45" />
      <rect x="566" y="214" width="90" height="110" rx="12" fill="#07090e" />
      <path d="M572 214 H650" stroke={key} strokeOpacity="0.4" />
      <rect x="590" y="324" width="16" height="50" fill="#05060a" />
      <path d="M512 196 L588 186 L600 296 L524 304 Z" fill="#05070b" />
      <path d="M519 203 L582 195 L592 289 L530 296 Z" fill="#9fc4ff" opacity="0.07" />
      <g opacity="0.22" clipPath={f('prompt')}>
        <g className="addr-scroll">
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={534 + (i % 2) * 5} y={214 + i * 11} width={40 - (i % 3) * 8} height="2.5" rx="1.2" fill="#e8f0ff" />
          ))}
        </g>
      </g>
      <path d="M512 196 L588 186 L600 296 L524 304 Z" fill="none" stroke="#1d2330" strokeWidth="4" />
      <path d="M512 196 L588 186" stroke={key} strokeOpacity="0.45" strokeWidth="1.5" />
      <g opacity="0.25">
        <ellipse className="addr-tally" cx="610" cy="204" rx="20" ry="11" fill="#ff2a2a" />
      </g>
      <rect className="addr-tally" x="600" y="200" width="20" height="8" rx="3" fill="#ff2a2a" />
    </svg>
  );
}
