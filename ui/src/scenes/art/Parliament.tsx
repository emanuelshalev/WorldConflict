import type { SceneArtProps } from './types';
import './public.css';

/** Pick the most saturated flag colour so white/black stripes never become the accent. */
function strong(c: [string, string, string]): string {
  let best = c[0];
  let score = -1;
  for (const hex of c) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const s = Math.max(r, g, b) - Math.min(r, g, b);
    if (s > score) {
      score = s;
      best = hex;
    }
  }
  return best;
}

const CX = 320;
const CY = 184;

interface Seat {
  x: number;
  y: number;
  s: number;
  v: number;
  d: number;
}
interface Row {
  rx: number;
  ry: number;
  w: number;
  seats: Seat[];
}

/** Hemicycle rows: U-shaped arcs opening toward the dais, nearer rows larger. */
const ROWS: Row[] = Array.from({ length: 5 }, (_, r) => {
  const rx = 150 + r * 64;
  const ry = 40 + r * 23;
  const s = 0.78 + r * 0.24;
  const n = 15 + r * 4;
  const seats: Seat[] = [];
  for (let i = 0; i < n; i++) {
    const t = Math.PI * (0.04 + (0.92 * (i + 0.5)) / n);
    if (Math.abs(t - Math.PI / 2) < 0.07) continue;
    const v = ((i * 7 + r * 13) % 11) / 11;
    seats.push({ x: CX + rx * Math.cos(t), y: CY + ry * Math.sin(t) - 4 * s, s, v, d: ((i * 3 + r * 5) % 17) * 0.37 });
  }
  return { rx, ry, w: 5 + r * 2.2, seats };
});

function arc(rx: number, ry: number, dy = 0): string {
  return `M${CX + rx} ${CY + dy} A${rx} ${ry} 0 0 1 ${CX - rx} ${CY + dy}`;
}

const TALLY = {
  good: { yes: 312, no: 141 },
  bad: { yes: 188, no: 265 },
  neutral: { yes: 226, no: 219 },
};

