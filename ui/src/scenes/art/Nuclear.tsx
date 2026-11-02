import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import './security.css';

// One-point perspective: screen = vanishing point + F * world / depth.
const VX = 320;
const VY = 150;
const F = 160;
const EYE = 0.6; // camera height above the floor
const P = (X: number, Y: number, z: number) => ({ x: VX + (F * X) / z, y: VY - (F * (Y - EYE)) / z });
const DEPTHS = [6, 5.4, 4.8, 4.2, 3.7, 3.2, 2.75, 2.3, 1.9, 1.55, 1.25, 1];
const ROWS = [-2.0, -1.25, 1.25, 2.0];
const TALL = 1.75;
const R = 0.12;

function Centrifuge({ X, z }: { X: number; z: number }) {
  const uid = useSceneUid();
  const base = P(X, 0, z);
  const top = P(X, TALL, z);
  const w = (F * R * 2) / z;
  const ry = w * 0.16;
  const fade = Math.min(1, 0.35 + 0.65 / z);
  return (
    <g opacity={fade}>
      <rect x={base.x - w / 2} y={base.y} width={w} height={(base.y - top.y) * 0.35} fill={`url(#nu-refl-${uid})`} opacity="0.35" />
      <rect x={base.x - w * 0.7} y={base.y - w * 0.5} width={w * 1.4} height={w * 0.5} rx={w * 0.08} fill="#2a3442" />
      <rect x={base.x - w / 2} y={top.y} width={w} height={base.y - top.y - w * 0.5} fill={`url(#nu-tube-${uid})`} />
      <rect x={base.x - w / 2} y={top.y + (base.y - top.y) * 0.62} width={w} height={w * 0.12} fill="#3a4a5c" />
      <rect className="nu-led" x={base.x - w * 0.12} y={top.y + (base.y - top.y) * 0.7} width={w * 0.24} height={w * 0.08} fill={`url(#nu-ledc-${uid})`} style={{ animationDelay: `${(z * 1.7) % 3}s` }} />
      <ellipse cx={top.x} cy={top.y} rx={w / 2} ry={ry} fill="#e8f0f8" />
      <rect x={top.x - w * 0.08} y={top.y - w * 0.9} width={w * 0.16} height={w * 0.9} fill="#8a98a8" />
    </g>
  );
}

