import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import NationFlag from './Flag';
import './security.css';

/** Seated or standing silhouette, uplit from the table (head gradient bright at the bottom). */
function Figure({ x, y, s = 1, uniform = false, k }: { x: number; y: number; s?: number; uniform?: boolean; k: string }) {
  const uid = useSceneUid();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-24 44 C-24 10 -17 2 0 2 C17 2 24 10 24 44 Z" fill={`url(#wr-suit-${uid})`} />
      {uniform ? (
        <>
          <rect x="-21" y="7" width="9" height="3" rx="1" fill="#c9a24a" opacity="0.7" />
          <rect x="12" y="7" width="9" height="3" rx="1" fill="#c9a24a" opacity="0.7" />
        </>
      ) : (
        <path d="M-6 2 L0 16 L6 2 Z" fill="#cfd9e6" opacity="0.55" />
      )}
      <rect x="-5" y="-4" width="10" height="8" fill="#0a1220" />
      <circle cx="0" cy="-12" r="10" fill={`url(#wr-head-${uid})`} />
      <path d="M-7 -5.5 C-3 -2.5 3 -2.5 7 -5.5" fill="none" stroke={k} strokeOpacity="0.55" strokeWidth="1.4" />
      <path d="M6 -19 C10 -16 11 -11 9.5 -7" fill="none" stroke={k} strokeOpacity="0.7" strokeWidth="1.2" />
      <path d="M16 6 C22 11 24 24 24 44" fill="none" stroke={`url(#wr-rim-${uid})`} strokeWidth="1.6" />
    </g>
  );
}

const MARKERS: Array<[number, number, number]> = [
  [238, 112, 0], [302, 96, 1.2], [356, 128, 2.1], [410, 104, 0.6], [272, 146, 1.7],
];

