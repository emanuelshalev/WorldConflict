import { useSceneUid } from './uid';
import type { SceneArtProps } from './types';
import './security.css';

const VX = 330;
const VY = 170;
// Foreshortened spacing along a receding facade (0 = near edge, 1 = far edge).
const fs = (t: number) => (1 - 1 / (1 + 2.2 * t)) / (1 - 1 / 3.2);

function Facade({ nx, fx, top, bot, side, lit }: { nx: number; fx: number; top: number; bot: number; side: 1 | -1; lit: number[] }) {
  const ty = (x: number) => top + ((VY - top) * (x - nx)) / (VX - nx);
  const by = (x: number) => bot + ((VY - bot) * (x - nx)) / (VX - nx);
  const cols = [0.04, 0.16, 0.3, 0.44, 0.58, 0.72, 0.86];
  return (
    <g>
      <path d={`M${nx} ${top} L${fx} ${ty(fx)} L${fx} ${by(fx)} L${nx} ${bot} Z`} fill={`url(#ds-wall${side > 0 ? 'R' : 'L'})`} />
      <path d={`M${fx} ${ty(fx)} L${fx} ${by(fx)}`} stroke="#5a6a88" strokeOpacity="0.6" strokeWidth="1.2" />
      <path d={`M${nx} ${top} L${fx} ${ty(fx)}`} stroke="#5a6a88" strokeOpacity="0.4" strokeWidth="1" />
      {cols.map((c, ci) => {
        const x0 = nx + (fx - nx) * fs(c);
        const x1 = nx + (fx - nx) * fs(c + 0.07);
        return [0.12, 0.3, 0.48, 0.66].map((r, ri) => {
          const y00 = ty(x0) + (by(x0) - ty(x0)) * r;
          const y01 = ty(x1) + (by(x1) - ty(x1)) * r;
          const h0 = (by(x0) - ty(x0)) * 0.1;
          const h1 = (by(x1) - ty(x1)) * 0.1;
          const on = lit.includes(ci * 4 + ri);
          return (
            <path key={`${ci}-${ri}`} d={`M${x0} ${y00} L${x1} ${y01} L${x1} ${y01 + h1} L${x0} ${y00 + h0} Z`} fill={on ? '#ffcf7a' : '#070a12'} opacity={on ? 0.8 : 0.85} stroke="#3a4458" strokeOpacity="0.5" strokeWidth="0.5" />
          );
        });
      })}
    </g>
  );
}

