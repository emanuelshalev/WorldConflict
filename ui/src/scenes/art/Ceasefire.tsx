import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import NationFlag from './Flag';
import './public.css';

const LIGHT = {
  good: { glass: '#fff6dc', wall: '#cdbfa8', wall2: '#7c6c5a', shaft: '#fff0c8' },
  neutral: { glass: '#f4f8ff', wall: '#b9c2cc', wall2: '#5d6874', shaft: '#ffffff' },
  bad: { glass: '#c9d4e2', wall: '#8a94a2', wall2: '#3a424e', shaft: '#d8e2f0' },
} as const;

/** Seated delegates behind the table, backlit by the windows (negative x = home side). */
const SEATED = [-118, -82, -46, 46, 82, 118];

export default function Ceasefire({ a, b, mood }: SceneArtProps) {
  const uid = useSceneUid();
  const L = LIGHT[mood];
  const sil = '#1b1e25';
  const flag = (x: number, c: [string, string, string], key: string) => (
    <g key={key}>
      <line x1={x} x2={x} y1="202" y2="170" stroke="#c9ccd2" strokeWidth="1.2" />
      <g className="cf-flag">
        <NationFlag colors={c} x={x} y={170} w={20} h={13.5} />
      </g>
      <ellipse cx={x} cy="202" rx="4" ry="1.4" fill="#c9ccd2" />
    </g>
  );
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-ceasefire" aria-hidden>
      <defs>
        <linearGradient id={`cf-wall-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={L.wall} />
          <stop offset="1" stopColor={L.wall2} />
        </linearGradient>
        <linearGradient id={`cf-glass-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={L.glass} />
          <stop offset="1" stopColor={L.glass} stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id={`cf-shaft-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={L.shaft} stopOpacity="0.45" />
          <stop offset="1" stopColor={L.shaft} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`cf-bloom-${uid}`} cx="0.5" cy="0.35" r="0.5">
          <stop offset="0" stopColor={L.glass} stopOpacity="0.55" />
          <stop offset="1" stopColor={L.glass} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`cf-table-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a3a26" />
          <stop offset="1" stopColor="#2a1810" />
        </linearGradient>
        <linearGradient id={`cf-suitL-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0f1116" />
          <stop offset="1" stopColor="#252a34" />
        </linearGradient>
        <linearGradient id={`cf-suitR-${uid}`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#0f1116" />
          <stop offset="1" stopColor="#252a34" />
        </linearGradient>
        <linearGradient id={`cf-floor-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2e2a" />
          <stop offset="1" stopColor="#120e0e" />
        </linearGradient>
      </defs>

      <rect width="640" height="360" fill={`url(#cf-wall-${uid})`} />
      {/* Wall panelling and tall windows */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={i * 84 - 10} y="18" width="2" height="200" fill="#fff" opacity="0.12" />
      ))}
      <rect y="0" width="640" height="18" fill={L.wall2} opacity="0.6" />
      {[150, 278, 406].map((x) => (
        <g key={x}>
          <rect x={x - 6} y="26" width="96" height="164" fill={L.wall2} opacity="0.55" />
          <path d={`M${x} 190 V60 q42 -36 84 0 V190 Z`} fill={`url(#cf-glass-${uid})`} />
          <path d={`M${x + 42} 30 V190 M${x} 104 H${x + 84} M${x} 148 H${x + 84}`} stroke={L.wall2} strokeWidth="3" opacity="0.7" />
          <rect x={x - 10} y="188" width="104" height="6" fill={L.wall} />
        </g>
      ))}
      <rect width="640" height="360" fill={`url(#cf-bloom-${uid})`} className="cf-bloom" />

      {/* Floor */}
      <rect y="214" width="640" height="146" fill={`url(#cf-floor-${uid})`} />
      {/* Light shafts falling toward camera */}
      {[150, 278, 406].map((x, i) => (
        <polygon key={x} className="cf-shaft" points={`${x},60 ${x + 84},60 ${x + 150 - i * 30},330 ${x - 70 - i * 30},330`} fill={`url(#cf-shaft-${uid})`} style={{ animationDelay: `${i * 1.8}s` }} />
      ))}

      {/* Mediator and seated delegations, backlit */}
      <g>
        <circle cx="320" cy="150" r="9" fill={sil} />
        <path d="M303 186 V170 q17 -12 34 0 V186 Z" fill={sil} />
        <path d="M316 162 l4 8 l4 -8 Z" fill="#e8ecf2" opacity="0.8" />
      </g>
      {SEATED.map((dx, i) => (
        <g key={dx} className={i % 2 ? 'cf-nod' : undefined}>
          <circle cx={320 + dx} cy="160" r="7.5" fill={sil} />
          <path d={`M${320 + dx - 14} 192 V176 q14 -10 28 0 V192 Z`} fill={sil} />
          <path d={`M${320 + dx - 5} 155 a7.5 7.5 0 0 1 10 0`} fill="none" stroke={L.glass} strokeOpacity="0.8" strokeWidth="1.2" />
        </g>
      ))}

      {/* Oval table with documents, glasses and desk flags */}
      <ellipse cx="320" cy="214" rx="196" ry="38" fill="#1a0f0a" />
      <ellipse cx="320" cy="208" rx="196" ry="36" fill={`url(#cf-table-${uid})`} />
      <ellipse cx="320" cy="200" rx="150" ry="18" fill={L.glass} opacity="0.12" />
      {[230, 300, 360, 420].map((x, i) => (
        <path key={x} d={`M${x - 14} ${214 + (i % 2) * 6} l26 -3 l6 12 l-26 3 Z`} fill="#f4f1ea" opacity="0.92" />
      ))}
      <path d="M296 220 h46 v2 h-46 Z" fill="#1a1a1a" opacity="0.5" />
      {[262, 378].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="194" width="6" height="10" rx="1" fill="#cfe2f2" opacity="0.55" />
          <rect x={x - 3} y="198" width="6" height="6" fill="#9ec4e2" opacity="0.5" />
        </g>
      ))}
      {flag(236, a, 'a1')}
      {flag(384, b, 'b1')}
      <g>
        <line x1="320" x2="320" y1="198" y2="178" stroke="#c9ccd2" strokeWidth="1" />
        <rect className="cf-flag" x="320" y="178" width="12" height="8" fill="#fbfbf8" />
      </g>

      {/* Lead negotiators in the foreground, reaching across */}
      <g>
        <path d="M120 330 L132 196 q6 -36 52 -40 h16 q38 6 44 40 L252 330 Z" fill={`url(#cf-suitL-${uid})`} />
        <path d="M236 192 q-6 -30 -40 -36" fill="none" stroke={L.glass} strokeWidth="2.5" strokeOpacity="0.8" />
        <rect x="182" y="140" width="18" height="20" rx="5" fill="#15171d" />
        <ellipse cx="190" cy="128" rx="18" ry="21" fill="#0b0c10" />
        <ellipse cx="204" cy="134" rx="5.5" ry="11" fill="#1f222a" />
        <path d="M206 116 q6 10 3 26 q-2 6 -6 9" fill="none" stroke={L.glass} strokeWidth="2" strokeOpacity="0.85" strokeLinecap="round" />
        {/* Jointed arm: upper arm pivots at the shoulder, forearm at the elbow */}
        <g className="cf-armL">
          <path d="M226 180 L270 196" fill="none" stroke="#1d2129" strokeWidth="15" strokeLinecap="round" />
          <g className="cf-foreL">
            <path d="M270 196 L308 204" fill="none" stroke="#1d2129" strokeWidth="15" strokeLinecap="round" />
            <path d="M300 202 L306 203" stroke="#f0eee8" strokeWidth="14" strokeLinecap="round" />
            <ellipse cx="315" cy="205" rx="9" ry="6.5" fill="#2a2a30" />
            <path d="M312 200 q6 -2 10 2" fill="none" stroke={L.glass} strokeWidth="1.4" strokeOpacity="0.8" />
          </g>
        </g>
      </g>
      <g>
        <path d="M520 330 L508 196 q-6 -36 -52 -40 h-16 q-38 6 -44 40 L388 330 Z" fill={`url(#cf-suitR-${uid})`} />
        <path d="M404 192 q6 -30 40 -36" fill="none" stroke={L.glass} strokeWidth="2.5" strokeOpacity="0.8" />
        <rect x="440" y="140" width="18" height="20" rx="5" fill="#15171d" />
        <ellipse cx="450" cy="128" rx="18" ry="21" fill="#0b0c10" />
        <ellipse cx="436" cy="134" rx="5.5" ry="11" fill="#1f222a" />
        <path d="M434 116 q-6 10 -3 26 q2 6 6 9" fill="none" stroke={L.glass} strokeWidth="2" strokeOpacity="0.85" strokeLinecap="round" />
        <g className="cf-armR">
          <path d="M414 180 L370 196" fill="none" stroke="#1d2129" strokeWidth="15" strokeLinecap="round" />
          <g className="cf-foreR">
            <path d="M370 196 L332 204" fill="none" stroke="#1d2129" strokeWidth="15" strokeLinecap="round" />
            <path d="M340 202 L334 203" stroke="#f0eee8" strokeWidth="14" strokeLinecap="round" />
            <ellipse cx="325" cy="205" rx="9" ry="6.5" fill="#2a2a30" />
            <path d="M328 200 q-6 -2 -10 2" fill="none" stroke={L.glass} strokeWidth="1.4" strokeOpacity="0.8" />
          </g>
        </g>
      </g>
      <circle className="cf-spark" cx="320" cy="204" r="14" fill={L.glass} opacity="0.25" />

      {mood === 'bad' && <rect width="640" height="360" fill="#3a0a10" opacity="0.18" />}
      {mood === 'good' && <rect width="640" height="360" fill="#ffc070" opacity="0.07" />}
      <rect y="300" width="640" height="60" fill="#0c0909" opacity="0.5" />
    </svg>
  );
}