function Tech({ X, z, clip = false }: { X: number; z: number; clip?: boolean }) {
  const uid = useSceneUid();
  const b = P(X, 0, z);
  const s = F / z / 100;
  return (
    <g transform={`translate(${b.x} ${b.y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="26" ry="5" fill="#000" opacity="0.35" />
      <path d="M-12 0 L-10 -44 L10 -44 L12 0 L3 0 L0 -26 L-3 0 Z" fill={`url(#nu-suit-${uid})`} />
      <path d="M-20 -46 C-20 -76 -14 -84 0 -84 C14 -84 20 -76 20 -46 Z" fill={`url(#nu-suit-${uid})`} />
      <circle cx="0" cy="-94" r="10" fill="#e4ebf2" />
      <path d="M-12 -96 C-12 -112 12 -112 12 -96 Z" fill="#f4d23a" />
      <rect x="-7" y="-95" width="14" height="5" rx="2" fill="#1c2836" opacity="0.8" />
      {clip && <rect x="12" y="-66" width="12" height="16" rx="1.5" fill="#cfd8e0" stroke="#5a6878" strokeWidth="1.5" />}
      <path d="M15 -76 C20 -70 20 -56 20 -46" stroke={`url(#nu-rim-${uid})`} strokeWidth="2" fill="none" />
    </g>
  );
}

export default function Nuclear({ mood }: SceneArtProps) {
  const uid = useSceneUid();
  const bad = mood === 'bad';
  const good = mood === 'good';
  const light = bad ? '#ff5a4a' : good ? '#ffd88a' : '#bfe4ff';
  const far = DEPTHS[0];
  const wallL = P(-2.6, 0, far);
  const wallT = P(2.6, 2.4, far);
  const sign = P(0, 1.55, 2.8);
  const ss = F / 2.8 / 100;
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-nuclear" aria-hidden>
      <defs>
        <linearGradient id={`nu-room-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070b12" />
          <stop offset="0.42" stopColor="#15202e" />
          <stop offset="0.45" stopColor="#1c2a3a" />
          <stop offset="1" stopColor="#05080d" />
        </linearGradient>
        <radialGradient id={`nu-end-${uid}`} gradientUnits="userSpaceOnUse" cx={VX} cy={VY} r="220">
          <stop offset="0" stopColor={light} stopOpacity="0.55" />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`nu-tube-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5d6b7c" />
          <stop offset="0.3" stopColor="#f2f6fa" />
          <stop offset="0.5" stopColor="#c4cfdb" />
          <stop offset="1" stopColor="#3a4656" />
        </linearGradient>
        <linearGradient id={`nu-refl-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4cfdb" />
          <stop offset="1" stopColor="#c4cfdb" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`nu-ledc-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={bad ? '#ff3b30' : '#3dffa0'} />
          <stop offset="1" stopColor={bad ? '#ff8a4a' : '#7dffc8'} />
        </linearGradient>
        <linearGradient id={`nu-suit-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f4f8fb" />
          <stop offset="1" stopColor="#8e9cab" />
        </linearGradient>
        <linearGradient id={`nu-rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </linearGradient>
        <pattern id={`nu-hazard-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#14110a" />
          <rect width="5" height="10" fill="#f2c230" />
        </pattern>
        <radialGradient id={`nu-beam-${uid}`} cx="0" cy="0.5" r="1">
          <stop offset="0" stopColor="#ff2a1a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ff2a1a" stopOpacity="0" />
        </radialGradient>
        <filter id={`nu-soft-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <rect width="640" height="360" fill={`url(#nu-room-${uid})`} />
      {/* end wall */}
      <rect x={wallL.x} y={wallT.y} width={wallT.x - wallL.x} height={wallL.y - wallT.y} fill={bad ? '#2a0e10' : '#1e2c3c'} />
      {bad ? (
        <g>
          <rect x={VX - 16} y={wallT.y + 4} width="32" height={wallL.y - wallT.y - 4} fill="#ff3b30" opacity="0.5" filter={`url(#nu-soft-${uid})`} />
          <rect x={VX - 14} y={wallT.y + 6} width="28" height={wallL.y - wallT.y - 6} fill="#120507" />
          <path d={`M${VX} ${wallT.y + 10} C${VX + 7} ${wallT.y + 18} ${VX + 7} ${wallT.y + 26} ${VX + 7} ${wallL.y} H${VX - 7} C${VX - 7} ${wallT.y + 26} ${VX - 7} ${wallT.y + 18} ${VX} ${wallT.y + 10} Z`} fill="#3a1418" stroke="#ff5a4a" strokeOpacity="0.6" strokeWidth="0.8" />
        </g>
      ) : (
        <rect x={VX - 22} y={VY - 14} width="44" height={wallL.y - VY + 14} fill={light} opacity="0.25" />
      )}
      <rect x={wallL.x} y={wallL.y - 5} width={wallT.x - wallL.x} height="5" fill={`url(#nu-hazard-${uid})`} />
      <rect width="640" height="360" fill={`url(#nu-end-${uid})`} />

      {/* ceiling light strips converging */}
      <g stroke={light} strokeLinecap="round">
        {[-0.7, 0, 0.7].map((X) => {
          const n = P(X, 2.6, 0.9);
          const f = P(X, 2.6, far);
          return (
            <g key={X}>
              <path d={`M${n.x} ${n.y} L${f.x} ${f.y}`} strokeWidth="14" strokeOpacity="0.18" filter={`url(#nu-soft-${uid})`} />
              <path d={`M${n.x} ${n.y} L${f.x} ${f.y}`} strokeWidth="4" strokeOpacity="0.7" strokeDasharray="30 14" />
            </g>
          );
        })}
      </g>

      {/* floor: aisle hazard lines */}
      {[-0.72, 0.62].map((X) => {
        const a1 = P(X, 0, 0.8);
        const a2 = P(X + 0.1, 0, 0.8);
        const b1 = P(X, 0, far);
        const b2 = P(X + 0.1, 0, far);
        return <path key={X} d={`M${a1.x} ${a1.y} L${a2.x} ${a2.y} L${b2.x} ${b2.y} L${b1.x} ${b1.y} Z`} fill={`url(#nu-hazard-${uid})`} opacity="0.85" />;
      })}

      {/* overhead header pipes along each row */}
      {ROWS.map((X) => {
        const n = P(X, TALL + 0.22, 0.95);
        const f = P(X, TALL + 0.22, far);
        return <path key={X} d={`M${n.x} ${n.y} L${f.x} ${f.y}`} stroke="#6a7a8c" strokeWidth={F * 0.05} strokeOpacity="0.8" />;
      })}

      {/* the cascade */}
      {DEPTHS.map((z) => ROWS.map((X) => <Centrifuge key={`${X}-${z}`} X={X} z={z} />))}

      {/* hanging radiation sign */}
      <g transform={`translate(${sign.x} ${sign.y}) scale(${ss})`}>
        <path d="M-30 -60 V-34 M30 -60 V-34" stroke="#56606c" strokeWidth="1.6" />
        <rect x="-34" y="-34" width="68" height="68" rx="6" fill="#f2c230" stroke="#14110a" strokeWidth="3" />
        <g fill="#14110a" className="nu-trefoil">
          <circle r="5" />
          {[60, 180, 300].map((r) => (
            <path key={r} transform={`rotate(${r})`} d="M-4.5 -7.8 L-14 -24.2 A28 28 0 0 1 14 -24.2 L4.5 -7.8 A9 9 0 0 0 -4.5 -7.8 Z" />
          ))}
        </g>
      </g>

      {/* technicians in white */}
      <Tech X={-0.5} z={3.4} />
      <Tech X={0.46} z={2.3} clip />

      {/* klaxon */}
      <circle cx={VX} cy={wallT.y - 6} r="4" fill={bad ? '#ff3b30' : '#6a7686'} className={bad ? 'nu-klaxon' : undefined} />
      {bad && (
        <>
          <g transform={`translate(${VX} ${wallT.y - 6})`}>
            <path className="nu-sweep" d="M0 0 L520 -120 L520 120 Z" fill={`url(#nu-beam-${uid})`} />
          </g>
          <rect className="nu-alarm" width="640" height="360" fill="#ff2a1a" opacity="0.12" />
        </>
      )}
      <rect x="0" y="300" width="640" height="60" fill="#04070b" opacity="0.4" filter={`url(#nu-soft-${uid})`} />
    </svg>
  );
}
