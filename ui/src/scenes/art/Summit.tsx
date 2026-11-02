import { useId } from 'react';
import type { SceneArtProps } from './types';
import NationFlag from './Flag';
import './civic.css';

const KEY = { good: '#ffcd7a', bad: '#ff8a66', neutral: '#ffe4ba' };
const WALL = { good: ['#1a1830', '#3a2e3e'], bad: ['#1a0c12', '#3a1a20'], neutral: ['#0c1428', '#1c2c4c'] };

const FLAG_X = [64, 136, 208, 280, 352, 424, 496, 568];
/** Press pen: x, y, tilt. */
const SNAPS: Array<[number, number, number]> = [
  [36, 318, -7], [128, 326, 5], [224, 332, -4], [418, 330, 4], [512, 324, -5], [604, 316, 7],
];
const FLASHES: Array<[number, number, number, number]> = [
  [128, 306, 0, 3.3], [512, 304, -1.2, 4.1], [224, 312, -2.4, 3.7], [604, 296, -0.6, 4.7], [36, 298, -3.1, 5.3], [418, 310, -1.9, 2.9],
];

/** Standing leader in 3/4 view facing right, hip centre at 0,0. */
function Leader({ f, x, flip, rim, tie }: { f: (n: string) => string; x: number; flip: boolean; rim: string; tie: string }) {
  return (
    <g transform={`translate(${x} 178) scale(${flip ? -1.2 : 1.2} 1.05)`}>
      <g>
        <path d="M-20 -80 Q-30 -40 -24 -4" stroke="#121722" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M-18 2 L-3 2 L-6 84 L-18 84 Z" fill="#141924" />
        <path d="M2 2 L18 2 L16 84 L4 84 Z" fill="#1b2130" />
        <rect x="-23" y="82" width="19" height="6" rx="3" fill="#060709" />
        <rect x="3" y="82" width="22" height="6" rx="3" fill="#060709" />
        <path d="M-24 8 L-22 -74 Q-20 -88 -6 -90 L10 -90 Q22 -88 24 -74 L26 8 Z" fill={f('suit')} />
        <path d="M2 -90 L9 -68 L15 -89 Z" fill="#e1e5eb" />
        <path d="M6.5 -87 L10.5 -87 L11.5 -74 L8.8 -68 L6.2 -74 Z" fill={tie} />
        <path d="M24 -74 L26 6" stroke={rim} strokeWidth="1.6" opacity="0.8" />
        {/* Only the head nods (pivot at the neck), so the handshake arms stay on the shoulders */}
        <g className="summit-bob" style={{ animationDelay: flip ? '-2.5s' : '0s' }}>
          <rect x="-1" y="-99" width="10" height="10" fill="#241b19" />
          <ellipse cx="4" cy="-107" rx="10.5" ry="12.5" fill={f('head')} />
          <path d="M-6.8 -108 Q-7 -121 4 -121 Q15 -121 14.8 -110 Q9 -114 3 -113 Q-1 -110 -6.8 -108Z" fill="#0d0c0f" />
          <path d="M13.5 -114 Q15.5 -106 12 -98" stroke={rim} strokeWidth="1.6" fill="none" opacity="0.9" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}

export default function Summit({ a, b, mood }: SceneArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const u = (n: string) => `summit-${n}-${uid}`;
  const f = (n: string) => `url(#${u(n)})`;
  const key = KEY[mood];
  const [w0, w1] = WALL[mood];
  const tieA = a[2] === '#ffffff' ? a[0] : a[2];
  const tieB = b[2] === '#ffffff' ? b[0] : b[2];
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-summit" aria-hidden>
      <defs>
        <linearGradient id={u('wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={w0} />
          <stop offset="1" stopColor={w1} />
        </linearGradient>
        <radialGradient id={u('spot')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={key} stopOpacity="0.55" />
          <stop offset="0.6" stopColor={key} stopOpacity="0.15" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={u('beam')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={key} stopOpacity="0.3" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={u('carpet')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a1018" />
          <stop offset="1" stopColor="#8a1a24" />
        </linearGradient>
        <linearGradient id={u('suit')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0d1119" />
          <stop offset="0.6" stopColor="#232b3c" />
          <stop offset="1" stopColor="#36425c" />
        </linearGradient>
        <radialGradient id={u('head')} cx="0.65" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#6e4f3e" />
          <stop offset="1" stopColor="#231a17" />
        </radialGradient>
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

      {/* Summit backdrop and the line of flags */}
      <rect width="640" height="360" fill={f('wall')} />
      <rect y="18" width="640" height="14" fill="#000" opacity="0.3" />
      <rect y="32" width="640" height="2" fill="#c9a35e" opacity="0.55" />
      <ellipse className="summit-glow" cx="320" cy="140" rx="260" ry="150" fill={f('spot')} />
      {FLAG_X.map((x, i) => {
        const d = 'M0 0 Q16 4 32 0 L29 104 Q14 112 0 104 Z';
        return (
          <g key={x} transform={`translate(${x} 46)`}>
            <rect x="-1.5" y="-6" width="3" height="182" fill="#b28f55" />
            <circle cy="-8" r="4" fill="#e3bf77" />
            <g className="summit-flag" style={{ animationDelay: `${-i * 0.7}s` }}>
              <NationFlag colors={i % 2 ? b : a} x={0} y={0} w={32} h={112} d={d} />
              <path d={d} fill={f('fold')} />
            </g>
          </g>
        );
      })}
      <path d="M180 -10 L250 -10 L330 280 L120 280 Z" fill={f('beam')} />
      <path d="M390 -10 L460 -10 L520 280 L310 280 Z" fill={f('beam')} />

      {/* Stage floor and red carpet */}
      <rect y="222" width="640" height="138" fill="#0b0d14" />
      <rect y="222" width="640" height="2" fill={key} opacity="0.3" />
      <path d="M262 222 L378 222 L470 360 L170 360 Z" fill={f('carpet')} />
      <path d="M262 222 L170 360 M378 222 L470 360" stroke="#c9a35e" strokeOpacity="0.5" strokeWidth="1.5" />
      <ellipse cx="320" cy="270" rx="110" ry="11" fill="#000" opacity="0.35" />

      <Leader f={f} x={268} flip={false} rim={key} tie={tieA} />
      <Leader f={f} x={372} flip rim={key} tie={tieB} />

      {/* The handshake */}
      {/* Jointed arms: shoulder and elbow pivots, so the clasped hands pump without detaching */}
      <g className="summit-armL">
        <path d="M289 95 Q294 120 298 132" stroke="#232b3c" strokeWidth="11" fill="none" strokeLinecap="round" />
        <g className="summit-foreL">
          <path d="M298 132 L316 128" stroke="#232b3c" strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M309 129 L314 125" stroke="#e6e9ee" strokeWidth="6" strokeLinecap="round" />
        </g>
      </g>
      <g className="summit-armR">
        <path d="M351 95 Q346 120 342 132" stroke="#1b2130" strokeWidth="11" fill="none" strokeLinecap="round" />
        <g className="summit-foreR">
          <path d="M342 132 L324 128" stroke="#1b2130" strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M331 129 L326 125" stroke="#e6e9ee" strokeWidth="6" strokeLinecap="round" />
        </g>
      </g>
      <g className="summit-shake">
        <ellipse cx="320" cy="128" rx="9" ry="6.5" fill="#4a3428" />
        <path d="M313 124 Q320 120 327 124" stroke={key} strokeWidth="1.4" fill="none" opacity="0.9" />
      </g>

      {/* Press pen: rope line and photographers */}
      {[40, 200, 440, 600].map((x) => (
        <g key={x}>
          <rect x={x - 2.5} y="270" width="5" height="40" fill="#c9a35e" />
          <circle cx={x} cy="268" r="4.5" fill="#e3bf77" />
        </g>
      ))}
      <path d="M40 272 Q120 296 200 272 M440 272 Q520 296 600 272 M200 272 Q320 300 440 272" stroke="#7a1420" strokeWidth="4" fill="none" />
      {SNAPS.map(([x, y, t]) => (
        <g key={x} transform={`rotate(${t} ${x} ${y})`}>
          <path d={`M${x - 46} 380 Q${x - 44} ${y + 26} ${x} ${y + 24} Q${x + 44} ${y + 26} ${x + 46} 380 Z`} fill="#06070a" />
          <circle cx={x} cy={y + 8} r="18" fill="#0d1017" />
          <rect x={x - 20} y={y - 18} width="40" height="26" rx="5" fill="#090b10" stroke="#1c212c" />
          <rect x={x - 9} y={y - 27} width="18" height="10" rx="2" fill="#0d1017" stroke="#1c212c" />
          <circle cx={x} cy={y - 5} r="9" fill="#05060a" stroke="#262c3a" strokeWidth="2" />
          <circle cx={x - 3} cy={y - 8} r="2.6" fill="#6f87b8" opacity="0.6" />
          <path d={`M${x - 20} ${y - 18} H${x + 20}`} stroke={key} strokeOpacity="0.35" />
        </g>
      ))}
      {FLASHES.map(([x, y, d, dur]) => (
        <g key={x} className="summit-flash" style={{ animationDelay: `${d}s`, animationDuration: `${dur}s` }}>
          <circle cx={x} cy={y} r="30" fill={f('burst')} />
          <path d={`M${x} ${y - 22} L${x + 3} ${y - 3} L${x + 22} ${y} L${x + 3} ${y + 3} L${x} ${y + 22} L${x - 3} ${y + 3} L${x - 22} ${y} L${x - 3} ${y - 3} Z`} fill="#fff" />
        </g>
      ))}
    </svg>
  );
}
