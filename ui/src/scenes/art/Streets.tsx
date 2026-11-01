import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import './public.css';

/** Protesters in three depth rows: fixed pseudo-random layout from a tiny LCG. */
const CROWD = (() => {
  let seed = 11;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rows = [
    { y: 206, s: 0.62, n: 30, x0: -10, x1: 430 },
    { y: 232, s: 0.85, n: 22, x0: -14, x1: 420 },
    { y: 270, s: 1.2, n: 13, x0: -20, x1: 400 },
  ];
  return rows.map((row, ri) =>
    Array.from({ length: row.n }, (_, i) => {
      const x = row.x0 + ((row.x1 - row.x0) * (i + 0.2 + r() * 0.6)) / row.n;
      const roll = r();
      return {
        x,
        y: row.y + (r() - 0.5) * 6,
        s: row.s * (0.92 + r() * 0.16),
        prop: ri === 1 && i % 7 === 3 ? 'flare' : roll < 0.22 ? 'sign' : roll < 0.34 ? 'fist' : '',
        tone: Math.floor(r() * 3),
        d: r() * 4,
      };
    }),
  );
})();

const SKY = {
  neutral: ['#1d1838', '#5b2f58', '#e0744a'],
  bad: ['#1a0f1c', '#4a1a26', '#b8442e'],
  good: ['#141a38', '#3b3560', '#d88a4a'],
} as const;

