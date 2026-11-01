import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import './public.css';

const CODES = ['ARG', 'BRA', 'CAN', 'EGY', 'GHA', 'IND', 'JPN', 'KEN', 'MEX', 'NOR', 'PER', 'QAT', 'SWE', 'TUR', 'VNM', 'ZAF', 'CHL', 'FIN'];

const CX = 320;
const CY = 168;

/** Delegates on curved tiers facing the rostrum, nearest tier largest. */
const DELEGATES = Array.from({ length: 3 }, (_, r) => {
  const rx = 250 + r * 90;
  const ry = 62 + r * 30;
  const s = 1 + r * 0.32;
  const n = 9 + r * 2;
  return {
    rx,
    ry,
    s,
    seats: Array.from({ length: n }, (_, i) => {
      const t = Math.PI * (0.12 + (0.76 * (i + 0.5)) / n);
      return { x: CX + rx * Math.cos(t), y: CY + ry * Math.sin(t), k: (i * 5 + r * 3) % 9 };
    }),
  };
});

function arc(rx: number, ry: number, dy: number): string {
  return `M${CX + rx * Math.cos(Math.PI * 0.06)} ${CY + ry * Math.sin(Math.PI * 0.06) + dy} A${rx} ${ry} 0 0 1 ${CX - rx * Math.cos(Math.PI * 0.06)} ${CY + ry * Math.sin(Math.PI * 0.06) + dy}`;
}

const LEAVES = Array.from({ length: 7 }, (_, i) => i);

