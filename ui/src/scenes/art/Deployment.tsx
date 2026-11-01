import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import './security.css';

// Vanishing point of the highway; vehicles sit on the centre line, scaled by depth.
const VX = 470;
const VY = 168;
const SLOPE = (242 - VY) / VX;
const at = (x: number) => {
  const y = VY + (VX - x) * SLOPE;
  return { y, s: (VX - x) / 270 };
};

function Tank({ flag }: { flag?: [string, string, string] }) {
  const uid = useSceneUid();
  return (
    <g>
      <path d="M-104 -24 L-90 -46 L92 -46 L104 -24 Z" fill={`url(#dp-hull-${uid})`} />
      <path d="M-90 -46 L92 -46" stroke={`url(#dp-rim-${uid})`} strokeWidth="2.2" />
      <rect x="-98" y="-27" width="196" height="27" rx="13" fill="#15110d" />
      {[-72, -48, -24, 0, 24, 48, 72].map((wx) => (
        <circle key={wx} cx={wx} cy="-13" r="8.5" fill="#2a231b" stroke="#0c0a08" strokeWidth="2" />
      ))}
      <path d="M-100 -30 L98 -30 L94 -16 L-96 -16 Z" fill={`url(#dp-hull-${uid})`} />
      <path d="M-100 -30 L98 -30" stroke="#0e0b08" strokeWidth="1.5" />
      <path d="M-52 -46 L-40 -68 L34 -68 L50 -46 Z" fill={`url(#dp-hull-${uid})`} />
      <path d="M-40 -68 L34 -68" stroke={`url(#dp-rim-${uid})`} strokeWidth="2" />
      <rect x="-158" y="-61" width="120" height="5.5" rx="2" fill="#1d1812" />
      <rect x="-166" y="-63" width="14" height="9" rx="2" fill="#1d1812" />
      <rect x="10" y="-76" width="18" height="8" rx="3" fill="#1d1812" />
      {flag && (
        <g>
          <path d="M26 -76 L28 -122" stroke="#3a3128" strokeWidth="1.6" />
          <g className="dp-flag">
            <rect x="28" y="-122" width="32" height="7" fill={flag[0]} />
            <rect x="28" y="-115" width="32" height="7" fill={flag[1]} />
            <rect x="28" y="-108" width="32" height="7" fill={flag[2]} />
          </g>
        </g>
      )}
    </g>
  );
}

function Truck() {
  const uid = useSceneUid();
  return (
    <g>
      <rect x="-90" y="-62" width="44" height="40" rx="5" fill={`url(#dp-hull-${uid})`} />
      <rect x="-84" y="-56" width="20" height="14" rx="2" fill="#f2b56b" opacity="0.35" />
      <path d="M-42 -74 C-42 -82 92 -82 92 -74 L92 -22 L-42 -22 Z" fill={`url(#dp-hull-${uid})`} />
      <path d="M-42 -78 C0 -84 60 -84 92 -78" stroke={`url(#dp-rim-${uid})`} strokeWidth="2.2" fill="none" />
      <rect x="-92" y="-24" width="186" height="8" fill="#15110d" />
      {[-70, -10, 20, 70].map((wx) => (
        <circle key={wx} cx={wx} cy="-10" r="11" fill="#15110d" stroke="#2a231b" strokeWidth="3" />
      ))}
    </g>
  );
}

const COLUMN: Array<{ x: number; kind: 'tank' | 'truck' }> = [
  { x: 448, kind: 'truck' }, { x: 436, kind: 'tank' }, { x: 418, kind: 'truck' },
  { x: 392, kind: 'tank' }, { x: 350, kind: 'truck' },
];

const DUST: Array<[number, number, number, number]> = [
  [320, 196, 110, 22], [420, 182, 70, 12], [200, 214, 120, 18], [462, 174, 44, 7], [372, 188, 80, 14],
];