export default function Parliament({ a, mood }: SceneArtProps) {
  const acc = strong(a);
  const t = TALLY[mood];
  const total = t.yes + t.no;
  const yesShare = mood === 'good' ? 0.72 : mood === 'bad' ? 0.42 : 0.51;
  const glow = mood === 'bad' ? '#e0584a' : mood === 'good' ? '#ffcf7a' : '#f2c28a';
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-parliament" aria-hidden>
      <defs>
        <linearGradient id="parl-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b1a10" />
          <stop offset="0.55" stopColor="#3a2416" />
          <stop offset="1" stopColor="#140c08" />
        </linearGradient>
        <radialGradient id="parl-key" cx="0.5" cy="0.28" r="0.6">
          <stop offset="0" stopColor={glow} stopOpacity="0.55" />
          <stop offset="0.5" stopColor={glow} stopOpacity="0.12" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="parl-shaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe2b0" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffe2b0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="parl-sil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2220" />
          <stop offset="1" stopColor="#0d0a09" />
        </linearGradient>
        <linearGradient id="parl-bench" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a4a28" />
          <stop offset="1" stopColor="#3a2112" />
        </linearGradient>
        <linearGradient id="parl-leather" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5d1f1c" />
          <stop offset="1" stopColor="#2a0d0c" />
        </linearGradient>
        <linearGradient id="parl-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f1724" />
          <stop offset="1" stopColor="#070b12" />
        </linearGradient>
      </defs>

      {/* Back wall: wood panelling, gallery balconies */}
      <rect width="640" height="360" fill="url(#parl-wall)" />
      {Array.from({ length: 17 }, (_, i) => (
        <g key={i}>
          <rect x={i * 40 + 4} y="30" width="32" height="150" rx="2" fill="#4a2e1b" opacity="0.45" />
          <rect x={i * 40 + 4} y="30" width="2" height="150" fill="#c58a52" opacity="0.18" />
        </g>
      ))}
      <rect x="0" y="22" width="640" height="10" fill="#1a100a" />
      <rect x="0" y="31" width="640" height="2" fill="#c8975c" opacity="0.35" />
      <rect x="0" y="0" width="640" height="22" fill="#120a06" />
      {[30, 70, 110, 530, 570, 610].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="14" r="5" fill="#0b0705" />
          <circle className="parl-flash" cx={x + 4} cy="10" r="3" fill="#fff" style={{ animationDelay: `${i * 1.3}s` }} />
        </g>
      ))}

      <rect width="640" height="360" fill="url(#parl-key)" />
      {[150, 250, 390, 490].map((x, i) => (
        <polygon key={x} className="parl-shaft" points={`${x},0 ${x + 26},0 ${x + 70 - i * 30},260 ${x - 10 - i * 30},260`} fill="url(#parl-shaft)" style={{ animationDelay: `${i * 1.7}s` }} />
      ))}

      {/* Flag banners */}
      {[160, 452].map((x, k) => (
        <g key={x} className="parl-banner" style={{ animationDelay: `${k * 0.9}s` }}>
          <rect x={x} y="52" width="28" height="30" fill={a[0]} />
          <rect x={x} y="82" width="28" height="30" fill={a[1]} />
          <rect x={x} y="112" width="28" height="30" fill={a[2]} />
          <rect x={x} y="52" width="28" height="90" fill="url(#parl-sil)" opacity="0.28" />
          <rect x={x + 20} y="52" width="8" height="90" fill="#000" opacity="0.18" />
          <path d={`M${x} 142 l14 9 l14 -9`} fill={a[2]} />
          <rect x={x - 3} y="49" width="34" height="4" rx="2" fill="#d7a75f" />
        </g>
      ))}

      {/* Electronic vote board */}
      <g>
        <rect x="203" y="47" width="234" height="92" rx="6" fill="#0a0705" />
        <rect x="207" y="51" width="226" height="84" rx="4" fill="url(#parl-screen)" stroke="#c8975c" strokeOpacity="0.5" />
        <rect x="207" y="51" width="226" height="4" fill={acc} opacity="0.9" />
        <text x="320" y="67" textAnchor="middle" className="parl-label" fontSize="9" fill="#9fb0c8" letterSpacing="3">
          DIVISION
        </text>
        <text x="219" y="90" className="parl-label" fontSize="14" fill="#46e08a">YES</text>
        <rect x="258" y="80" width="130" height="12" rx="2" fill="#13261c" />
        <rect className="parl-bar" x="258" y="80" width={130 * (t.yes / total) * 1.4} height="12" rx="2" fill="#2fd27a" />
        <text x="422" y="90" textAnchor="end" className="parl-label" fontSize="14" fill="#e8fff1">{t.yes}</text>
        <text x="219" y="112" className="parl-label" fontSize="14" fill="#ff6a5c">NO</text>
        <rect x="258" y="102" width="130" height="12" rx="2" fill="#2a1414" />
        <rect className="parl-bar parl-bar2" x="258" y="102" width={130 * (t.no / total) * 1.4} height="12" rx="2" fill="#ef4a3c" />
        <text x="422" y="112" textAnchor="end" className="parl-label" fontSize="14" fill="#ffe9e6">{t.no}</text>
        <rect x="207" y="120" width="226" height="15" fill="#000" opacity="0.25" />
        {Array.from({ length: 27 }, (_, i) => (
          <rect key={i} className="parl-pip" x={214 + i * 8} y="124" width="5" height="6" rx="1" fill={i / 27 < yesShare ? '#2fd27a' : '#ef4a3c'} style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
        <rect className="parl-scan" x="207" y="51" width="226" height="84" fill="#9cc7ff" opacity="0.05" />
        <ellipse cx="320" cy="150" rx="120" ry="10" fill={mood === 'bad' ? '#ff5a4a' : '#7fd8ff'} opacity="0.08" />
      </g>

      {/* Speaker's dais */}
      <path d="M292 194 V156 q28 -15 56 0 V194 Z" fill="url(#parl-leather)" />
      <path d="M292 156 q28 -15 56 0" fill="none" stroke="#d7a75f" strokeWidth="2" opacity="0.7" />
      <circle cx="320" cy="166" r="7.5" fill="url(#parl-sil)" />
      <path d="M320 159 a7.5 7.5 0 0 1 6 3" fill="none" stroke={glow} strokeOpacity="0.6" />
      <path d="M306 190 v-11 q14 -9 28 0 v11 Z" fill="url(#parl-sil)" />
      <path d="M244 180 H396 L406 212 H234 Z" fill="url(#parl-bench)" />
      <rect x="244" y="178" width="152" height="4" fill="#e1b277" opacity="0.6" />
      <circle cx="320" cy="196" r="10" fill="#1d120a" stroke="#d7a75f" strokeWidth="1.5" />
      <circle cx="320" cy="196" r="6" fill={acc} />
      <path d="M252 212 H388 L396 226 H244 Z" fill="#2c190d" />
      {[290, 350].map((x) => (
        <g key={x}>
          <circle cx={x} cy="204" r="4.5" fill="url(#parl-sil)" />
          <rect x={x - 6.5} y="208" width="13" height="9" rx="4" fill="url(#parl-sil)" />
        </g>
      ))}
      <rect x="226" y="225" width="188" height="3" fill="#000" opacity="0.4" />

      {/* Hemicycle: desk with vote lights, members, bench back */}
      {ROWS.map((row, r) => (
        <g key={r}>
          <path d={arc(row.rx - 10 - r * 2, row.ry - 8 - r, -2)} fill="none" stroke="#2a170c" strokeWidth={row.w + 2} />
          <path d={arc(row.rx - 10 - r * 2, row.ry - 8 - r, -2 - row.w / 2)} fill="none" stroke="#b47a46" strokeOpacity="0.45" strokeWidth="1" />
          {row.seats.map((m, i) => {
            const yes = m.v < yesShare;
            return (
              <g key={i}>
                <circle className="parl-vote" cx={CX + (m.x - CX) * ((row.rx - 10 - r * 2) / row.rx)} cy={m.y - 6 * m.s} r={1.3 * m.s} fill={yes ? '#3cff96' : '#ff5a4a'} style={{ animationDelay: `${m.d}s` }} />
                <g className={i % 5 === 2 ? 'parl-bob' : undefined} style={{ animationDelay: `${m.d}s` }}>
                  <rect x={m.x - 8 * m.s} y={m.y - 2 * m.s} width={16 * m.s} height={14 * m.s} rx={6 * m.s} fill="url(#parl-sil)" />
                  <circle cx={m.x} cy={m.y - 7 * m.s} r={4.6 * m.s} fill="url(#parl-sil)" />
                  <path d={`M${m.x - 3.6 * m.s} ${m.y - 10 * m.s} a${4.6 * m.s} ${4.6 * m.s} 0 0 1 ${7 * m.s} 0`} fill="none" stroke={glow} strokeOpacity="0.55" strokeWidth={0.9 * m.s} />
                </g>
              </g>
            );
          })}
          {r === 1 && (
            <g>
              <rect x="139" y="196" width="24" height="44" rx="9" fill="url(#parl-sil)" />
              <path d="M145 197 l6 12 l6 -12 Z" fill="#e6dfd4" opacity="0.85" />
              <path d="M150 200 h2 l1 9 l-2 3 l-2 -3 Z" fill={acc} />
              <circle cx="151" cy="188" r="7.5" fill="url(#parl-sil)" />
              <path d="M146 183 a7.5 7.5 0 0 1 11 0" fill="none" stroke={glow} strokeOpacity="0.8" strokeWidth="1.4" />
              <path d="M162 198 l9 4" stroke={glow} strokeOpacity="0.5" strokeWidth="1.2" />
              <g className="parl-arm">
                <path d="M160 202 L175 190 L179 177" fill="none" stroke="#1d1715" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="179.5" cy="174" r="3.4" fill="#2a2220" />
              </g>
            </g>
          )}
          <path d={arc(row.rx, row.ry, 8 * (0.78 + r * 0.24))} fill="none" stroke="url(#parl-bench)" strokeWidth={row.w + 4} />
          <path d={arc(row.rx, row.ry, 8 * (0.78 + r * 0.24) - (row.w + 4) / 2)} fill="none" stroke="#e0a868" strokeOpacity="0.35" strokeWidth="1" />
        </g>
      ))}
      <rect y="300" width="640" height="60" fill="#0c0705" opacity="0.5" />
    </svg>
  );
}