export default function Disaster({ mood }: SceneArtProps) {
  const uid = useSceneUid();
  const bad = mood === 'bad';
  const good = mood === 'good';
  const sky = bad ? '#4a1a1e' : good ? '#4a3a44' : '#26324c';
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-disaster" aria-hidden>
      <defs>
        <linearGradient id={`ds-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#04060b" />
          <stop offset="1" stopColor={sky} />
        </linearGradient>
        <linearGradient id={`ds-wallL-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#252e40" />
          <stop offset="1" stopColor="#141a27" />
        </linearGradient>
        <linearGradient id={`ds-wallR-${uid}`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#222a3a" />
          <stop offset="1" stopColor="#131925" />
        </linearGradient>
        <linearGradient id={`ds-water-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c3a54" />
          <stop offset="0.35" stopColor="#141c2c" />
          <stop offset="1" stopColor="#04060b" />
        </linearGradient>
        <radialGradient id={`ds-red-${uid}`}>
          <stop offset="0" stopColor="#ff2a2a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ff2a2a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`ds-blue-${uid}`}>
          <stop offset="0" stopColor="#2a6aff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#2a6aff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ds-beam-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eaf4ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#eaf4ff" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id={`ds-spot-${uid}`}>
          <stop offset="0" stopColor="#f4faff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#f4faff" stopOpacity="0" />
        </radialGradient>
        <pattern id={`ds-rain-${uid}`} width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M6 0 l-4 14 M22 10 l-4 14 M38 4 l-4 14 M14 28 l-4 14 M30 32 l-4 14 M46 26 l-4 14" stroke="#b8c8e0" strokeWidth="0.7" strokeOpacity="0.18" />
        </pattern>
        <filter id={`ds-soft-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={`ds-blur-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      <rect width="640" height="360" fill={`url(#ds-sky-${uid})`} />
      {/* storm clouds */}
      <g className="ds-cloud" fill="#1c2232" opacity="0.8" filter={`url(#ds-soft-${uid})`}>
        <ellipse cx="160" cy="40" rx="180" ry="30" />
        <ellipse cx="480" cy="30" rx="200" ry="34" />
      </g>
      <ellipse cx="330" cy="168" rx="150" ry="60" fill={bad ? '#ff6a3a' : '#7a90c0'} opacity={bad ? 0.3 : 0.2} filter={`url(#ds-soft-${uid})`} />
      {/* far skyline, power out */}
      <g fill="#0a0d15">
        <path d="M240 190 V140 H262 V128 H286 V150 H300 V118 H326 V146 H344 V132 H368 V152 H392 V136 H420 V190 Z" />
      </g>
      <g fill="#ffcf7a" opacity="0.6">
        <rect x="306" y="126" width="3" height="3" />
        <rect x="352" y="140" width="3" height="3" />
      </g>
      {/* smoke drifting from a damaged block */}
      <g className="ds-smoke" fill={bad ? '#3a2a2a' : '#2a3040'} opacity="0.7" filter={`url(#ds-soft-${uid})`}>
        <ellipse cx="300" cy="104" rx="26" ry="38" />
        <ellipse cx="272" cy="70" rx="40" ry="30" />
      </g>

      <Facade nx={0} fx={250} top={18} bot={250} side={-1} lit={[5, 14, 19, 24]} />
      <Facade nx={640} fx={420} top={30} bot={255} side={1} lit={[2, 9, 13, 21, 26]} />
      {/* broken roofline on the right block */}
      <path d="M640 30 L560 57 L548 46 L536 66 L524 60 L512 72 L640 72 Z" fill={sky} />
      <path d="M560 57 L548 46 L536 66 L524 60 L512 72" fill="none" stroke="#2a3244" strokeWidth="1.2" />

      {/* flooded street */}
      <path d="M0 250 L250 189 L420 195 L640 255 L640 360 L0 360 Z" fill={`url(#ds-water-${uid})`} />
      <path d="M0 250 L250 189 L420 195 L640 255" fill="none" stroke="#8a9ab8" strokeOpacity="0.45" />
      <g className="ds-ripple" stroke="#8aa0c4" strokeOpacity="0.25" strokeWidth="1">
        <path d="M200 206 h60 M300 200 h50 M380 210 h40 M150 222 h70 M440 226 h60 M240 240 h50 M500 250 h60 M120 270 h80 M330 284 h70" />
      </g>
      <g filter={`url(#ds-blur-${uid})`} fill="#ffcf7a" opacity="0.25">
        <rect x="36" y="252" width="8" height="40" />
        <rect x="560" y="258" width="8" height="34" />
        <rect x="306" y="194" width="3" height="14" />
      </g>

      {/* emergency vehicle half in the water, strobing */}
      <g transform="translate(60 180)">
        <rect x="0" y="0" width="96" height="50" rx="4" fill="#dfe4ea" />
        <path d="M96 14 H120 C128 14 134 24 136 34 V50 H96 Z" fill="#cdd3db" />
        <path d="M100 18 H118 C123 18 127 25 129 32 H100 Z" fill="#1a2232" />
        <rect x="0" y="0" width="136" height="50" fill={`url(#ds-wallL-${uid})`} opacity="0.4" />
        <rect x="0" y="28" width="136" height="6" fill="#d4232a" />
        <path d="M40 8 h12 v6 h6 v8 h-6 v6 h-12 v-6 h-6 v-8 h6 Z" fill="#d4232a" transform="translate(4 -2) scale(0.8)" />
        <rect className="ds-strobeR" x="10" y="-6" width="22" height="6" rx="2" fill="#ff3030" />
        <rect className="ds-strobeB" x="34" y="-6" width="22" height="6" rx="2" fill="#3a7aff" />
        <rect className="ds-strobeB" x="100" y="10" width="12" height="4" rx="1.5" fill="#3a7aff" />
        <rect className="ds-strobeR" x="114" y="10" width="12" height="4" rx="1.5" fill="#ff3030" />
      </g>
      <path d="M24 222 Q120 218 224 222 L224 262 L24 262 Z" fill="#111827" opacity="0.92" filter={`url(#ds-blur-${uid})`} />
      <path d="M40 222 Q120 218 210 222" stroke="#8aa0c4" strokeOpacity="0.5" fill="none" />
      <ellipse className="ds-strobeR" cx="101" cy="190" rx="130" ry="80" fill={`url(#ds-red-${uid})`} />
      <ellipse className="ds-strobeB" cx="123" cy="190" rx="130" ry="80" fill={`url(#ds-blue-${uid})`} />
      {/* reflections on the water */}
      <g filter={`url(#ds-blur-${uid})`}>
        <rect className="ds-strobeR" x="92" y="236" width="10" height="70" fill="#ff3030" opacity="0.5" />
        <rect className="ds-strobeB" x="114" y="236" width="10" height="70" fill="#3a7aff" opacity="0.5" />
      </g>

      {/* leaning pole with sagging line */}
      <path d="M262 236 L284 140" stroke="#0a0d14" strokeWidth="4" />
      <path d="M276 150 H296" stroke="#0a0d14" strokeWidth="3" />
      <path d="M284 146 Q340 186 420 150" fill="none" stroke="#0a0d14" strokeWidth="1.2" />

      {/* helicopter searchlight onto the rescue boat */}
      <g transform="translate(486 70)">
        <g className="ds-beam">
          <path d="M0 4 L-140 176 L-50 182 Z" fill={`url(#ds-beam-${uid})`} />
          <ellipse cx="-95" cy="180" rx="56" ry="12" fill={`url(#ds-spot-${uid})`} />
        </g>
        <ellipse cx="0" cy="0" rx="18" ry="8" fill="#1a2232" />
        <path d="M-16 -3 C-10 -8 8 -8 16 -3" stroke="#8a9ab8" strokeOpacity="0.7" fill="none" />
        <path d="M14 -2 L46 -4 L50 -12 L54 -12 L52 2 L14 4 Z" fill="#1a2232" />
        <ellipse className="ds-rotor" cx="2" cy="-10" rx="34" ry="1.6" fill="#0c1018" opacity="0.7" />
        <circle className="ds-nav" cx="-14" cy="2" r="1.8" fill="#ff4040" />
        <circle cx="-4" cy="6" r="3" fill="#f4faff" />
      </g>

      {/* rescue boat with workers in hi-vis */}
      <g transform="translate(392 236)">
        <g className="ds-boat">
          <ellipse cx="0" cy="8" rx="62" ry="6" fill="#000" opacity="0.4" />
          <path d="M-56 -6 H50 C62 -6 62 10 50 10 H-56 C-66 10 -66 -6 -56 -6 Z" fill="#e8562a" />
          <path d="M-54 -6 H50" stroke="#ffb08a" strokeWidth="1.5" />
          {[[-34, 1], [-6, 1.1], [24, 0.95]].map(([x, s]) => (
            <g key={x} transform={`translate(${x} -6) scale(${s})`}>
              <path d="M-11 0 C-11 -22 -8 -28 0 -28 C8 -28 11 -22 11 0 Z" fill="#ff8a1a" />
              <rect x="-11" y="-14" width="22" height="3" fill="#e9f6ff" opacity="0.9" />
              <rect x="-11" y="-8" width="22" height="3" fill="#e9f6ff" opacity="0.9" />
              <circle cx="0" cy="-34" r="6.5" fill="#1a1f2a" />
              <path d="M-7.5 -35 C-7.5 -44 7.5 -44 7.5 -35 Z" fill="#f4d23a" />
            </g>
          ))}
          <path d="M30 -24 L48 -40" stroke="#ff8a1a" strokeWidth="4" strokeLinecap="round" />
        </g>
        <path className="ds-ripple" d="M-80 14 h40 M30 16 h50 M-50 22 h30" stroke="#9ab0d0" strokeOpacity="0.4" strokeWidth="1" />
      </g>
      {/* floating debris */}
      <g fill="#1a1f28">
        <rect x="200" y="262" width="22" height="4" transform="rotate(-8 211 264)" />
        <rect x="520" y="276" width="30" height="5" transform="rotate(6 535 278)" />
        <rect x="300" y="290" width="16" height="4" />
      </g>

      {/* rain */}
      <rect className="ds-rain" x="-48" y="-48" width="736" height="456" fill={`url(#ds-rain-${uid})`} />
      {bad && <rect className="ds-alert" width="640" height="360" fill="#ff2020" opacity="0.08" />}
    </svg>
  );
}