export default function Deployment({ a, mood }: SceneArtProps) {
  const uid = useSceneUid();
  const bad = mood === 'bad';
  const good = mood === 'good';
  const glow = bad ? '#ff6a3d' : good ? '#ffd27a' : '#ffb466';
  const high = bad ? '#3a1622' : good ? '#2c3a66' : '#1d2547';
  const lead = at(196);
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-deployment" aria-hidden>
      <defs>
        <linearGradient id={`dp-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={high} />
          <stop offset="0.5" stopColor={bad ? '#7a2f2c' : '#6b4766'} />
          <stop offset="0.82" stopColor={bad ? '#d0552e' : '#e48b56'} />
          <stop offset="1" stopColor={glow} />
        </linearGradient>
        <radialGradient id={`dp-sun-${uid}`} gradientUnits="userSpaceOnUse" cx={VX} cy={VY} r="300">
          <stop offset="0" stopColor="#fff2cc" stopOpacity="0.95" />
          <stop offset="0.12" stopColor={glow} stopOpacity="0.7" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`dp-ground-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bad ? '#7a3a26' : '#9a6440'} />
          <stop offset="0.3" stopColor="#5a3826" />
          <stop offset="1" stopColor="#140d0a" />
        </linearGradient>
        <linearGradient id={`dp-road-${uid}`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#8a6a58" />
          <stop offset="0.35" stopColor="#3a2e2a" />
          <stop offset="1" stopColor="#141010" />
        </linearGradient>
        <linearGradient id={`dp-hull-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4030" />
          <stop offset="1" stopColor="#1f1a13" />
        </linearGradient>
        <linearGradient id={`dp-rim-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={glow} stopOpacity="0.2" />
          <stop offset="1" stopColor="#ffe2b0" stopOpacity="0.95" />
        </linearGradient>
        <filter id={`dp-soft-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id={`dp-haze-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      <rect width="640" height="360" fill={`url(#dp-sky-${uid})`} />
      <rect width="640" height="360" fill={`url(#dp-sun-${uid})`} />
      <circle cx={VX} cy={VY - 4} r="13" fill="#fff4d6" opacity="0.9" />
      {/* thin dawn clouds */}
      <g fill={glow} opacity="0.35">
        <ellipse cx="160" cy="92" rx="120" ry="3" />
        <ellipse cx="520" cy="120" rx="110" ry="2.5" />
        <ellipse cx="300" cy="134" rx="90" ry="2" />
      </g>
      {bad && (
        <g className="dp-smoke" fill="#2a1414" opacity="0.6" filter={`url(#dp-soft-${uid})`}>
          <ellipse cx="560" cy="130" rx="22" ry="44" />
          <ellipse cx="590" cy="96" rx="34" ry="34" />
        </g>
      )}
      {/* distant mesas */}
      <path d="M0 160 L40 150 L70 152 L84 140 L130 140 L142 154 L220 156 L250 146 L300 148 L320 160 L380 162 L420 154 L520 156 L548 142 L600 142 L612 156 L640 158 L640 172 L0 172 Z" fill={bad ? '#5a2a30' : '#5b4566'} opacity="0.85" />
      <path d="M0 166 L640 166 L640 174 L0 174 Z" fill={glow} opacity="0.25" filter={`url(#dp-haze-${uid})`} />

      {/* ground and highway */}
      <rect x="0" y={VY} width="640" height={360 - VY} fill={`url(#dp-ground-${uid})`} />
      <path d={`M${VX} ${VY} L0 222 L0 360 L60 360 Z`} fill={`url(#dp-road-${uid})`} />
      <path d={`M${VX} ${VY} L0 222 M${VX} ${VY} L60 360`} stroke="#d8b48a" strokeOpacity="0.45" strokeWidth="1.2" />
      <path className="dp-lane" d={`M${VX} ${VY} L0 276`} stroke="#f2d7a8" strokeOpacity="0.6" strokeWidth="2" strokeDasharray="14 12" />
      {/* scrub and rocks on the plain, long shadows toward camera */}
      <g fill="#1e130e">
        {[[540, 196, 10], [600, 206, 14], [500, 186, 6], [588, 246, 18], [86, 214, 8], [470, 212, 10], [620, 292, 28], [540, 226, 9]].map(([x, y, r]) => (
          <g key={`${x}-${y}`}>
            <ellipse cx={x - r * 0.4} cy={y - r * 0.15} rx={r * 0.55} ry={r * 0.22} />
            <ellipse cx={x + r * 0.3} cy={y - r * 0.25} rx={r * 0.6} ry={r * 0.3} />
            <ellipse cx={x + r * 0.5} cy={y - r * 0.1} rx={r * 0.7} ry={r * 0.18} />
            <path d={`M${x} ${y - r * 0.5} Q${x + r * 0.6} ${y - r * 0.62} ${x + r * 0.9} ${y - r * 0.3}`} stroke={glow} strokeOpacity="0.4" strokeWidth="1" fill="none" />
          </g>
        ))}
      </g>
      <path d={`M${lead.s * -100 + 196} ${lead.y + 10} L${lead.s * 100 + 196} ${lead.y - 22} L${lead.s * 60 + 150} ${lead.y + 40} L${lead.s * -110 + 150} ${lead.y + 48} Z`} fill="#0c0806" opacity="0.5" filter={`url(#dp-haze-${uid})`} />
      {/* dust kicked up behind the column */}
      <g className="dp-dust" filter={`url(#dp-soft-${uid})`}>
        {DUST.map(([x, y, rx, ry], i) => (
          <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill={glow} opacity={0.32} />
        ))}
      </g>

      {/* the column, receding to the vanishing point */}
      {COLUMN.map(({ x, kind }) => {
        const { y, s } = at(x);
        return (
          <g key={x} transform={`translate(${x} ${y}) skewY(-8.8) scale(${s})`} filter={s < 0.3 ? `url(#dp-haze-${uid})` : undefined}>
            {kind === 'tank' ? <Tank /> : <Truck />}
          </g>
        );
      })}
      <g className="dp-dust2" filter={`url(#dp-soft-${uid})`}>
        <ellipse cx="320" cy="200" rx="64" ry="18" fill={glow} opacity="0.4" />
        <ellipse cx="370" cy="190" rx="40" ry="11" fill="#e6b88a" opacity="0.35" />
      </g>
      <g transform={`translate(196 ${lead.y}) skewY(-8.8) scale(${lead.s})`}>
        <Tank flag={a} />
      </g>

      {/* helicopters */}
      {[
        [92, 92, 0.85, 0],
        [336, 76, 0.5, 1.4],
      ].map(([x, y, s, d]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <g className="dp-heli" style={{ animationDelay: `${d}s` }}>
            <ellipse cx="0" cy="0" rx="18" ry="8" fill="#1c1418" />
            <path d="M14 -2 L48 -4 L52 -12 L56 -12 L54 2 L14 4 Z" fill="#1c1418" />
            <path d="M-12 8 H14 M-8 8 V5 M8 8 V5" stroke="#1c1418" strokeWidth="1.6" />
            <ellipse className="dp-rotor" cx="2" cy="-10" rx="34" ry="1.6" fill="#1c1418" opacity="0.65" />
            <rect x="-1" y="-10" width="4" height="4" fill="#1c1418" />
            <circle cx="-10" cy="-1" r="3" fill={glow} opacity="0.45" />
          </g>
        </g>
      ))}
    </svg>
  );
}
