import { useId } from 'react';
import type { SceneArtProps } from './types';
import './civic.css';

const KEY = { good: '#ffcc78', bad: '#ff8a66', neutral: '#ffe0b0' };
const WIN = { good: '#ffd9a0', bad: '#9a3a3a', neutral: '#b8d4ff' };

/** Officials standing behind: x, scale, delay. */
const STAFF: Array<[number, number, number]> = [
  [112, 0.95, 0], [286, 0.92, -1.5], [354, 0.92, -3], [528, 0.95, -4.4], [584, 0.88, -2.2], [58, 0.88, -3.7],
];
/** Photographers in the foreground: x, y, tilt. */
const SNAPS: Array<[number, number, number]> = [
  [40, 300, -6], [150, 308, 5], [262, 314, -3], [380, 312, 4], [494, 306, -5], [604, 300, 6],
];
const FLASHES: Array<[number, number, number, number]> = [
  [150, 290, 0, 3.9], [494, 288, -1.7, 4.6], [262, 296, -2.9, 3.3], [604, 282, -0.9, 5.1], [40, 284, -3.6, 4.2],
];

function Flag({ f, x, id, delay }: { f: (n: string) => string; x: number; id: string; delay: number }) {
  const d = 'M0 0 Q18 4 36 0 L32 92 Q16 100 0 92 Z';
  return (
    <g transform={`translate(${x} 44)`}>
      <rect x="-1.5" y="-6" width="3" height="160" fill="#b28f55" />
      <circle cy="-8" r="4" fill="#e3bf77" />
      <g className="sign-flag" style={{ animationDelay: `${delay}s` }}>
        <path d={d} fill={f(id)} />
        <path d={d} fill={f('fold')} />
      </g>
    </g>
  );
}

