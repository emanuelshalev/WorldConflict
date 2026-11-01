import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import './public.css';

/** Background crowd behind the rope line: fixed layout, a few holding phones or flags. */
const CROWD = Array.from({ length: 30 }, (_, i) => ({
  x: -6 + i * 22.5 + ((i * 7) % 5) * 2,
  y: 196 + ((i * 11) % 4) * 4,
  s: 0.9 + ((i * 13) % 5) * 0.06,
  prop: i % 4 === 1 ? 'phone' : i % 5 === 3 ? 'flag' : '',
  d: ((i * 3) % 7) * 0.6,
}));

const SKY = {
  good: ['#f6a65a', '#ffd9a0', '#ffc27a', '#ffe6b0'],
  neutral: ['#8fb4d8', '#e6dccb', '#ffe2b8', '#fff2da'],
  bad: ['#5c6878', '#a3abb5', '#c6ccd2', '#d8dde2'],
} as const;

export default function FieldVisit({ a, mood }: SceneArtProps) {
  const uid = useSceneUid();
  const [top, low, sun, rim] = SKY[mood];
  const acc = a[0] === '#ffffff' ? a[1] : a[0];
  const sil = mood === 'bad' ? '#20262e' : '#2a2224';
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-field_visit" aria-hidden>
      <defs>
        <linearGradient id={`fv-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.75" stopColor={low} />
        </linearGradient>
        <radialGradient id={`fv-sun-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbe8" stopOpacity="1" />
          <stop offset="0.25" stopColor={sun} stopOpacity="0.8" />
          <stop offset="1" stopColor={sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`fv-far-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mood === 'bad' ? '#7d8794' : '#b88a78'} />
          <stop offset="1" stopColor={mood === 'bad' ? '#9aa3ad' : '#d9a888'} />
        </linearGradient>
        <linearGradient id={`fv-near-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mood === 'bad' ? '#4a5462' : '#6e4a44'} />
          <stop offset="1" stopColor={mood === 'bad' ? '#3a424e' : '#4a302e'} />
        </linearGradient>
        <linearGradient id={`fv-coat-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#14161c" />
          <stop offset="0.7" stopColor="#262a34" />
          <stop offset="1" stopColor="#3a3a44" />
        </linearGradient>
        <linearGradient id={`fv-ground-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mood === 'bad' ? '#555d68' : '#7a5a4a'} />
          <stop offset="1" stopColor="#1a1416" />
        </linearGradient>
        <linearGradient id={`fv-haze-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={low} stopOpacity="0" />
          <stop offset="1" stopColor={low} stopOpacity="0.7" />
        </linearGradient>
      </defs>

      <rect width="640" height="360" fill={`url(#fv-sky-${uid})`} />
      {mood !== 'bad' && <circle className="fv-sun" cx="470" cy="118" r="120" fill={`url(#fv-sun-${uid})`} />}
      {mood === 'bad' &&
        [80, 300, 520].map((x, i) => <ellipse key={x} className="fv-cloud" cx={x} cy={50 + i * 12} rx="160" ry="34" fill="#8c95a1" opacity="0.5" />)}

      {/* Far skyline in haze */}
      <path d="M0 200 V120 h40 v-20 h30 v34 h26 v-50 h12 v-10 h8 v10 h14 v66 h40 v-30 h36 v44 h30 V96 h44 v40 h22 v-24 h40 v56 h30 v-70 h18 v-12 h6 v12 h20 v84 h36 v-46 h40 v30 h34 v-56 h44 v84 h30 V200 Z" fill={`url(#fv-far-${uid})`} />
      <rect y="120" width="640" height="90" fill={`url(#fv-haze-${uid})`} />
      {/* Near buildings both sides with windows */}
      <path d="M0 230 V60 h70 v20 h40 V230 Z" fill={`url(#fv-near-${uid})`} />
      <path d="M640 230 V70 h-60 v-14 h-44 V230 Z" fill={`url(#fv-near-${uid})`} />
      {Array.from({ length: 24 }, (_, i) => {
        const left = i < 12;
        const col = i % 3;
        const row = Math.floor((i % 12) / 3);
        const x = left ? 12 + col * 30 : 548 + col * 30;
        return <rect key={i} x={x} y={92 + row * 32} width="16" height="20" fill={mood === 'bad' ? '#8aa0b8' : '#ffd79a'} opacity={(i * 7) % 5 === 0 ? 0.65 : 0.22} />;
      })}
      {/* Bunting across the street */}
      <path d="M100 86 Q320 128 540 80" fill="none" stroke="#2a2224" strokeWidth="1" />
      {Array.from({ length: 15 }, (_, i) => {
        const t = (i + 0.5) / 15;
        const x = 100 + t * 440;
        const y = 86 + 4 * t * (1 - t) * 38 - t * 6;
        return <path key={i} className="fv-bunt" d={`M${x - 7} ${y} h14 l-7 12 Z`} fill={a[i % 3]} style={{ animationDelay: `${i * 0.2}s` }} />;
      })}

      <rect y="226" width="640" height="134" fill={`url(#fv-ground-${uid})`} />

      {/* Back crowd row, smaller and hazier */}
      {Array.from({ length: 40 }, (_, i) => (
        <g key={i} opacity="0.55">
          <circle cx={i * 16.5 + 6} cy={190 + ((i * 5) % 3) * 3} r="4.5" fill="#5a4646" />
          <rect x={i * 16.5} y={194 + ((i * 5) % 3) * 3} width="12" height="30" rx="5" fill="#5a4646" />
        </g>
      ))}
      {/* Crowd behind the barrier */}
      {CROWD.map((c, i) => (
        <g key={i} className="fv-bob" style={{ animationDelay: `${c.d}s` }}>
          {c.prop === 'flag' && (
            <g className="fv-flag">
              <line x1={c.x + 7} x2={c.x + 7} y1={c.y - 6} y2={c.y - 44} stroke="#3a2e2a" strokeWidth="1.2" />
              <rect x={c.x + 7} y={c.y - 44} width="9" height="5" fill={a[0]} />
              <rect x={c.x + 7} y={c.y - 39} width="9" height="5" fill={a[1]} />
              <rect x={c.x + 7} y={c.y - 34} width="9" height="5" fill={a[2]} />
            </g>
          )}
          <rect x={c.x - 9 * c.s} y={c.y} width={18 * c.s} height={40} rx={7 * c.s} fill={i % 3 ? '#3b2f30' : '#46393a'} opacity="0.92" />
          <circle cx={c.x} cy={c.y - 6 * c.s} r={6 * c.s} fill={i % 3 ? '#3b2f30' : '#46393a'} />
          <path d={`M${c.x + 2} ${c.y - 11 * c.s} a${6 * c.s} ${6 * c.s} 0 0 1 ${4 * c.s} ${5 * c.s}`} fill="none" stroke={rim} strokeOpacity="0.8" strokeWidth="1.2" />
          {c.prop === 'phone' && (
            <g>
              <line x1={c.x + 5} y1={c.y + 6} x2={c.x + 9} y2={c.y - 14} stroke="#3b2f30" strokeWidth="3.5" strokeLinecap="round" />
              <rect x={c.x + 6} y={c.y - 24} width="6" height="10" rx="1" fill="#0c0c10" />
              <rect className="fv-phone" x={c.x + 6.8} y={c.y - 23} width="4.4" height="8" fill="#cfe6ff" style={{ animationDelay: `${c.d * 1.7}s` }} />
            </g>
          )}
        </g>
      ))}
      {/* Barrier */}
      <rect x="0" y="232" width="640" height="3" fill="#b9b2a8" opacity="0.8" />
      <rect x="0" y="252" width="640" height="2" fill="#b9b2a8" opacity="0.6" />
      {Array.from({ length: 33 }, (_, i) => (
        <rect key={i} x={i * 20} y="232" width="1.5" height="28" fill="#a9a29a" opacity="0.6" />
      ))}

      {/* Security agent, a step behind */}
      <g>
        <path d="M206 304 L210 186 q2 -16 18 -18 h6 q16 2 18 18 L256 304 Z" fill="#15171c" />
        <path d="M226 168 l5 14 l5 -14 Z" fill="#d8dbe0" opacity="0.7" />
        <path d="M230 172 h2 l1 16 l-2 3 l-2 -3 Z" fill="#050608" />
        <rect x="226" y="156" width="10" height="13" rx="3" fill="#1b1d23" />
        <ellipse cx="231" cy="148" rx="10" ry="12" fill="#1b1d23" />
        <path d="M221 146 q0 -14 10 -14 q10 0 10 12 q-4 -4 -10 -4 q-6 0 -10 6 Z" fill="#0b0c0f" />
        <rect x="223" y="146" width="16" height="4" rx="2" fill="#050608" />
        <path d="M239 140 q3 4 2 10" fill="none" stroke={rim} strokeWidth="1.2" strokeOpacity="0.7" />
        <path d="M222 152 q-3 6 -1 16" fill="none" stroke="#cfd6de" strokeWidth="0.8" />
      </g>

      {/* The leader, in a long coat */}
      <g className="fv-leader">
        <path d="M252 310 L258 170 q2 -26 26 -30 h8 q26 4 28 30 L322 310 Z" fill={`url(#fv-coat-${uid})`} />
        <path d="M278 141 l10 22 l10 -22 l-10 6 Z" fill="#e9e6e0" />
        <path d="M285 150 h6 l2 40 l-5 6 l-5 -6 Z" fill={acc} />
        <path d="M276 141 l-8 40 l18 -26 Z M300 141 l8 40 l-18 -26 Z" fill="#30333d" />
        <path d="M318 172 q-2 -28 -26 -32" fill="none" stroke={rim} strokeWidth="2" strokeOpacity="0.9" />
        <path d="M318 172 L322 300" stroke={rim} strokeWidth="1.5" strokeOpacity="0.55" />
        <rect x="282" y="126" width="12" height="16" rx="4" fill={sil} />
        <ellipse cx="289" cy="116" rx="13" ry="15" fill={sil} />
        <path d="M276 114 q0 -20 14 -20 q13 0 14 14 q-6 -6 -14 -6 q-8 0 -14 12 Z" fill="#141014" />
        <path d="M300 106 q4 6 2 14" fill="none" stroke={rim} strokeWidth="2" strokeLinecap="round" />
        <rect x="294" y="196" width="10" height="3" rx="1" fill={acc} opacity="0.85" />
        <g className="fv-wave">
          <path d="M262 160 L246 132 L242 108" fill="none" stroke="#1c1f27" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M241 112 L243 104" stroke="#e9e6e0" strokeWidth="9" strokeLinecap="round" />
          <ellipse cx="242" cy="96" rx="5.5" ry="7" fill={sil} />
          <path d="M246 92 q2 4 0 8" fill="none" stroke={rim} strokeWidth="1.5" />
        </g>
      </g>

      {/* Reporter with the foam-windshield mic */}
      <g>
        <path d="M384 310 L388 182 q2 -22 22 -24 h4 q22 2 22 24 L440 310 Z" fill="#3a2a2e" />
        <path d="M434 180 q0 -20 -20 -22" fill="none" stroke={rim} strokeWidth="2" strokeOpacity="0.8" />
        <rect x="406" y="146" width="10" height="14" rx="3" fill="#2a2024" />
        <ellipse cx="411" cy="135" rx="12" ry="14" fill="#2a2024" />
        <path d="M398 136 q-4 -24 14 -24 q16 0 14 24 q2 14 6 26 q-10 2 -14 -10 q-2 -14 -6 -16 q-6 -2 -10 6 q-2 10 -8 16 q-2 -10 4 -22 Z" fill="#120c0e" />
        <g className="fv-mic">
          <path d="M394 178 L360 160 L338 152" fill="none" stroke="#2f2226" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="337" y1="151" x2="322" y2="146" stroke="#111" strokeWidth="4" strokeLinecap="round" />
          <rect x="326" y="142" width="9" height="10" rx="1.5" fill="#0d0d12" transform="rotate(18 330 147)" />
          <rect x="328" y="145" width="5" height="3" fill="#fff" opacity="0.85" transform="rotate(18 330 147)" />
          <ellipse cx="316" cy="143" rx="9" ry="8" fill="#d42a2a" />
          <ellipse cx="313" cy="140" rx="4" ry="3" fill="#ff8a7a" opacity="0.6" />
        </g>
      </g>

      {/* Cameraman, foreground left, out of focus */}
      <g opacity="0.97">
        <path d="M40 360 L52 196 q4 -30 40 -34 h20 q34 4 38 34 L160 360 Z" fill="#101114" />
        <circle cx="104" cy="140" r="18" fill="#121318" />
        <path d="M86 136 q2 -20 18 -20 q16 0 18 18" fill="#08090b" />
        <rect x="94" y="128" width="88" height="34" rx="4" fill="#17191f" />
        <rect x="94" y="128" width="88" height="5" rx="2" fill="#2c2f38" />
        <rect x="182" y="132" width="26" height="26" rx="3" fill="#0b0c10" />
        <circle cx="210" cy="145" r="12" fill="#0b0c10" />
        <circle cx="211" cy="145" r="8" fill="#1f2a3a" />
        <circle cx="213" cy="142" r="3" fill="#9ec4ff" opacity="0.6" />
        <rect x="120" y="116" width="40" height="12" rx="2" fill="#0d0e12" />
        <circle className="fv-tally" cx="172" cy="122" r="2.6" fill="#ff2a2a" />
        <path d="M150 160 q12 -4 22 6" stroke="#0e0f12" strokeWidth="10" strokeLinecap="round" fill="none" />
      </g>

      {mood === 'good' && <rect width="640" height="360" fill="#ffb060" opacity="0.08" className="fv-glow" />}
      <rect y="300" width="640" height="60" fill="#120c0e" opacity="0.45" />
    </svg>
  );
}
