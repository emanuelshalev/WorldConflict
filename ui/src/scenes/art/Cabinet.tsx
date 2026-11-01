import type { SceneArtProps } from './types';
import './civic.css';

const KEY = { good: '#ffc66e', bad: '#ff7a52', neutral: '#ffd9a1' };
const SCREEN = { good: '#3fd6a0', bad: '#ff4a3d', neutral: '#5aa8ff' };

/** Seated minister busts: x, y (seat line), scale, side (-1 left of table, 1 right), bob delay. */
const SEATS: Array<[number, number, number, number, number]> = [
  [208, 206, 0.94, -1, 0],
  [462, 206, 0.94, 1, -2.5],
  [156, 262, 1.32, -1, -4],
  [514, 262, 1.32, 1, -1.3],
];

/** Clean geometric bust: base centre at 0,0; rim light on the side facing the table. */
function Bust({ x, y, s, side, rim, tie, delay, back = false, chair = true }: { x: number; y: number; s: number; side: number; rim: string; tie: string; delay: number; back?: boolean; chair?: boolean }) {
  const t = -side * (back ? 1 : 3);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {chair && <rect x={-26 + side * 8} y="-58" width="52" height="96" rx="12" fill="#160d09" stroke={rim} strokeOpacity="0.18" />}
      <g className="cab-bob" style={{ animationDelay: `${delay}s` }}>
        <path d="M-30 40 L-28 -36 Q-25 -50 -12 -52 L12 -52 Q25 -50 28 -36 L30 40 Z" fill={back ? 'url(#cab-back)' : 'url(#cab-suit)'} />
        {!back && <path d="M-8 -52 L0 -32 L8 -52 Z" fill="#c9cfd8" opacity="0.8" />}
        {!back && <path d="M-2.4 -50 L2.4 -50 L3.4 -38 L0 -32 L-3.4 -38 Z" fill={tie} />}
        {back && <path d="M-9 -52 Q0 -46 9 -52" stroke="#dfe3ea" strokeOpacity="0.4" strokeWidth="2" fill="none" />}
        <rect x={-5 + t * 0.5} y="-60" width="10" height="9" fill="#1d1a1c" />
        <ellipse cx={t} cy="-67" rx="10.5" ry="12.5" fill="url(#cab-head)" />
        <path d={`M${t - 10.8} -68 Q${t - 11} -81 ${t} -81 Q${t + 11} -81 ${t + 10.8} -68 Q${t + 5} -75 ${t} -74 Q${t - 6} -75 ${t - 10.8} -68Z`} fill="#0b0b0e" />
        {back && <ellipse cx={t} cy="-66" rx="10.6" ry="12" fill="#0e0d10" />}
        <path d={side < 0 ? `M${t + 9.5} -74 Q${t + 11.5} -66 ${t + 8} -58 M27 -30 Q28.5 -10 29 10` : `M${t - 9.5} -74 Q${t - 11.5} -66 ${t - 8} -58 M-27 -30 Q-28.5 -10 -29 10`} stroke={rim} strokeWidth="1.6" fill="none" opacity="0.75" strokeLinecap="round" />
      </g>
    </g>
  );
}

