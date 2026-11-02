import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import NationFlag from './Flag';
import './security.css';

/** Analyst seen from behind: chair back, shoulders, head with headset, rim lit by screens. */
function Analyst({ x, y, s }: { x: number; y: number; s: number }) {
  const uid = useSceneUid();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-22 40 C-22 8 -15 0 0 0 C15 0 22 8 22 40 Z" fill={`url(#cv-body-${uid})`} />
      <circle cx="0" cy="-11" r="10" fill={`url(#cv-body-${uid})`} />
      <path d="M-11 -12 C-11 -27 11 -27 11 -12" fill="none" stroke="#0b1520" strokeWidth="2.6" />
      <rect x="-13" y="-15" width="4" height="8" rx="2" fill="#13202c" />
      <rect x="9" y="-15" width="4" height="8" rx="2" fill="#13202c" />
      <path d="M-9 -19 C-6 -22 6 -22 9 -19" fill="none" stroke={`url(#cv-rimg-${uid})`} strokeWidth="1.4" />
      <path d="M-17 4 C-10 0 10 0 17 4" fill="none" stroke={`url(#cv-rimg-${uid})`} strokeWidth="1.6" />
      <rect x="-26" y="24" width="52" height="22" rx="5" fill="#04080d" />
    </g>
  );
}

function Monitor({ x, y, w, h, i }: { x: number; y: number; w: number; h: number; i: number }) {
  const uid = useSceneUid();
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="1.5" fill="#06121c" stroke="#0e2a3a" />
      <rect className="cv-flick" x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} fill={`url(#cv-mon-${uid})`} style={{ animationDelay: `${(i * 1.3) % 5}s` }} />
      <path d={`M${x + 4} ${y + h * 0.65} l${w * 0.2} ${-h * 0.2} l${w * 0.15} ${h * 0.1} l${w * 0.25} ${-h * 0.3}`} fill="none" stroke="#7af3ff" strokeOpacity="0.7" strokeWidth="0.9" />
      <rect x={x + w / 2 - 2} y={y + h} width="4" height="5" fill="#0b1a26" />
    </g>
  );
}

const BLOCKS: Array<[number, number, number, number]> = [
  [236, 64, 30, 18], [274, 60, 18, 26], [300, 72, 34, 14], [344, 58, 22, 22], [372, 70, 30, 16], [244, 104, 24, 22],
  [282, 112, 40, 20], [352, 100, 20, 30], [384, 112, 22, 18], [236, 140, 36, 16], [300, 146, 26, 14], [338, 140, 44, 18],
];

