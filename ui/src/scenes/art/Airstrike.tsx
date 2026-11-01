import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import './security.css';

const JET =
  'M62 0 L42 -4 L12 -6 L-4 -42 L-17 -42 L-13 -7 L-38 -6 L-50 -22 L-58 -22 L-55 -4 L-62 -3 L-62 3 L-55 4 L-58 22 L-50 22 L-38 6 L-13 7 L-17 42 L-4 42 L12 6 L42 4 Z';

function Jet({ x, y, s, r, cls, delay = 0 }: { x: number; y: number; s: number; r: number; cls: string; delay?: number }) {
  const uid = useSceneUid();
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <g className={cls} style={{ animationDelay: `${delay}s` }}>
        <path d="M-62 0 L-420 -3 L-420 3 Z" fill={`url(#as-trail-${uid})`} />
        <ellipse className="as-burner" cx="-74" cy="0" rx="20" ry="5" fill={`url(#as-burn-${uid})`} />
        <path d={JET} fill={`url(#as-jet-${uid})`} />
        <path d="M42 4 L12 6 L-4 42 L-17 42 L-13 7 L-38 6 L-50 22" fill="none" stroke="#ff9a4a" strokeOpacity="0.55" strokeWidth="1.4" />
        <ellipse cx="34" cy="0" rx="9" ry="2.2" fill="#6fa8c8" opacity="0.5" />
        <circle className="as-nav" cx="-10" cy="-41" r="1.6" fill="#ff4040" />
        <circle className="as-nav" cx="-10" cy="41" r="1.6" fill="#40ff7a" />
      </g>
    </g>
  );
}

const TOWERS: Array<[number, number, number]> = [
  [150, 18, 22], [172, 14, 38], [190, 22, 28], [216, 12, 52], [232, 20, 34], [258, 16, 64], [278, 24, 40],
  [306, 14, 30], [324, 20, 56], [348, 26, 44], [378, 12, 72], [394, 22, 38], [420, 16, 50], [440, 24, 30],
  [468, 14, 46], [486, 22, 26], [512, 18, 36], [534, 26, 20],
];

const BLASTS: Array<[number, number, number, number]> = [
  [362, 206, 30, 0], [262, 214, 20, 1.6], [452, 216, 16, 3.1],
];

const TRACERS = [
  'M214 236 Q224 170 262 112', 'M296 238 Q300 200 318 150', 'M488 236 Q470 168 418 92',
  'M520 236 Q512 200 500 176',
];

