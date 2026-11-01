import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import './public.css';

const N = 21;
const X0 = 318;
const X1 = 604;

/** Chart series per mood: falling (bad), rising (good) or drifting sideways (neutral). */
function series(mood: SceneArtProps['mood']): number[] {
  return Array.from({ length: N }, (_, i) => {
    const k = i / (N - 1);
    const wig = Math.sin(i * 1.7) * 7 + Math.sin(i * 0.6 + 1) * 4;
    if (mood === 'bad') return 92 + k * k * 84 + wig * (1 - k * 0.4);
    if (mood === 'good') return 178 - k * 82 + wig * 0.8;
    return 138 + wig * 0.9 - k * 4;
  });
}

const TICKS = [
  ['OIL', '+3.1'],
  ['GOLD', '+0.8'],
  ['BONDS', '4.62%'],
  ['FX', '-1.2'],
  ['TECH', '-3.4'],
  ['BANKS', '-2.1'],
  ['GRAIN', '+1.6'],
  ['FREIGHT', '+0.4'],
];

export default function EconTv({ a, mood }: SceneArtProps) {
  const uid = useSceneUid();
  const ys = series(mood);
  const step = (X1 - X0) / (N - 1);
  const pts = ys.map((y, i) => `${X0 + i * step},${y.toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  const area = `${line} L${X1},204 L${X0},204 Z`;
  const tone = mood === 'bad' ? '#ff4b4b' : mood === 'good' ? '#2fe39a' : '#f3c24c';
  const big = mood === 'bad' ? '-2.4%' : mood === 'good' ? '+1.8%' : '+0.3%';
  const arrow = mood === 'bad' ? 'M0 0 l7 10 l7 -10 Z' : 'M0 10 l7 -10 l7 10 Z';
  const lastY = ys[N - 1];
  const acc = a[0] === '#ffffff' ? a[1] : a[0];
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-econ_tv" aria-hidden>
      <defs>
        <linearGradient id={`econ-bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1626" />
          <stop offset="0.62" stopColor="#0a1322" />
          <stop offset="1" stopColor="#04070d" />
        </linearGradient>
        <linearGradient id={`econ-screen-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0c1a2e" />
          <stop offset="1" stopColor="#060d18" />
        </linearGradient>
        <linearGradient id={`econ-area-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tone} stopOpacity="0.38" />
          <stop offset="1" stopColor={tone} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`econ-glow-${uid}`} cx="0.62" cy="0.38" r="0.55">
          <stop offset="0" stopColor={tone} stopOpacity="0.22" />
          <stop offset="1" stopColor={tone} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`econ-desk-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2a40" />
          <stop offset="1" stopColor="#070c14" />
        </linearGradient>
        <linearGradient id={`econ-sil-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1a2230" />
          <stop offset="1" stopColor="#0a0e15" />
        </linearGradient>
        <linearGradient id={`econ-floor-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d1a2c" />
          <stop offset="1" stopColor="#03060b" />
        </linearGradient>
        <clipPath id={`econ-clip-${uid}`}>
          <rect x="176" y="54" width="440" height="168" rx="3" />
        </clipPath>
      </defs>

      <rect width="640" height="360" fill={`url(#econ-bg-${uid})`} />
      {/* LED wall strips and rig lights */}
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={i * 42 + 6} y="20" width="2" height="230" fill="#3fa9ff" opacity={i % 3 === 0 ? 0.22 : 0.08} />
      ))}
      <rect x="0" y="14" width="640" height="6" fill="#060a12" />
      {[60, 180, 300, 420, 540].map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy="30" rx="60" ry="22" fill="#9fd0ff" opacity="0.05" />
          <rect x={x - 8} y="18" width="16" height="9" rx="2" fill="#1c2737" />
          <circle className="econ-rig" cx={x} cy="27" r="2.6" fill="#dff1ff" style={{ animationDelay: `${i * 0.7}s` }} />
        </g>
      ))}
      <rect width="640" height="360" fill={`url(#econ-glow-${uid})`} />

      {/* Side monitor dressed in flag colours */}
      <g>
        <rect x="18" y="58" width="128" height="78" rx="4" fill="#05080e" />
        <rect x="22" y="62" width="120" height="70" rx="2" fill={`url(#econ-screen-${uid})`} />
        <rect x="22" y="62" width="40" height="70" fill={a[0]} opacity="0.85" />
        <rect x="62" y="62" width="40" height="70" fill={a[1]} opacity="0.85" />
        <rect x="102" y="62" width="40" height="70" fill={a[2]} opacity="0.85" />
        <rect x="22" y="62" width="120" height="70" fill="#000" opacity="0.35" />
        <rect className="econ-flicker" x="22" y="62" width="120" height="70" fill="#bfe0ff" opacity="0.05" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={32 + i * 18} y={118 - ((i * 37) % 40)} width="10" height={14 + ((i * 37) % 40)} fill="#fff" opacity="0.55" />
        ))}
      </g>

      {/* Big wall display */}
      <rect x="168" y="46" width="456" height="184" rx="7" fill="#03060b" />
      <rect x="176" y="54" width="440" height="168" rx="3" fill={`url(#econ-screen-${uid})`} />
      <g clipPath={`url(#econ-clip-${uid})`}>
        {[80, 105, 130, 155, 180].map((y) => (
          <line key={y} x1="306" x2="616" y1={y} y2={y} stroke="#5d7ea8" strokeOpacity="0.18" />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={318 + i * 28.6} x2={318 + i * 28.6} y1="66" y2="204" stroke="#5d7ea8" strokeOpacity="0.1" />
        ))}
        {/* Candlesticks behind the line */}
        {ys.slice(1).map((y, i) => {
          const prev = ys[i];
          const up = y < prev;
          const x = X0 + (i + 1) * step;
          const top = Math.min(y, prev);
          return (
            <g key={i} opacity="0.55">
              <line x1={x - step / 2} x2={x - step / 2} y1={top - 6 - (i % 3) * 2} y2={top + Math.abs(y - prev) + 6} stroke={up ? '#2fe39a' : '#ff4b4b'} strokeWidth="1" />
              <rect x={x - step / 2 - 3.5} y={top} width="7" height={Math.max(2, Math.abs(y - prev))} fill={up ? '#2fe39a' : '#ff4b4b'} />
            </g>
          );
        })}
        <path className="econ-area" d={area} fill={`url(#econ-area-${uid})`} />
        <path className="econ-line" style={{ color: tone }} d={line} pathLength={1} fill="none" stroke={tone} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
        <g className="econ-dot">
          <circle cx={X1} cy={lastY} r="9" fill={tone} opacity="0.25" className="econ-ping" />
          <circle cx={X1} cy={lastY} r="3.8" fill="#fff" stroke={tone} strokeWidth="2" />
        </g>

        {/* Headline numbers */}
        <rect x="176" y="54" width="132" height="150" fill="#04101f" opacity="0.6" />
        <rect x="176" y="54" width="132" height="4" fill={tone} />
        <text x="190" y="88" className="econ-label" fontSize="22" fill="#cfe2ff" letterSpacing="2">GDP</text>
        <path d={arrow} transform="translate(252 74)" fill={tone} />
        <text x="188" y="136" className="econ-label" fontSize="38" fill={tone}>{big}</text>
        <rect x="190" y="150" width="104" height="2" fill="#5d7ea8" opacity="0.4" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x="190" y={160 + i * 11} width={86 - i * 22} height="5" rx="2" fill="#7f9cc4" opacity={0.5 - i * 0.12} />
        ))}

        {/* Stock ticker strip */}
        <rect x="176" y="204" width="440" height="18" fill="#02060c" />
        <rect x="176" y="204" width="440" height="1" fill={tone} opacity="0.6" />
        <g className="econ-tick">
          {[...TICKS, ...TICKS].map(([name, v], i) => (
            <text key={i} x={186 + i * 70} y="217" fontSize="9" className="econ-label" fill="#d8e6f8">
              {name} <tspan fill={v.startsWith('-') ? '#ff6b6b' : '#3ff0a8'}>{v}</tspan>
            </text>
          ))}
        </g>
        <rect className="econ-sweep" x="176" y="54" width="80" height="168" fill="#fff" opacity="0.05" />
      </g>
      <rect x="168" y="46" width="456" height="2" fill="#7fb4ff" opacity="0.25" />

      {/* Glossy floor with screen reflection */}
      <rect x="0" y="242" width="640" height="118" fill={`url(#econ-floor-${uid})`} />
      <rect x="176" y="246" width="440" height="40" fill={tone} opacity="0.07" />
      <g transform="translate(0 488) scale(1 -1)" opacity="0.16" clipPath={`url(#econ-clip-${uid})`}>
        <path d={area} fill={`url(#econ-area-${uid})`} />
        <path d={line} fill="none" stroke={tone} strokeWidth="3" />
      </g>
      <rect x="0" y="242" width="640" height="1" fill="#6ea6e8" opacity="0.25" />

      {/* Anchor */}
      <g>
        <path d="M74 254 V214 q2 -26 30 -30 l6 -2 l6 2 q28 4 30 30 V254 Z" fill={`url(#econ-sil-${uid})`} />
        <path d="M103 185 l7 20 l7 -20 l-7 4 Z" fill="#dfe7f2" opacity="0.9" />
        <path d="M108.6 190 h2.8 l1.6 15 l-3 4 l-3 -4 Z" fill={acc} />
        <path d="M117 184 q27 4 29 30" fill="none" stroke={tone} strokeOpacity="0.55" strokeWidth="1.6" />
        <path d="M103 185 l-6 16 M117 185 l6 16" stroke="#05080d" strokeWidth="2" />
        <rect x="105" y="172" width="10" height="13" rx="3" fill="#121822" />
        <g className="econ-head">
          <ellipse cx="110" cy="160" rx="11.5" ry="13.5" fill={`url(#econ-sil-${uid})`} />
          <path d="M98 160 q-2 -18 12 -19 q13 0 13 15 q-3 -8 -13 -9 q-8 0 -12 13 Z" fill="#05080c" />
          <path d="M117 149 q6 4 4.5 14" fill="none" stroke={tone} strokeOpacity="0.75" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      </g>
      {/* Anchor desk */}
      <path d="M8 236 Q160 222 300 236 L292 300 Q160 286 16 300 Z" fill={`url(#econ-desk-${uid})`} />
      <path d="M8 236 Q160 222 300 236" fill="none" stroke={tone} strokeWidth="2" className="econ-edge" />
      <path d="M16 262 Q160 250 294 262" fill="none" stroke={tone} strokeOpacity="0.35" strokeWidth="5" />
      <path d="M16 262 Q160 250 294 262" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" />
      <rect x="44" y="226" width="34" height="6" rx="1" fill="#e9eef6" opacity="0.6" transform="rotate(-4 61 229)" />
      <rect x="196" y="221" width="22" height="14" rx="1.5" fill="#0c1422" stroke="#7fb4ff" strokeOpacity="0.4" />
      <rect x="198" y="223" width="18" height="10" fill={tone} opacity="0.35" />
      <rect y="300" width="640" height="60" fill="#02050a" opacity="0.6" />
    </svg>
  );
}