export default function Covert({ b, mood }: SceneArtProps) {
  const uid = useSceneUid();
  const bad = mood === 'bad';
  const good = mood === 'good';
  const glow = bad ? '#ff5a5a' : '#36d6f0';
  const lock = bad ? '#ff4040' : good ? '#5dffa0' : '#ffd166';
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-covert" aria-hidden>
      <defs>
        <linearGradient id={`cv-room-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03070c" />
          <stop offset="0.5" stopColor="#061019" />
          <stop offset="1" stopColor="#020508" />
        </linearGradient>
        <radialGradient id={`cv-spill-${uid}`} gradientUnits="userSpaceOnUse" cx="320" cy="110" r="330">
          <stop offset="0" stopColor={glow} stopOpacity="0.28" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`cv-scr-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a2a3c" />
          <stop offset="1" stopColor="#05141f" />
        </linearGradient>
        <linearGradient id={`cv-mon-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={glow} stopOpacity="0.55" />
          <stop offset="1" stopColor="#0a3a52" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id={`cv-body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f1c28" />
          <stop offset="1" stopColor="#03070b" />
        </linearGradient>
        <linearGradient id={`cv-rimg-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={glow} stopOpacity="0" />
          <stop offset="0.5" stopColor={glow} stopOpacity="0.9" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`cv-folder-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9a46a" />
          <stop offset="1" stopColor="#6e5432" />
        </linearGradient>
        <pattern id={`cv-dots-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1" fill={glow} />
        </pattern>
        <filter id={`cv-grain-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="7" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feBlend in="SourceGraphic" in2="g" mode="multiply" />
        </filter>
        <filter id={`cv-blur-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id={`cv-main-${uid}`}>
          <rect x="222" y="48" width="196" height="122" />
        </clipPath>
      </defs>

      <rect width="640" height="360" fill={`url(#cv-room-${uid})`} />
      <rect x="40" y="34" width="560" height="168" rx="4" fill="#02060a" />
      <rect x="40" y="34" width="560" height="168" rx="4" fill={glow} opacity="0.12" filter={`url(#cv-blur-${uid})`} />

      {/* left: dot-matrix world map with intercept arcs */}
      <rect x="54" y="48" width="158" height="74" fill={`url(#cv-scr-${uid})`} />
      <g fill={`url(#cv-dots-${uid})`} opacity="0.7">
        <path d="M62 62 C80 54 100 58 104 70 C100 86 84 92 76 104 C66 96 58 80 62 62 Z" />
        <path d="M110 58 C140 52 180 56 204 66 C200 84 176 92 160 102 C140 98 120 90 112 76 Z" />
        <path d="M150 104 C164 100 180 104 184 114 L160 118 Z" />
      </g>
      <g fill="none" stroke={glow} strokeWidth="1" strokeDasharray="3 3">
        <path className="cv-arc" d="M84 80 Q120 40 168 76" />
        <path className="cv-arc" d="M168 76 Q180 96 172 110" style={{ animationDelay: '1.5s' }} />
      </g>
      <circle className="cv-blip" cx="168" cy="76" r="3" fill={lock} />
      {/* left lower: signal intercept list */}
      <rect x="54" y="128" width="158" height="62" fill={`url(#cv-scr-${uid})`} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x="62" y={136 + i * 10} width={[60, 44, 72, 38, 54][i]} height="4" fill={glow} opacity={i === 2 ? 0.9 : 0.4} />
          <rect x="150" y={136 + i * 10} width="52" height="4" fill={glow} opacity="0.2" />
        </g>
      ))}
      <rect className="cv-cursor" x="62" y="134" width="140" height="8" fill={glow} opacity="0.12" />

      {/* centre: satellite feed of the target, grainy, with the reticle */}
      <g clipPath={`url(#cv-main-${uid})`}>
        <g className="cv-pan" filter={`url(#cv-grain-${uid})`}>
          <rect x="200" y="30" width="240" height="160" fill="#3c4a46" />
          <path d="M200 96 L440 88 M292 30 L300 190 M200 132 L440 136" stroke="#8a948c" strokeWidth="5" />
          {BLOCKS.map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x + 3} y={y + 3} width={w} height={h} fill="#1c2420" />
              <rect x={x} y={y} width={w} height={h} fill={i % 3 ? '#a8aea4' : '#7c8680'} />
            </g>
          ))}
          <circle cx="398" cy="150" r="9" fill="#2c3a30" />
        </g>
        <rect x="222" y="48" width="196" height="122" fill={glow} opacity="0.12" />
        <path d="M222 109 H418 M320 48 V170" stroke={lock} strokeOpacity="0.35" strokeWidth="0.8" />
      </g>
      <g className="cv-reticle" stroke={lock} fill="none" strokeWidth="1.6">
        <circle cx="354" cy="111" r="16" />
        <path d="M330 87 h8 M330 87 v8 M378 87 h-8 M378 87 v8 M330 135 h8 M330 135 v-8 M378 135 h-8 M378 135 v-8" />
      </g>
      <rect x="222" y="48" width="196" height="122" fill="none" stroke={glow} strokeOpacity="0.5" />
      <NationFlag colors={b} x={226} y={50} w={22} h={14} />
      <rect x="226" y="156" width="54" height="8" fill="#000" opacity="0.5" />
      <circle className="cv-rec" cx="231" cy="160" r="2.2" fill="#ff3b30" />

      {/* right: link-analysis network and waveform */}
      <rect x="428" y="48" width="158" height="74" fill={`url(#cv-scr-${uid})`} />
      <g stroke={glow} strokeOpacity="0.5" strokeWidth="0.9" fill="none">
        <path d="M460 70 L500 84 L540 64 M500 84 L520 108 L560 96 M500 84 L470 104" />
      </g>
      {[[460, 70], [540, 64], [520, 108], [560, 96], [470, 104]].map(([x, y]) => (
        <circle key={`${x}`} cx={x} cy={y} r="3" fill={glow} opacity="0.8" />
      ))}
      <circle className="cv-blip" cx="500" cy="84" r="5" fill={lock} />
      <rect x="428" y="128" width="158" height="62" fill={`url(#cv-scr-${uid})`} />
      <path className="cv-wave" d="M432 160 l6 -10 l6 18 l6 -24 l6 30 l6 -20 l6 12 l6 -6 l6 4 l6 -14 l6 22 l6 -16 l6 8 l6 -4 l6 10 l6 -18 l6 12 l6 -6 l6 2 l6 -8 l6 14 l6 -10 l6 4 l6 -2" fill="none" stroke={glow} strokeWidth="1.2" />

      <rect width="640" height="360" fill={`url(#cv-spill-${uid})`} />

      {/* analysts' desk rows */}
      <rect x="20" y="212" width="600" height="10" fill="#071520" />
      {[90, 190, 300, 410, 520].map((x, i) => (
        <Monitor key={x} x={x - 22} y={190} w={44} h={24} i={i} />
      ))}
      {[140, 250, 360, 470].map((x) => (
        <Analyst key={x} x={x} y={222} s={0.95} />
      ))}
      <rect x="0" y="262" width="640" height="14" fill="#06121b" />
      <path d="M0 262 H640" stroke={glow} strokeOpacity="0.35" />
      {[60, 210, 360].map((x, i) => (
        <Monitor key={x} x={x - 34} y={226} w={68} h={36} i={i + 5} />
      ))}
      <Analyst x={128} y={270} s={1.45} />
      <Analyst x={292} y={272} s={1.5} />

      {/* the dossier on the near desk */}
      <g transform="translate(470 238) rotate(-8)">
        <rect x="4" y="6" width="130" height="86" rx="3" fill="#000" opacity="0.5" filter={`url(#cv-blur-${uid})`} />
        <path d="M0 0 H44 L50 -8 H90 L96 0 H128 V84 H0 Z" fill={`url(#cv-folder-${uid})`} />
        <rect x="10" y="10" width="44" height="54" fill="#d8dcd8" />
        <rect x="14" y="14" width="36" height="40" fill="#5a6460" />
        <circle cx="32" cy="28" r="8" fill="#2a302e" />
        <path d="M18 54 C18 40 46 40 46 54 Z" fill="#2a302e" />
        <path d="M60 14 H118 M60 22 H110 M60 30 H116 M60 38 H96" stroke="#5a4428" strokeWidth="2" />
        <g transform="translate(64 56) rotate(-10)">
          <rect x="-4" y="-11" width="68" height="18" rx="2" fill="none" stroke="#d4232a" strokeWidth="2" />
          <text x="30" y="3" textAnchor="middle" fill="#d4232a" fontSize="10" fontWeight="800" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
            CLASSIFIED
          </text>
        </g>
      </g>
      {bad && <rect className="cv-alert" width="640" height="360" fill="#ff2020" opacity="0.1" />}
    </svg>
  );
}