function Signer({ f, x, rim, tie, delay, arms }: { f: (n: string) => string; x: number; rim: string; tie: string; delay: number; arms: boolean }) {
  if (!arms) {
    return (
      <g transform={`translate(${x} 214) scale(1.3)`}>
        <path d="M-32 6 L-29 -36 Q-26 -50 -12 -52 L12 -52 Q26 -50 29 -36 L32 6 Z" fill={f('suit')} />
        <path d="M-8 -52 L0 -34 L8 -52 Z" fill="#e1e5eb" />
        <path d="M-2.4 -50 L2.4 -50 L3.2 -38 L0 -34 L-3.2 -38 Z" fill={tie} />
        <ellipse cy="-62" rx="10.5" ry="12" fill={f('head')} />
        <path d="M-10.8 -63 Q-11 -76 0 -76 Q11 -76 10.8 -63 Q6 -68 0 -68 Q-7 -68 -10.8 -63Z" fill="#0d0c0f" />
        <path d="M9.5 -70 Q11.5 -62 8 -54 M29 -36 L32 2" stroke={rim} strokeWidth="1.5" fill="none" opacity="0.85" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <path d={`M${x - 34} 170 Q${x - 50} 200 ${x - 30} 222`} stroke="#1a2030" strokeWidth="16" fill="none" strokeLinecap="round" />
      <ellipse cx={x - 24} cy="224" rx="8" ry="5.5" fill="#4a3428" />
      <g className="sign-pen" style={{ animationDelay: `${delay}s` }}>
        <path d={`M${x + 34} 170 Q${x + 48} 200 ${x + 20} 222`} stroke="#232b3c" strokeWidth="16" fill="none" strokeLinecap="round" />
        <ellipse cx={x + 16} cy="224" rx="8" ry="5.5" fill="#4a3428" />
        <path d={`M${x + 12} 228 L${x + 30} 206`} stroke="#0e0e12" strokeWidth="3" strokeLinecap="round" />
        <path d={`M${x + 27} 210 L${x + 30} 206`} stroke="#d8b46a" strokeWidth="3" strokeLinecap="round" />
      </g>
    </g>
  );
}

export default function Signing({ a, b, mood }: SceneArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const u = (n: string) => `sign-${n}-${uid}`;
  const f = (n: string) => `url(#${u(n)})`;
  const key = KEY[mood];
  const win = WIN[mood];
  const tieA = a[2] === '#ffffff' ? a[0] : a[2];
  const tieB = b[2] === '#ffffff' ? b[0] : b[2];
  const stripes = (id: string, c: [string, string, string]) => (
    <linearGradient id={u(id)} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.333" stopColor={c[0]} />
      <stop offset="0.333" stopColor={c[1]} />
      <stop offset="0.666" stopColor={c[1]} />
      <stop offset="0.666" stopColor={c[2]} />
    </linearGradient>
  );
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-signing" aria-hidden>
      <defs>
        <linearGradient id={u('wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141820" />
          <stop offset="1" stopColor="#262a33" />
        </linearGradient>
        <linearGradient id={u('pilaster')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1a1d24" />
          <stop offset="0.5" stopColor="#3a3c44" />
          <stop offset="1" stopColor="#17191f" />
        </linearGradient>
        <linearGradient id={u('win')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={win} stopOpacity="0.9" />
          <stop offset="1" stopColor={win} stopOpacity="0.25" />
        </linearGradient>
        <radialGradient id={u('glow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={key} stopOpacity="0.5" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={u('cloth')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#163a30" />
          <stop offset="1" stopColor="#06120e" />
        </linearGradient>
        <linearGradient id={u('suit')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0d1119" />
          <stop offset="0.6" stopColor="#232b3c" />
          <stop offset="1" stopColor="#343f58" />
        </linearGradient>
        <linearGradient id={u('staff')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c2230" />
          <stop offset="1" stopColor="#0b0d13" />
        </linearGradient>
        <radialGradient id={u('head')} cx="0.6" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#6e4f3e" />
          <stop offset="1" stopColor="#231a17" />
        </radialGradient>
        {stripes('fa', a)}
        {stripes('fb', b)}
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
      </defs>

      {/* Grand hall: arched windows, pilasters, chandelier glow */}
      <rect width="640" height="360" fill={f('wall')} />
      {[96, 290, 484].map((x) => (
        <g key={x}>
          <path d={`M${x} 196 V70 Q${x} 26 ${x + 30} 26 Q${x + 60} 26 ${x + 60} 70 V196 Z`} fill={f('win')} />
          <path d={`M${x} 196 V70 Q${x} 26 ${x + 30} 26 Q${x + 60} 26 ${x + 60} 70 V196 Z M${x + 30} 26 V196 M${x} 100 H${x + 60} M${x} 150 H${x + 60}`} stroke="#1b1e25" strokeWidth="4" fill="none" />
        </g>
      ))}
      {[60, 172, 254, 366, 448, 560].map((x) => (
        <rect key={x} x={x} y="10" width="26" height="196" fill={f('pilaster')} />
      ))}
      <rect y="6" width="640" height="10" fill="#3a3c44" />
      <rect y="16" width="640" height="2" fill="#c9a35e" opacity="0.6" />
      <ellipse className="sign-glow" cx="320" cy="40" rx="220" ry="90" fill={f('glow')} />
      <rect y="196" width="640" height="164" fill="#0d0f14" />

      <Flag f={f} x={186} id="fa" delay={0} />
      <Flag f={f} x={236} id="fa" delay={-2} />
      <Flag f={f} x={404} id="fb" delay={-3.5} />
      <Flag f={f} x={454} id="fb" delay={-1} />

      {STAFF.map(([x, s, d]) => (
        <g key={x} transform={`translate(${x} 214) scale(${s})`} opacity="0.85">
          <g className="sign-bob" style={{ animationDelay: `${d}s` }}>
            <path d="M-27 10 L-25 -88 Q-23 -104 -11 -106 L11 -106 Q23 -104 25 -88 L27 10 Z" fill={f('staff')} />
            <path d="M-7 -106 L0 -90 L7 -106 Z" fill="#9aa3b1" opacity="0.55" />
            <ellipse cy="-119" rx="10" ry="12" fill="#2a201c" />
            <path d="M-10.5 -120 Q-10 -133 0 -133 Q10 -133 10.5 -120 Q5 -126 0 -125 Q-6 -126 -10.5 -120Z" fill="#0d0c0f" />
            <path d={x < 320 ? 'M9 -127 Q11 -119 8 -111' : 'M-9 -127 Q-11 -119 -8 -111'} stroke={key} strokeOpacity="0.45" strokeWidth="1.4" fill="none" />
          </g>
        </g>
      ))}

      <Signer f={f} x={222} rim={key} tie={tieA} delay={0} arms={false} />
      <Signer f={f} x={418} rim={key} tie={tieB} delay={-1.4} arms={false} />

      {/* Long table with baize cloth, folders and desk flags */}
      <path d="M84 192 L556 192 L600 238 L40 238 Z" fill="#4a2c18" />
      <path d="M84 192 H556" stroke={key} strokeOpacity="0.55" />
      <rect x="40" y="238" width="560" height="70" fill={f('cloth')} />
      <rect x="40" y="238" width="560" height="3" fill="#c9a35e" opacity="0.6" />
      <ellipse cx="320" cy="214" rx="250" ry="18" fill={key} opacity="0.14" />
      {[222, 418].map((x) => (
        <g key={x}>
          <path d={`M${x - 34} 202 L${x + 34} 202 L${x + 42} 232 L${x - 42} 232 Z`} fill="#4a1a20" />
          <path d={`M${x - 30} 205 L${x + 30} 205 L${x + 37} 229 L${x - 37} 229 Z`} fill="#efe9dc" />
          <path d={`M${x} 205 V229`} stroke="#2a0c0f" strokeWidth="2" />
          {[211, 216, 221].map((y) => (
            <path key={y} d={`M${x - 26} ${y} H${x - 6}`} stroke="#8a8478" strokeWidth="1.4" />
          ))}
          <path d={`M${x + 4} 222 Q${x + 9} 214 ${x + 13} 222 T${x + 24} 220`} stroke="#13204a" strokeWidth="1.4" fill="none" />
        </g>
      ))}
      <Signer f={f} x={222} rim={key} tie={tieA} delay={0} arms />
      <Signer f={f} x={418} rim={key} tie={tieB} delay={-1.4} arms />
      <rect x="304" y="198" width="32" height="8" rx="2" fill="#2a1a10" />
      <rect x="309" y="164" width="1.5" height="34" fill="#c9a35e" />
      <rect x="329" y="164" width="1.5" height="34" fill="#c9a35e" />
      <rect x="296" y="165" width="13" height="10" fill={f('fa')} />
      <rect x="331" y="165" width="13" height="10" fill={f('fb')} />

      {/* Photographers */}
      {SNAPS.map(([x, y, t]) => (
        <g key={x} transform={`rotate(${t} ${x} ${y})`}>
          <path d={`M${x - 46} 380 Q${x - 44} ${y + 26} ${x} ${y + 24} Q${x + 44} ${y + 26} ${x + 46} 380 Z`} fill="#07080c" />
          <circle cx={x} cy={y + 8} r="18" fill="#0f1219" />
          <path d={`M${x - 14} ${y - 4} Q${x - 20} ${y + 8} ${x - 14} ${y + 20}`} stroke={key} strokeOpacity="0.3" strokeWidth="1.4" fill="none" />
          <rect x={x - 20} y={y - 18} width="40" height="26" rx="5" fill="#090b10" stroke="#1c212c" />
          <rect x={x - 9} y={y - 27} width="18" height="10" rx="2" fill="#0d1017" stroke="#1c212c" />
          <circle cx={x} cy={y - 5} r="9" fill="#05060a" stroke="#262c3a" strokeWidth="2" />
          <circle cx={x - 3} cy={y - 8} r="2.6" fill="#6f87b8" opacity="0.6" />
          <path d={`M${x - 20} ${y - 18} H${x + 20}`} stroke={key} strokeOpacity="0.35" />
        </g>
      ))}
      {FLASHES.map(([x, y, d, dur]) => (
        <g key={x} className="sign-flash" style={{ animationDelay: `${d}s`, animationDuration: `${dur}s` }}>
          <circle cx={x} cy={y} r="30" fill={f('burst')} />
          <path d={`M${x} ${y - 22} L${x + 3} ${y - 3} L${x + 22} ${y} L${x + 3} ${y + 3} L${x} ${y + 22} L${x - 3} ${y + 3} L${x - 22} ${y} L${x - 3} ${y - 3} Z`} fill="#fff" />
        </g>
      ))}
    </svg>
  );
}