export default function Airstrike({ mood }: SceneArtProps) {
  const uid = useSceneUid();
  const bad = mood === 'bad';
  const good = mood === 'good';
  const fire = bad ? '#ff4a2a' : '#ff8a2a';
  const hud = bad ? '#ff6a4a' : good ? '#8dffb0' : '#7dffa6';
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-airstrike" aria-hidden>
      <defs>
        <linearGradient id={`as-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03050c" />
          <stop offset="0.45" stopColor="#0a1030" />
          <stop offset="0.62" stopColor={bad ? '#3a0f1a' : '#2a1430'} />
          <stop offset="0.66" stopColor={bad ? '#7a2010' : '#6a2a1a'} />
          <stop offset="0.67" stopColor="#05060a" />
          <stop offset="1" stopColor="#020306" />
        </linearGradient>
        <radialGradient id={`as-glow-${uid}`} gradientUnits="userSpaceOnUse" cx="360" cy="220" r="260">
          <stop offset="0" stopColor={fire} stopOpacity="0.55" />
          <stop offset="0.4" stopColor={fire} stopOpacity="0.16" />
          <stop offset="1" stopColor={fire} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`as-blast-${uid}`}>
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="0.25" stopColor="#ffd56a" />
          <stop offset="0.6" stopColor={fire} stopOpacity="0.6" />
          <stop offset="1" stopColor={fire} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`as-jet-${uid}`} x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4660" />
          <stop offset="0.45" stopColor="#151b2a" />
          <stop offset="1" stopColor="#5a2e1e" />
        </linearGradient>
        <radialGradient id={`as-burn-${uid}`}>
          <stop offset="0" stopColor="#fff6e0" />
          <stop offset="0.35" stopColor="#ffb44a" />
          <stop offset="1" stopColor="#ff5a1a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`as-trail-${uid}`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#ffc07a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffc07a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`as-smoke-${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={fire} stopOpacity="0.8" />
          <stop offset="0.25" stopColor="#7a4434" stopOpacity="0.95" />
          <stop offset="0.7" stopColor="#4a3440" stopOpacity="0.75" />
          <stop offset="1" stopColor="#1a1a2a" stopOpacity="0" />
        </linearGradient>
        <filter id={`as-soft-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`as-glowf-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      <rect width="640" height="360" fill={`url(#as-sky-${uid})`} />
      {/* stars */}
      <g fill="#cfe0ff">
        {[[40, 60], [96, 48], [180, 70], [250, 52], [420, 58], [560, 66], [600, 92], [520, 40], [120, 110], [470, 120]].map(([x, y], i) => (
          <circle key={i} className={i % 3 ? undefined : 'as-twinkle'} cx={x} cy={y} r={i % 2 ? 0.8 : 1.1} opacity="0.7" />
        ))}
      </g>
      <rect width="640" height="360" fill={`url(#as-glow-${uid})`} />

      {/* smoke plumes rising from the target, lit from below */}
      <g filter={`url(#as-soft-${uid})`}>
        <path className="as-plume" d="M344 214 C316 170 340 120 300 60 C340 56 400 80 410 120 C420 160 396 190 384 214 Z" fill={`url(#as-smoke-${uid})`} />
        <path className="as-plume as-plume2" d="M248 222 C230 180 250 140 226 100 C262 104 292 140 290 180 C288 200 282 210 278 222 Z" fill={`url(#as-smoke-${uid})`} />
        <path className="as-plume" d="M442 222 C432 190 448 160 440 130 C470 140 486 180 470 222 Z" fill={`url(#as-smoke-${uid})`} />
      </g>

      {/* distant skyline */}
      <g fill="#07080e">
        {TOWERS.map(([x, w, h]) => (
          <rect key={x} x={x} y={238 - h} width={w} height={h} />
        ))}
        <path d="M0 238 L150 232 L560 232 L640 236 L640 242 L0 242 Z" />
      </g>
      <g fill="#ffd27a" opacity="0.55">
        {TOWERS.filter((_, i) => i % 2 === 0).map(([x, w, h], i) => (
          <rect key={x} x={x + 3} y={238 - h + 6 + (i % 3) * 7} width={Math.max(2, w / 4)} height="2" />
        ))}
      </g>
      <path d="M140 238 H560" stroke={fire} strokeOpacity="0.5" strokeWidth="1" filter={`url(#as-glowf-${uid})`} />

      {/* strike flashes */}
      {BLASTS.map(([x, y, r0, d]) => {
        const r = r0 * (bad ? 1.35 : 1);
        return (
          <g key={x}>
            <ellipse cx={x} cy={y + r * 0.5} rx={r * 2.4} ry={r * 0.45} fill={fire} opacity="0.45" filter={`url(#as-soft-${uid})`} />
            <g className="as-blast" style={{ animationDelay: `${d}s` }}>
              <circle cx={x} cy={y} r={r * 1.5} fill={`url(#as-blast-${uid})`} opacity="0.55" />
              <g filter={`url(#as-glowf-${uid})`}>
                <circle cx={x - r * 0.35} cy={y - r * 0.1} r={r * 0.5} fill="#ffb347" />
                <circle cx={x + r * 0.35} cy={y - r * 0.25} r={r * 0.45} fill="#ff8a2a" />
                <circle cx={x} cy={y - r * 0.55} r={r * 0.42} fill="#ffc46a" />
                <circle cx={x} cy={y} r={r * 0.36} fill="#fff4cf" />
              </g>
            </g>
            <circle className="as-ring" cx={x} cy={y} r={r * 0.7} fill="none" stroke="#ffe2a0" strokeOpacity="0.28" strokeWidth="0.8" style={{ animationDelay: `${d}s` }} />
          </g>
        );
      })}

      {/* anti-air tracers */}
      <g fill="none" strokeLinecap="round">
        {TRACERS.map((d, i) => (
          <path key={d} className="as-tracer" d={d} stroke={i % 2 ? '#ffe08a' : '#ff9a5a'} strokeWidth="1.4" strokeDasharray="2 10" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
      </g>

      {/* water in the foreground, reflecting the fires */}
      <rect x="0" y="242" width="640" height="118" fill="#03050a" />
      <g filter={`url(#as-soft-${uid})`} opacity="0.6">
        {BLASTS.map(([x, , r]) => (
          <ellipse key={x} cx={x} cy={262} rx={r * 0.5} ry={r * 1.1} fill={fire} />
        ))}
      </g>
      <g className="as-shimmer" stroke={fire} strokeLinecap="round">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <path key={i} d={`M${330 - 60 + (i % 3) * 18} ${250 + i * 7} h${80 - i * 6}`} strokeOpacity={0.5 - i * 0.05} strokeWidth="1.6" />
        ))}
        <path d="M244 254 h30 M250 262 h18 M440 256 h24 M446 266 h12" strokeOpacity="0.35" strokeWidth="1.4" />
      </g>

      {/* the strike package overhead */}
      <Jet x={484} y={80} s={0.32} r={-10} cls="as-jet3" delay={1} />
      <Jet x={200} y={140} s={0.62} r={-14} cls="as-jet2" delay={0.5} />
      <Jet x={330} y={104} s={1} r={-12} cls="as-jet1" />

      {/* targeting HUD overlay */}
      <g className="as-hud" stroke={hud} fill="none" strokeWidth="1.2" opacity="0.75">
        <path d="M110 58 h26 M110 58 v18 M530 58 h-26 M530 58 v18 M110 262 h26 M110 262 v-18 M530 262 h-26 M530 262 v-18" strokeWidth="1.6" />
        <g className="as-reticle">
          <circle cx="362" cy="206" r="22" strokeDasharray="10 5" />
          <path d="M362 176 v12 M362 224 v12 M332 206 h12 M380 206 h12" />
        </g>
        <path d="M356 206 h12 M362 200 v12" strokeWidth="0.8" />
        <path d="M128 110 h10 M128 130 h16 M128 150 h10 M128 170 h16 M128 190 h10" opacity="0.7" />
        <path d="M512 110 h-10 M512 130 h-16 M512 150 h-10 M512 170 h-16 M512 190 h-10" opacity="0.7" />
        <text x="390" y="184" fill={hud} stroke="none" fontSize="9" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.12em' }}>
          {bad ? 'NO LOCK' : 'TGT LOCK'}
        </text>
      </g>
      <rect className="as-scan" width="640" height="2" fill={hud} opacity="0.035" />
    </svg>
  );
}