export default function Streets({ a, mood }: SceneArtProps) {
  const uid = useSceneUid();
  const [s0, s1, s2] = SKY[mood];
  const body = ['#140f18', '#1b1420', '#100c14'];
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-streets" aria-hidden>
      <defs>
        <linearGradient id={`str-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s0} />
          <stop offset="0.38" stopColor={s1} />
          <stop offset="0.62" stopColor={s2} />
          <stop offset="0.75" stopColor={s1} />
        </linearGradient>
        <radialGradient id={`str-flare-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff2e0" />
          <stop offset="0.15" stopColor="#ff4a2a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff2a10" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`str-candle-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6d8" />
          <stop offset="0.25" stopColor="#ffb648" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ff9a2a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`str-smoke-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#d8d0d6" stopOpacity={mood === 'bad' ? 0.75 : 0.5} />
          <stop offset="1" stopColor="#d8d0d6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`str-bldg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1626" />
          <stop offset="1" stopColor="#0c0a12" />
        </linearGradient>
        <linearGradient id={`str-shield-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8fa6c4" stopOpacity="0.5" />
          <stop offset="0.4" stopColor="#3a4a64" stopOpacity="0.55" />
          <stop offset="1" stopColor="#1a2234" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      <rect width="640" height="360" fill={`url(#str-sky-${uid})`} />
      {/* Skyline and street walls */}
      <path d="M150 220 V150 h30 v-24 h24 v40 h30 v-60 h10 v-8 h6 v8 h14 v80 h40 v-40 h28 v30 h36 v-70 h22 v50 h30 v-20 h40 V220 Z" fill="#2a1e34" opacity="0.85" />
      <path d="M0 0 H150 L190 60 V230 L0 250 Z" fill={`url(#str-bldg-${uid})`} />
      <path d="M640 0 H500 L462 60 V232 L640 250 Z" fill={`url(#str-bldg-${uid})`} />
      {Array.from({ length: 40 }, (_, i) => {
        const left = i < 20;
        const c = i % 4;
        const rr = Math.floor((i % 20) / 4);
        const x = left ? 14 + c * 36 - rr * 3 : 488 + c * 36 + rr * 3;
        const lit = (i * 7) % 5 === 0;
        return <rect key={i} className={lit ? 'str-win' : undefined} x={x} y={30 + rr * 36} width="16" height="20" fill={lit ? '#ffb46a' : '#2a2236'} opacity={lit ? 0.8 : 0.9} style={{ animationDelay: `${i * 0.7}s` }} />;
      })}
      {/* Street lamps */}
      {[196, 456].map((x) => (
        <g key={x}>
          <rect x={x - 1} y="110" width="2" height="110" fill="#0e0a12" />
          <circle cx={x} cy="108" r="22" fill="#ffc27a" opacity="0.18" />
          <circle cx={x} cy="108" r="4" fill="#ffe6b8" />
        </g>
      ))}
      <path d="M0 230 L640 230 L640 360 L0 360 Z" fill="#0c0910" />

      {/* Police van behind the line */}
      <g>
        <rect x="486" y="176" width="130" height="58" rx="6" fill="#181c28" />
        <rect x="494" y="186" width="40" height="18" rx="2" fill="#3a4a62" opacity="0.6" />
        <rect x="540" y="186" width="68" height="18" rx="2" fill="#2a3448" opacity="0.6" />
        <rect className="str-red" x="530" y="168" width="18" height="8" rx="2" fill="#ff2a3a" />
        <rect className="str-blue" x="550" y="168" width="18" height="8" rx="2" fill="#2a6aff" />
        <g opacity="0.3">
          <circle className="str-red" cx="539" cy="172" r="26" fill="#ff2a3a" />
          <circle className="str-blue" cx="559" cy="172" r="26" fill="#2a6aff" />
        </g>
      </g>

      {/* Smoke from flares / tear gas */}
      {(mood === 'bad' ? [80, 200, 330, 450, 560] : mood === 'neutral' ? [120, 300] : []).map((x, i) => (
        <circle key={x} className="str-smoke" cx={x} cy={170 - (i % 2) * 20} r={mood === 'bad' ? 110 : 70} fill={`url(#str-smoke-${uid})`} style={{ animationDelay: `${-i * 2.6}s` }} />
      ))}

      {/* Crowd, back to front */}
      {CROWD.map((row, ri) =>
        row.map((p, i) => {
          const s = p.s;
          const fill = body[p.tone];
          return (
            <g key={`${ri}-${i}`} className={i % 3 === 0 ? 'str-bob' : undefined} style={{ animationDelay: `${p.d}s` }}>
              {p.prop === 'sign' && (
                <g className="str-sign" style={{ animationDelay: `${p.d}s` }}>
                  <rect x={p.x - 0.8 * s} y={p.y - 52 * s} width={1.8 * s} height={42 * s} fill="#3a2a22" />
                  <rect x={p.x - 15 * s} y={p.y - 68 * s} width={30 * s} height={20 * s} rx={1.5 * s} fill={i % 4 === 0 ? a[0] : '#ece4d4'} />
                  <rect x={p.x - 10 * s} y={p.y - 62 * s} width={20 * s} height={3 * s} fill={i % 4 === 0 ? a[1] : '#1a1418'} opacity="0.85" />
                  <rect x={p.x - 8 * s} y={p.y - 56 * s} width={14 * s} height={3 * s} fill={i % 4 === 0 ? a[1] : '#b22a2a'} opacity="0.85" />
                </g>
              )}
              {p.prop === 'fist' && (
                <path d={`M${p.x + 6 * s} ${p.y - 2 * s} L${p.x + 10 * s} ${p.y - 30 * s}`} stroke={fill} strokeWidth={5 * s} strokeLinecap="round" />
              )}
              <rect x={p.x - 10 * s} y={p.y - 4 * s} width={20 * s} height={60 * s} rx={8 * s} fill={fill} />
              <circle cx={p.x} cy={p.y - 11 * s} r={6.5 * s} fill={fill} />
              <path d={`M${p.x - 5 * s} ${p.y - 15 * s} a${6.5 * s} ${6.5 * s} 0 0 1 ${10 * s} 0`} fill="none" stroke={s2} strokeOpacity="0.5" strokeWidth={1 * s} />
              {p.prop === 'flare' && mood !== 'good' && (
                <g>
                  <path d={`M${p.x - 6 * s} ${p.y} L${p.x - 9 * s} ${p.y - 26 * s}`} stroke={fill} strokeWidth={4.5 * s} strokeLinecap="round" />
                  <circle className="str-flare" cx={p.x - 9 * s} cy={p.y - 30 * s} r={30 * s} fill={`url(#str-flare-${uid})`} style={{ animationDelay: `${p.d}s` }} />
                </g>
              )}
              {mood === 'good' && ri > 0 && i % 2 === 0 && (
                <g>
                  <rect x={p.x + 3 * s} y={p.y + 4 * s} width={3 * s} height={7 * s} fill="#f4ead2" />
                  <circle className="str-candle" cx={p.x + 4.5 * s} cy={p.y + 1 * s} r={12 * s} fill={`url(#str-candle-${uid})`} style={{ animationDelay: `${p.d}s` }} />
                </g>
              )}
            </g>
          );
        }),
      )}

      {/* A big national flag over the crowd */}
      <g>
        <line x1="150" y1="250" x2="158" y2="96" stroke="#2a1e18" strokeWidth="2.5" />
        <g className="str-flag">
          <rect x="158" y="96" width="60" height="13" fill={a[0]} />
          <rect x="158" y="109" width="60" height="13" fill={a[1]} />
          <rect x="158" y="122" width="60" height="13" fill={a[2]} />
          <rect x="158" y="96" width="60" height="39" fill="#000" opacity="0.18" />
        </g>
      </g>

      {/* Riot police line */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = 446 + i * 26;
        const y = 196 + (i % 2) * 3;
        return (
          <g key={i}>
            <rect x={x - 9} y={y + 2} width="20" height="60" rx="5" fill="#0c0f18" />
            <circle cx={x + 1} cy={y - 4} r="9" fill="#1a2132" />
            <rect x={x - 6} y={y - 6} width="14" height="5" rx="2" fill="#5e7aa8" opacity="0.7" />
            <path d={`M${x - 7} ${y - 10} a9 9 0 0 1 16 0`} fill="none" stroke="#9cb4dc" strokeOpacity="0.5" strokeWidth="1.2" />
            <rect x={x - 14} y={y + 4} width="26" height="62" rx="4" fill={`url(#str-shield-${uid})`} stroke="#a8bcd8" strokeOpacity="0.5" />
            <rect x={x - 10} y={y + 14} width="18" height="3" fill="#fff" opacity="0.4" />
          </g>
        );
      })}

      {/* Strobe wash on a bad night */}
      {mood === 'bad' && (
        <g opacity="0.12">
          <rect className="str-red" width="640" height="360" fill="#ff1a2a" />
          <rect className="str-blue" width="640" height="360" fill="#1a4aff" />
        </g>
      )}
      <rect y="300" width="640" height="60" fill="#06040a" opacity="0.5" />
    </svg>
  );
}
