import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import './public.css';

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Most saturated flag colour, so the party colour is never plain white. */
function strong(c: [string, string, string]): string {
  let best = c[0];
  let score = -1;
  for (const hex of c) {
    const [r, g, b] = rgb(hex);
    const s = Math.max(r, g, b) - Math.min(r, g, b);
    if (s > score) {
      score = s;
      best = hex;
    }
  }
  return best;
}

const CX = 320;
const CY = 190;

/** Seats of the hemicycle, ordered left to right by angle. */
const SEATS = (() => {
  const out: { x: number; y: number; t: number }[] = [];
  for (let k = 0; k < 7; k++) {
    const r = 52 + k * 11;
    const n = Math.round((Math.PI * r) / 10.4);
    for (let i = 0; i < n; i++) {
      const t = Math.PI - (Math.PI * (i + 0.5)) / n;
      out.push({ x: CX + r * Math.cos(t), y: CY - r * Math.sin(t), t });
    }
  }
  return out.sort((p, q) => q.t - p.t);
})();

const SHARE = { good: [0.58, 0.31], neutral: [0.48, 0.44], bad: [0.35, 0.56] } as const;

/** Confetti flakes: fixed pseudo-random layout from a tiny LCG. */
const CONFETTI = (() => {
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 46 }, () => ({ x: r() * 640, d: r() * 6, w: 3 + r() * 4, rot: r() * 180, c: Math.floor(r() * 3), dur: 5 + r() * 4 }));
})();