export default function UnVote({ a, mood }: SceneArtProps) {
  const uid = useSceneUid();
  const yesCut = mood === 'good' ? 7 : mood === 'bad' ? 2 : 4.5;
  const vote = (i: number) => {
    const v = (i * 7) % 9;
    return v < yesCut ? 'y' : v === 8 ? 'a' : 'n';
  };
  const col = { y: '#2fe08a', n: '#ff5148', a: '#f5c142' };
  const yes = CODES.filter((_, i) => vote(i) === 'y').length;
  const no = CODES.filter((_, i) => vote(i) === 'n').length;
  const key = mood === 'bad' ? '#ff9a7a' : mood === 'good' ? '#ffe2a0' : '#fff0cc';
  const board = (x: number, off: number) => (
    <g>
      <rect x={x} y="50" width="132" height="150" rx="5" fill="#04121a" stroke="#c9a24f" strokeOpacity="0.55" />
      <rect x={x + 4} y="54" width="124" height="16" rx="2" fill="#0c2a33" />
      <text x={x + 10} y="66" fontSize="9" className="unv-label" fill={col.y}>YES {yes}</text>
      <text x={x + 122} y="66" fontSize="9" textAnchor="end" className="unv-label" fill={col.n}>NO {no}</text>
      {CODES.slice(off, off + 9).map((c, j) => {
        const v = vote(off + j);
        return (
          <g key={c}>
            <rect x={x + 6} y={75 + j * 13.4} width="120" height="11" rx="1.5" fill="#0a1f27" />
            <text x={x + 12} y={84 + j * 13.4} fontSize="8" className="unv-label" fill="#bfe3e6" letterSpacing="1">{c}</text>
            <rect className="unv-light" x={x + 42} y={77.5 + j * 13.4} width="76" height="6" rx="1" fill={col[v]} style={{ animationDelay: `${(off + j) * 0.35}s` }} />
          </g>
        );
      })}
    </g>
  );
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-un_vote" aria-hidden>
      <defs>
        <linearGradient id={`unv-wall-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b3438" />
          <stop offset="0.6" stopColor="#0f4146" />
          <stop offset="1" stopColor="#061a1d" />
        </linearGradient>
        <radialGradient id={`unv-gold-${uid}`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#ffd77a" />
          <stop offset="0.55" stopColor="#c8932f" />
          <stop offset="1" stopColor="#6e4a14" />
        </radialGradient>
        <radialGradient id={`unv-key-${uid}`} cx="0.5" cy="0.25" r="0.6">
          <stop offset="0" stopColor={key} stopOpacity="0.35" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`unv-desk-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f6f69" />
          <stop offset="1" stopColor="#173430" />
        </linearGradient>
        <linearGradient id={`unv-sil-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2b30" />
          <stop offset="1" stopColor="#081114" />
        </linearGradient>
        <linearGradient id={`unv-shaft-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={key} stopOpacity="0.28" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="640" height="360" fill={`url(#unv-wall-${uid})`} />
      {Array.from({ length: 22 }, (_, i) => (
        <rect key={i} x={i * 30} y="0" width="3" height="230" fill="#5fb7b0" opacity={i % 2 ? 0.06 : 0.12} />
      ))}
      <rect width="640" height="360" fill={`url(#unv-key-${uid})`} />

      {/* Gold emblem wall */}
      <path d="M214 30 H426 L410 206 H230 Z" fill={`url(#unv-gold-${uid})`} />
      <path d="M214 30 H426 L410 206 H230 Z" fill="#000" opacity="0.18" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={226 + i * 22} y="30" width="1.5" height="176" fill="#fff3c4" opacity="0.18" />
      ))}
      <g transform="translate(320 92)">
        <circle r="44" fill="#fff4cf" opacity="0.18" className="unv-halo" />
        <circle r="26" fill="#f9e7b0" />
        <g fill="none" stroke="#9b6d1f" strokeWidth="1.4">
          <circle r="26" />
          <ellipse rx="9" ry="26" />
          <ellipse rx="18.5" ry="26" />
          <path d="M0 -26 V26 M-26 0 H26 M-22.5 -13 H22.5 M-22.5 13 H22.5" />
        </g>
        <path d="M-12 -8 q6 -6 12 -2 q4 4 -2 8 q-6 2 -10 -6 Z M4 6 q8 -2 10 4 q-2 6 -8 6 q-4 -4 -2 -10 Z" fill="#c99a3e" opacity="0.7" />
        {[-1, 1].map((side) => (
          <g key={side} transform={`scale(${side} 1)`}>
            <path d="M-30 26 Q-46 0 -32 -30" fill="none" stroke="#9b6d1f" strokeWidth="1.6" />
            {LEAVES.map((i) => {
              const t = -1.05 + i * 0.34;
              const lx = -38 + (1 - Math.cos(t)) * 6;
              const ly = Math.sin(t) * 28;
              return (
                <g key={i} transform={`translate(${lx} ${ly}) rotate(${(t * 180) / Math.PI - 90})`}>
                  <path d="M0 0 q-7 -3 -11 2 q6 3 11 -2 Z" fill="#f9e7b0" stroke="#9b6d1f" strokeWidth="0.7" />
                  <path d="M0 0 q7 -3 11 2 q-6 3 -11 -2 Z" fill="#efd590" stroke="#9b6d1f" strokeWidth="0.7" />
                </g>
              );
            })}
          </g>
        ))}
      </g>

      {/* Light shafts from the dome */}
      {[180, 300, 420].map((x, i) => (
        <polygon key={x} className="unv-shaft" points={`${x},0 ${x + 40},0 ${x + 70 - i * 30},250 ${x - 30 - i * 30},250`} fill={`url(#unv-shaft-${uid})`} style={{ animationDelay: `${i * 2.2}s` }} />
      ))}

      {board(34, 0)}
      {board(474, 9)}

      {/* Rostrum: presiding desk and speaker */}
      <rect x="238" y="150" width="164" height="22" fill={`url(#unv-desk-${uid})`} />
      <rect x="238" y="148" width="164" height="3" fill="#e0c27a" opacity="0.8" />
      {[290, 320, 350].map((x) => (
        <g key={x}>
          <circle cx={x} cy="136" r="6" fill={`url(#unv-sil-${uid})`} />
          <rect x={x - 8} y="141" width="16" height="10" rx="4" fill={`url(#unv-sil-${uid})`} />
        </g>
      ))}
      <path d="M220 172 H420 L432 214 H208 Z" fill="#12312e" />
      <rect x="220" y="171" width="200" height="2" fill="#e0c27a" opacity="0.6" />
      <circle cx="320" cy="180" r="8" fill={`url(#unv-sil-${uid})`} />
      <path d="M305 205 v-12 q15 -10 30 0 v12 Z" fill={`url(#unv-sil-${uid})`} />
      <path d="M302 196 H338 L334 216 H306 Z" fill={`url(#unv-desk-${uid})`} />
      <rect x="302" y="195" width="36" height="2" fill="#e0c27a" />
      <circle cx="320" cy="206" r="4" fill="#f2d48a" />

      {/* Delegates' tiers with raised hands */}
      {DELEGATES.map((row, r) => (
        <g key={r}>
          {row.seats.map((d, i) => {
            const raised = d.k < yesCut;
            const s = row.s;
            return (
              <g key={i}>
                {raised && (
                  <g className="unv-hand" style={{ animationDelay: `${(i * 0.43 + r) % 3}s` }}>
                    <path d={`M${d.x + 6 * s} ${d.y - 6 * s} L${d.x + 9 * s} ${d.y - 26 * s}`} stroke="#16262a" strokeWidth={4.6 * s} strokeLinecap="round" />
                    <circle cx={d.x + 9 * s} cy={d.y - 28 * s} r={2.5 * s} fill="#6f8580" />
                  </g>
                )}
                <rect x={d.x - 8 * s} y={d.y - 6 * s} width={16 * s} height={16 * s} rx={6 * s} fill={`url(#unv-sil-${uid})`} />
                <circle cx={d.x} cy={d.y - 11 * s} r={4.8 * s} fill={`url(#unv-sil-${uid})`} />
                <path d={`M${d.x - 3.5 * s} ${d.y - 14 * s} a${4.8 * s} ${4.8 * s} 0 0 1 ${7 * s} 0`} fill="none" stroke={key} strokeOpacity="0.6" strokeWidth={0.9 * s} />
              </g>
            );
          })}
          <path d={arc(row.rx, row.ry, 9 * row.s)} fill="none" stroke={`url(#unv-desk-${uid})`} strokeWidth={9 * row.s} />
          <path d={arc(row.rx, row.ry, 9 * row.s - 4.5 * row.s)} fill="none" stroke="#9fd8cc" strokeOpacity="0.35" strokeWidth="1" />
          {row.seats.map((d, i) => (
            <rect key={i} x={d.x - 5 * row.s} y={d.y + 5 * row.s} width={10 * row.s} height={4 * row.s} fill={i % 4 === 1 ? a[0] : '#f1efe6'} opacity="0.75" />
          ))}
        </g>
      ))}
      <rect y="300" width="640" height="60" fill="#031012" opacity="0.5" />
    </svg>
  );
}