export default function Cabinet({ a, mood }: SceneArtProps) {
  const key = KEY[mood];
  const scr = SCREEN[mood];
  const line = mood === 'bad' ? 'M6 22 L18 26 L28 38 L40 36 L52 52 L64 60' : mood === 'good' ? 'M6 58 L18 52 L28 54 L40 40 L52 34 L64 22' : 'M6 46 L18 40 L28 44 L40 34 L52 38 L64 30';
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-cabinet" aria-hidden>
      <defs>
        <linearGradient id="cab-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1512" />
          <stop offset="0.6" stopColor="#3a2619" />
          <stop offset="1" stopColor="#24170f" />
        </linearGradient>
        <linearGradient id="cab-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0d0a09" />
          <stop offset="1" stopColor="#24180f" />
        </linearGradient>
        <linearGradient id="cab-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b1f12" />
          <stop offset="0.5" stopColor="#5a2f19" />
          <stop offset="1" stopColor="#1d0f08" />
        </linearGradient>
        <linearGradient id="cab-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor={key} stopOpacity="0.28" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cab-suit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e384c" />
          <stop offset="0.55" stopColor="#151b27" />
          <stop offset="1" stopColor="#07090d" />
        </linearGradient>
        <linearGradient id="cab-back" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#07090d" />
          <stop offset="0.6" stopColor="#141a25" />
          <stop offset="1" stopColor="#2a3346" />
        </linearGradient>
        <radialGradient id="cab-head" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#5a4237" />
          <stop offset="1" stopColor="#1e1614" />
        </radialGradient>
        <radialGradient id="cab-pool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={key} stopOpacity="0.55" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cab-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={key} stopOpacity="0.35" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="cab-bulb" cx="0.5" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#fff6e0" />
          <stop offset="0.35" stopColor={key} stopOpacity="0.7" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cab-fa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.333" stopColor={a[0]} />
          <stop offset="0.333" stopColor={a[1]} />
          <stop offset="0.666" stopColor={a[1]} />
          <stop offset="0.666" stopColor={a[2]} />
        </linearGradient>
        <linearGradient id="cab-fold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0.45" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="cab-scr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1a2c" />
          <stop offset="1" stopColor="#050b14" />
        </linearGradient>
      </defs>

      {/* Room shell: back wall, side walls in one-point perspective, ceiling, floor */}
      <rect width="640" height="360" fill="#0b0807" />
      <rect x="150" y="18" width="380" height="162" fill="url(#cab-wall)" />
      {[178, 238, 298, 358, 418, 478].map((x) => (
        <rect key={x} x={x} y="34" width="46" height="132" rx="2" fill="#000" opacity="0.18" stroke="#6b4a30" strokeOpacity="0.25" />
      ))}
      <rect x="150" y="18" width="380" height="8" fill="#4a3322" />
      <path d="M0 -27 L150 18 L150 180 L0 255 Z" fill="url(#cab-side)" />
      <path d="M530 18 L640 -15 L640 235 L530 180 Z" fill="#120d0a" />
      <path d="M0 255 L150 180 L530 180 L640 235 L640 360 L0 360 Z" fill="#120c09" />

      {/* Wall sconces */}
      {[205, 475].map((x) => (
        <g key={x} className="cab-pulse">
          <ellipse cx={x} cy="70" rx="34" ry="44" fill="url(#cab-pool)" opacity="0.5" />
          <rect x={x - 3} y="62" width="6" height="12" rx="2" fill="#f7deb0" />
        </g>
      ))}
      <rect x="150" y="166" width="380" height="14" fill="#160f0b" />

      {/* Flag in the left corner */}
      <rect x="110" y="62" width="3" height="150" fill="#8a6b3a" />
      <circle cx="111.5" cy="60" r="4" fill="#d8b46a" />
      <g className="cab-flag">
        <path d="M113 66 Q132 70 152 66 L148 150 Q130 158 113 150 Z" fill="url(#cab-fa)" />
        <path d="M113 66 Q132 70 152 66 L148 150 Q130 158 113 150 Z" fill="url(#cab-fold)" />
      </g>

      {/* Wall screen on the right wall */}
      <g transform="translate(548 66) skewY(-16)">
        <rect x="-4" y="-4" width="80" height="78" rx="3" fill="#050608" />
        <rect width="72" height="70" fill="url(#cab-scr)" />
        <rect width="72" height="9" fill={scr} opacity="0.55" />
        {[22, 34, 46, 58].map((y) => (
          <line key={y} x1="4" y1={y} x2="68" y2={y} stroke={scr} strokeOpacity="0.15" />
        ))}
        <path className="cab-line" d={line} stroke={scr} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <g className="cab-blip">
          <circle cx="64" cy={mood === 'bad' ? 60 : mood === 'good' ? 22 : 30} r="3" fill={scr} />
        </g>
        <rect className="cab-scan" y="0" width="72" height="6" fill={scr} opacity="0.12" />
        <rect width="72" height="70" fill={scr} opacity="0.06" />
      </g>
      <path d="M544 64 L640 30 L640 200 L544 180 Z" fill={scr} opacity="0.05" />

      {/* Leader's high-backed chair and the leader at the head of the table */}
      <ellipse cx="340" cy="120" rx="70" ry="60" fill="url(#cab-pool)" opacity="0.35" />
      <rect x="298" y="78" width="84" height="104" rx="18" fill="#1d110c" />
      <path d="M302 94 Q340 76 378 94" stroke={key} strokeOpacity="0.55" strokeWidth="2" fill="none" />
      <Bust x={340} y={180} s={1.02} side={1} rim={key} tie="#8a1f26" delay={-3} chair={false} />

      {/* Table: polished wood converging to the head, light pools, sheen */}
      <path d="M262 170 L418 170 L720 520 L-80 520 Z" fill="url(#cab-table)" />
      <path d="M262 170 L418 170 L720 520 L-80 520 Z" fill="url(#cab-sheen)" />
      <path d="M262 170 L418 170" stroke={key} strokeOpacity="0.5" strokeWidth="1.2" />
      <g className="cab-pulse">
        <ellipse cx="340" cy="186" rx="52" ry="9" fill="url(#cab-pool)" />
        <ellipse cx="336" cy="232" rx="104" ry="19" fill="url(#cab-pool)" />
        <ellipse cx="330" cy="318" rx="170" ry="34" fill="url(#cab-pool)" opacity="0.7" />
      </g>

      {/* Papers, folders and glasses at each place */}
      <path d="M284 190 L304 190 L301 197 L279 197 Z" fill="#e8e1d2" opacity="0.75" />
      <path d="M376 190 L396 190 L401 197 L379 197 Z" fill="#e8e1d2" opacity="0.75" />
      <path d="M238 222 L272 222 L266 234 L228 234 Z" fill={a[0]} opacity="0.9" />
      <path d="M241 224 L270 224 L265 232 L233 232 Z" fill="#efe8da" opacity="0.8" />
      <path d="M408 222 L442 222 L452 234 L414 234 Z" fill="#efe8da" opacity="0.8" />
      <path d="M196 284 L250 284 L240 304 L178 304 Z" fill="#efe8da" opacity="0.7" />
      <path d="M430 284 L484 284 L502 304 L440 304 Z" fill={a[0]} opacity="0.85" />
      <path d="M434 286 L480 286 L494 301 L446 301 Z" fill="#efe8da" opacity="0.7" />
      {[
        [268, 212, 3],
        [412, 212, 3],
        [222, 262, 4.5],
        [458, 262, 4.5],
      ].map(([x, y, r]) => (
        <g key={x}>
          <rect x={x - r} y={y - r * 3} width={r * 2} height={r * 3} rx="1" fill="#cfe3ff" opacity="0.28" />
          <rect x={x - r} y={y - r * 3} width={r * 0.6} height={r * 3} fill="#fff" opacity="0.5" />
        </g>
      ))}

      {SEATS.map(([x, y, s, side, d]) => (
        <Bust key={x} x={x} y={y} s={s} side={side} rim={key} tie={side < 0 ? '#3a2430' : '#1f3346'} delay={d} back={s > 1} />
      ))}

      {/* Pendant lights: cones and bulbs */}
      <g className="cab-pulse">
        <path d="M318 50 L362 50 L420 200 L260 200 Z" fill="url(#cab-cone)" />
        <path d="M200 30 L236 30 L300 300 L120 300 Z" fill="url(#cab-cone)" opacity="0.35" />
        <path d="M444 30 L480 30 L560 300 L380 300 Z" fill="url(#cab-cone)" opacity="0.35" />
        <ellipse cx="340" cy="52" rx="40" ry="15" fill="url(#cab-bulb)" />
      </g>
      <line x1="340" y1="0" x2="340" y2="36" stroke="#0a0706" strokeWidth="1.4" />
      <path d="M316 52 L328 36 L352 36 L364 52 Z" fill="#2a1d14" stroke={key} strokeOpacity="0.6" />
      <path d="M270 -4 L292 -24 L340 -24 L362 -4 Z" fill="#1c130d" stroke={key} strokeOpacity="0.5" />
    </svg>
  );
}