export default function Election({ a, mood }: SceneArtProps) {
  const uid = useSceneUid();
  const party = strong(a);
  const [pr, pg, pb] = rgb(party);
  const reddish = pr > pb + 40 && pr > pg;
  const rival = reddish ? '#3d7be0' : '#e0473d';
  const [sa, sb] = SHARE[mood];
  const total = SEATS.length;
  const seatsA = Math.round(total * sa);
  const seatsB = Math.round(total * sb);
  const shown = Math.round(650 * sa);
  const key = mood === 'bad' ? '#7aa0ff' : mood === 'good' ? '#ffd27a' : '#c9b6ff';
  const lum = (pr * 299 + pg * 587 + pb * 114) / 1000;
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-election" aria-hidden>
      <defs>
        <linearGradient id={`elec-bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#120f2a" />
          <stop offset="0.6" stopColor="#0d0c22" />
          <stop offset="1" stopColor="#05050d" />
        </linearGradient>
        <radialGradient id={`elec-key-${uid}`} cx="0.5" cy="0.35" r="0.55">
          <stop offset="0" stopColor={key} stopOpacity="0.3" />
          <stop offset="1" stopColor={key} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`elec-screen-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141a3a" />
          <stop offset="1" stopColor="#090c1e" />
        </linearGradient>
        <linearGradient id={`elec-glass-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c8d6ff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#c8d6ff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#c8d6ff" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`elec-sil-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0b0b18" />
          <stop offset="1" stopColor="#1f1f38" />
        </linearGradient>
        <radialGradient id={`elec-stage-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={party} stopOpacity="0.35" />
          <stop offset="1" stopColor={party} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="640" height="360" fill={`url(#elec-bg-${uid})`} />
      {/* Video wall tiles */}
      {Array.from({ length: 48 }, (_, i) => {
        const cx = i % 12;
        const cy = Math.floor(i / 12);
        return (
          <rect key={i} className="elec-tile" x={8 + cx * 53} y={18 + cy * 56} width="49" height="52" rx="2" fill={i % 7 === 3 ? party : '#262b5e'} opacity={i % 7 === 3 ? 0.1 : 0.16} style={{ animationDelay: `${(i * 0.37) % 6}s` }} />
        );
      })}
      <rect width="640" height="360" fill={`url(#elec-key-${uid})`} />
      {[110, 530].map((x, i) => (
        <polygon key={x} className="elec-beam" points={`${x - 6},0 ${x + 6},0 ${x + 90 - i * 180},300 ${x - 40 - i * 100},300`} fill={key} opacity="0.07" style={{ animationDelay: `${i * 2}s` }} />
      ))}

      {/* Stage floor */}
      <rect y="236" width="640" height="124" fill="#07071a" />
      <ellipse cx="320" cy="262" rx="250" ry="34" fill={`url(#elec-stage-${uid})`} />
      <ellipse cx="320" cy="262" rx="200" ry="26" fill="none" stroke={party} strokeOpacity="0.5" />
      <ellipse className="elec-ring" cx="320" cy="262" rx="140" ry="18" fill="none" stroke={party} strokeOpacity="0.8" strokeWidth="1.5" />

      {/* Seat chart screen */}
      <rect x="168" y="44" width="304" height="176" rx="8" fill="#04050d" />
      <rect x="174" y="50" width="292" height="164" rx="5" fill={`url(#elec-screen-${uid})`} />
      <rect x="174" y="50" width="292" height="18" rx="3" fill="#000" opacity="0.35" />
      <circle className="elec-live" cx="186" cy="59" r="3" fill="#ff3b3b" />
      <text x="194" y="62.5" fontSize="9" className="elec-label" fill="#d6dcff" letterSpacing="2">PROJECTION</text>
      <rect x="400" y="54" width="58" height="10" rx="2" fill={party} opacity="0.9" />
      <rect x="400" y="54" width={58 * (seatsB / (seatsA + seatsB))} height="10" rx="2" fill={rival} transform="translate(58 0) scale(-1 1)" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      <line x1={CX} x2={CX} y1="70" y2="118" stroke="#fff" strokeOpacity="0.55" strokeDasharray="3 3" />
      {SEATS.map((p, i) => {
        const fill = i < seatsA ? party : i >= total - seatsB ? rival : '#59607e';
        return (
          <circle key={i} className="elec-seat" cx={p.x} cy={p.y} r="3.7" fill={fill} stroke={lum > 200 && i < seatsA ? '#000' : 'none'} strokeOpacity="0.3" style={{ animationDelay: `${(i / total) * 2.2}s` }} />
        );
      })}
      <text x={CX} y="180" textAnchor="middle" fontSize="30" className="elec-label" fill="#fff">{shown}</text>
      <text x={CX} y="196" textAnchor="middle" fontSize="8" className="elec-label" fill="#aab3e0" letterSpacing="3">SEATS</text>
      <rect x="174" y="200" width="292" height="14" fill={party} opacity="0.85" />
      <rect x="174" y="200" width="292" height="14" fill="#000" opacity="0.3" />
      <text x="320" y="210.5" textAnchor="middle" fontSize="8.5" className="elec-label" fill="#fff" letterSpacing="2.5">
        {mood === 'bad' ? 'MAJORITY LOST' : mood === 'good' ? 'MAJORITY WON' : 'TOO CLOSE TO CALL'}
      </text>
      <rect className="elec-sweep" x="174" y="50" width="60" height="164" fill="#fff" opacity="0.05" />

      {/* Ballot box with a falling ballot */}
      <g>
        <ellipse cx="116" cy="280" rx="70" ry="10" fill="#000" opacity="0.5" />
        <g className="elec-ballot">
          <rect x="102" y="150" width="28" height="36" rx="1.5" fill="#f4f1ea" />
          <path d="M108 160 l8 8 M116 160 l-8 8" stroke="#1a1a1a" strokeWidth="2" />
          <rect x="108" y="174" width="16" height="2" fill="#999" />
          <rect x="108" y="179" width="12" height="2" fill="#bbb" />
        </g>
        <path d="M58 206 L174 206 L168 286 L64 286 Z" fill="#9fb4ff" opacity="0.12" />
        <path d="M58 206 L174 206 L168 286 L64 286 Z" fill={`url(#elec-glass-${uid})`} stroke="#d8e2ff" strokeOpacity="0.45" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={74 + i * 17} y={256 + (i % 2) * 6} width="20" height="26" rx="1" fill="#efeadf" opacity="0.6" transform={`rotate(${i * 13 - 25} ${84 + i * 17} 269)`} />
        ))}
        <path d="M54 198 L178 198 L174 208 L58 208 Z" fill="#dfe6ff" opacity="0.6" />
        <rect x="98" y="200" width="36" height="4" rx="2" fill="#0a0a14" />
        <circle cx="116" cy="236" r="12" fill={party} opacity="0.85" />
        <circle cx="116" cy="236" r="12" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" />
        <path d="M110 236 l4 4 l8 -9" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M62 210 L68 282" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
      </g>

      {/* Analyst at the touch wall */}
      <g>
        <path d="M498 300 V214 q0 -22 22 -24 h8 q22 2 22 24 V300 Z" fill={`url(#elec-sil-${uid})`} />
        <path d="M520 190 l4 14 l4 -14 Z" fill="#e8e8f2" opacity="0.8" />
        <path d="M549 212 q2 -20 -21 -22" fill="none" stroke={key} strokeOpacity="0.6" strokeWidth="1.5" />
        <rect x="519" y="178" width="10" height="13" rx="3" fill="#161628" />
        <ellipse cx="524" cy="166" rx="11" ry="13" fill={`url(#elec-sil-${uid})`} />
        <path d="M513 165 q0 -17 12 -17 q12 0 11 13 q-5 -7 -12 -7 q-7 1 -11 11 Z" fill="#07070f" />
        <g className="elec-arm">
          <path d="M504 206 L478 186 L462 176" fill="none" stroke="#141426" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="459" cy="174" r="3.6" fill="#2a2a44" />
        </g>
      </g>

      {/* Confetti on a good night */}
      {mood === 'good' &&
        CONFETTI.map((c, i) => (
          <rect key={i} className="elec-confetti" x={c.x} y="-12" width={c.w * 1.3} height={c.w * 2.2} fill={c.c === 0 ? a[0] : c.c === 1 ? a[1] : a[2]} transform={`rotate(${c.rot} ${c.x} -10)`} style={{ animationDelay: `-${c.d}s`, animationDuration: `${c.dur}s` }} />
        ))}
      <rect y="300" width="640" height="60" fill="#04040b" opacity="0.55" />
    </svg>
  );
}