export default function WarRoom({ a, mood }: SceneArtProps) {
  const uid = useSceneUid();
  const bad = mood === 'bad';
  const good = mood === 'good';
  const key = bad ? '#ff5a4f' : good ? '#ffd27a' : '#6fd6ff';
  const front = bad ? '#ff3b30' : '#ff9a3c';
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-war_room" aria-hidden>
      <defs>
        <linearGradient id={`wr-wall-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1322" />
          <stop offset="0.6" stopColor="#0b1828" />
          <stop offset="1" stopColor="#04070d" />
        </linearGradient>
        <linearGradient id={`wr-map-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#082a44" />
          <stop offset="1" stopColor="#04121f" />
        </linearGradient>
        <radialGradient id={`wr-spill-${uid}`} cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor={key} stopOpacity="0.32" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`wr-table-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d5878" />
          <stop offset="0.5" stopColor="#0c2a40" />
          <stop offset="1" stopColor="#050b14" />
        </linearGradient>
        <linearGradient id={`wr-suit-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a2638" />
          <stop offset="1" stopColor="#070b13" />
        </linearGradient>
        <linearGradient id={`wr-head-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a111c" />
          <stop offset="1" stopColor="#1a2a3c" />
        </linearGradient>
        <linearGradient id={`wr-rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={key} stopOpacity="0.9" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`wr-alert-${uid}`} cx="0.5" cy="0" r="0.9">
          <stop offset="0" stopColor="#ff2a1f" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff2a1f" stopOpacity="0" />
        </radialGradient>
        <filter id={`wr-blur-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <clipPath id={`wr-mapclip-${uid}`}>
          <rect x="132" y="44" width="376" height="156" rx="3" />
        </clipPath>
      </defs>

      <rect width="640" height="360" fill={`url(#wr-wall-${uid})`} />
      {/* ceiling light strips in perspective */}
      <g stroke={key} strokeOpacity="0.22" strokeWidth="2">
        <path d="M0 18 L640 18" />
        <path d="M60 0 L190 34 M580 0 L450 34 M250 0 L270 34 M390 0 L370 34" strokeOpacity="0.12" />
      </g>
      <rect x="0" y="34" width="640" height="3" fill="#000" opacity="0.5" />
      {/* wall panels */}
      <g fill="#0e1b2c" stroke="#1a2b40" strokeWidth="1">
        <rect x="14" y="44" width="106" height="170" />
        <rect x="520" y="44" width="106" height="170" />
      </g>

      {/* giant wall map */}
      <rect x="126" y="38" width="388" height="168" rx="6" fill={key} opacity="0.35" filter={`url(#wr-blur-${uid})`} />
      <rect x="126" y="38" width="388" height="168" rx="5" fill="#02060c" />
      <rect x="132" y="44" width="376" height="156" rx="3" fill={`url(#wr-map-${uid})`} />
      <g clipPath={`url(#wr-mapclip-${uid})`}>
        <g stroke="#2a6f99" strokeOpacity="0.35" strokeWidth="0.6">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <path key={`v${i}`} d={`M${150 + i * 32} 44 V200`} />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={`h${i}`} d={`M132 ${64 + i * 32} H508`} />
          ))}
        </g>
        <g fill="#123f5c" stroke="#4fb3e0" strokeOpacity="0.7" strokeWidth="0.8">
          <path d="M150 70 C180 58 220 62 236 80 C250 96 238 120 214 128 C196 150 170 146 160 124 C146 108 140 84 150 70 Z" />
          <path d="M246 60 C290 50 352 54 384 70 C420 66 470 74 490 96 C500 120 470 136 440 132 C420 150 380 160 350 150 C320 168 286 160 270 140 C250 124 238 96 246 60 Z" />
          <path d="M300 168 C320 162 344 170 350 186 C340 198 310 200 296 190 Z" />
          <path d="M456 150 C474 144 494 152 496 168 C486 180 462 178 456 150 Z" />
        </g>
        <g fill="none" stroke="#4fb3e0" strokeOpacity="0.28" strokeWidth="0.6">
          <path d="M190 64 C196 90 186 110 200 132 M270 74 C290 100 280 130 300 150 M384 70 C380 100 400 120 396 148 M430 82 C440 104 430 120 450 132" />
        </g>
        <g fill="#bfe9ff">
          {[[176, 92], [206, 108], [262, 84], [338, 74], [372, 98], [444, 92], [470, 110], [318, 180], [224, 82], [400, 140]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" opacity="0.7" />
          ))}
        </g>
        <path d="M296 72 C312 96 300 120 330 138 C352 152 344 170 360 182 L400 182 C384 150 380 120 362 96 C350 80 330 66 296 72 Z" fill={front} opacity="0.1" />
        {/* contested zone and glowing front */}
        <path d="M296 72 C312 96 300 120 330 138 C352 152 344 170 360 182" fill="none" stroke={front} strokeWidth="7" opacity="0.45" filter={`url(#wr-blur-${uid})`} />
        <path className="wr-front" d="M296 72 C312 96 300 120 330 138 C352 152 344 170 360 182" fill="none" stroke={front} strokeWidth="2.2" strokeDasharray="7 4" />
        <path d="M262 108 l22 -4 m-6 -5 l6 5 l-6 5" fill="none" stroke={key} strokeWidth="2" strokeLinecap="round" />
        <path d="M380 126 l-22 -2 m6 -5 l-6 5 l6 5" fill="none" stroke="#ff6b5a" strokeWidth="2" strokeLinecap="round" />
        {MARKERS.map(([x, y, d], i) => (
          <g key={i}>
            <circle className="wr-ping" cx={x} cy={y} r="9" fill="none" stroke={i % 2 ? '#ff6b5a' : key} strokeWidth="1.4" style={{ animationDelay: `${d}s` }} />
            <circle cx={x} cy={y} r="2.8" fill={i % 2 ? '#ff6b5a' : key} />
          </g>
        ))}
        <rect className="wr-scan" x="132" y="44" width="40" height="156" fill={key} opacity="0.08" />
        <rect x="132" y="44" width="376" height="156" fill={`url(#wr-spill-${uid})`} opacity="0.5" />
      </g>
      <rect x="132" y="44" width="376" height="156" rx="3" fill="none" stroke={key} strokeOpacity="0.4" />
      {/* wall glow onto room */}
      <ellipse cx="320" cy="130" rx="300" ry="130" fill={`url(#wr-spill-${uid})`} />

      {/* side screens: radar left, status bars right */}
      <g className="wr-flicker">
        <rect x="24" y="56" width="86" height="70" rx="3" fill="#06192a" stroke={key} strokeOpacity="0.35" />
        <circle cx="67" cy="91" r="28" fill="none" stroke={key} strokeOpacity="0.35" />
        <circle cx="67" cy="91" r="15" fill="none" stroke={key} strokeOpacity="0.25" />
        <path className="wr-sweep" d="M67 91 L67 63 A28 28 0 0 1 91 77 Z" fill={key} opacity="0.35" />
        <circle cx="80" cy="80" r="2" fill="#ff6b5a" />
      </g>
      <g>
        <rect x="530" y="56" width="86" height="70" rx="3" fill="#06192a" stroke={key} strokeOpacity="0.35" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} className="wr-bar" x="540" y={66 + i * 11} width={[50, 34, 60, 22, 44][i]} height="5" rx="1" fill={i === 2 ? front : key} opacity="0.6" style={{ animationDelay: `${i * 0.7}s` }} />
        ))}
      </g>
      <g opacity="0.85">
        <rect x="24" y="136" width="86" height="56" rx="3" fill="#06192a" stroke={key} strokeOpacity="0.25" />
        <path className="wr-trace" d="M30 176 L44 168 L54 172 L66 154 L78 162 L90 150 L104 156" fill="none" stroke={key} strokeWidth="1.5" />
        <rect x="530" y="136" width="86" height="56" rx="3" fill="#06192a" stroke={key} strokeOpacity="0.25" />
        <NationFlag colors={a} x={540} y={146} w={30} h={20} />
        <rect x="576" y="148" width="32" height="3" fill={key} opacity="0.5" />
        <rect x="576" y="156" width="24" height="3" fill={key} opacity="0.35" />
        <rect x="576" y="164" width="28" height="3" fill={key} opacity="0.35" />
      </g>

      {/* the leader, standing at the head of the table against the map */}
      <ellipse cx="320" cy="184" rx="40" ry="30" fill={key} opacity="0.18" filter={`url(#wr-blur-${uid})`} />
      <Figure x={320} y={194} s={1.22} k={key} />
      {/* officers on the far side */}
      <Figure x={244} y={214} s={0.86} uniform k={key} />
      <Figure x={396} y={214} s={0.86} uniform k={key} />

      {/* table lit from within */}
      <path d="M206 236 L434 236 L566 300 L74 300 Z" fill={`url(#wr-table-${uid})`} />
      <path d="M206 236 L434 236 L566 300 L74 300 Z" fill="none" stroke={key} strokeOpacity="0.55" strokeWidth="1.4" />
      <g stroke={key} strokeOpacity="0.25" strokeWidth="0.7" fill="none">
        <path d="M250 246 L390 246 M232 258 L408 258 M196 276 L444 276" />
        <path d="M300 238 L280 298 M340 238 L360 298" />
      </g>
      {/* holographic theatre projected on the table */}
      <g fill={key} fillOpacity="0.22" stroke={key} strokeOpacity="0.7" strokeWidth="0.8">
        <path d="M262 250 C282 242 312 246 322 254 C340 250 366 252 376 262 C360 272 320 274 300 268 C280 270 256 262 262 250 Z" />
      </g>
      <path d="M306 248 C312 256 308 262 318 270" fill="none" stroke={front} strokeWidth="1.6" />
      <circle className="wr-ping" cx="340" cy="258" r="6" fill="none" stroke={front} strokeWidth="1" />
      <ellipse className="wr-tableglow" cx="320" cy="262" rx="170" ry="26" fill={key} opacity="0.16" filter={`url(#wr-blur-${uid})`} />
      <rect x="74" y="300" width="492" height="8" fill="#03070c" />
      {/* desk flag */}
      <g transform="translate(206 214)">
        <rect x="0" y="0" width="1.4" height="24" fill="#9aa7b8" />
        <g className="wr-flag">
          <NationFlag colors={a} x={1.4} y={0} w={16} h={11} />
        </g>
      </g>

      {/* side officers seated along the table edges */}
      <Figure x={170} y={248} s={1.05} uniform k={key} />
      <Figure x={470} y={248} s={1.05} k={key} />
      {/* foreground, out of focus framing figures */}
      <g opacity="0.95" filter={`url(#wr-blur-${uid})`}>
        <Figure x={44} y={210} s={2.1} k={key} />
        <Figure x={600} y={214} s={2.0} uniform k={key} />
      </g>

      {bad && <rect className="wr-alert" width="640" height="360" fill={`url(#wr-alert-${uid})`} />}
      {bad && <circle className="wr-beacon" cx="320" cy="14" r="6" fill="#ff3b30" />}
    </svg>
  );
}
