import { useId } from 'react';
import type { ReactNode } from 'react';
import { flagLayout } from '../flagLayout';
import type { FlagLayout } from '../flagLayout';

type C = readonly string[];

/** Five-point star polygon points. */
function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return pts.join(' ');
}

const hBands = (cols: C, w: number, h: number) =>
  cols.map((col, i) => <rect key={i} y={(h * i) / cols.length} width={w} height={h / cols.length + 0.3} fill={col} />);

/** Union-style cross filling 0..w x 0..h (clipped by the caller). */
function union(w: number, h: number, field: string, white: string, red: string) {
  const m = Math.min(w, h);
  return (
    <g>
      <rect width={w} height={h} fill={field} />
      <path d={`M0 0 L${w} ${h} M${w} 0 L0 ${h}`} stroke={white} strokeWidth={m * 0.2} />
      <path d={`M0 0 L${w} ${h} M${w} 0 L0 ${h}`} stroke={red} strokeWidth={m * 0.07} />
      <path d={`M${w / 2} 0 V${h} M0 ${h / 2} H${w}`} stroke={white} strokeWidth={m * 0.32} />
      <path d={`M${w / 2} 0 V${h} M0 ${h / 2} H${w}`} stroke={red} strokeWidth={m * 0.19} />
    </g>
  );
}

function pattern(layout: FlagLayout, c: C, w: number, h: number, clip: string): ReactNode {
  const m = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  switch (layout) {
    case 'horizontal':
      return hBands(c, w, h);
    case 'bicolor':
      return hBands([c[0], c[1]], w, h);
    case 'horizontal2':
      return (
        <g>
          <rect width={w} height={h} fill={c[0]} />
          <rect y={(h * 2) / 3} width={w} height={h / 3} fill={c[1]} />
          <rect width={w * 0.12} height={h} fill={c[2]} opacity="0.9" />
        </g>
      );
    case 'usa': {
      const n = h < 30 ? 7 : 13;
      const sh = h / n;
      return (
        <g>
          <rect width={w} height={h} fill={c[1]} />
          {Array.from({ length: Math.ceil(n / 2) }, (_, i) => (
            <rect key={i} y={i * 2 * sh} width={w} height={sh} fill={c[2]} />
          ))}
          <rect width={w * 0.45} height={sh * Math.ceil(n / 2)} fill={c[0]} />
          {m > 14 &&
            [0.25, 0.5, 0.75].map((fx) => (
              <circle key={fx} cx={w * 0.45 * fx} cy={sh * 1.6} r={m * 0.025} fill={c[1]} />
            ))}
        </g>
      );
    }
    case 'union':
      return union(w, h, c[0], c[1], c[2]);
    case 'ensign': {
      const cw = w * 0.5;
      const ch = Math.min(h * 0.5, cw * 0.66);
      return (
        <g>
          <rect width={w} height={h} fill={c[0]} />
          <svg width={cw} height={ch} overflow="hidden">{union(cw, ch, c[0], c[1], c[2])}</svg>
          <polygon points={star(w * 0.25, h * 0.75, m * 0.14)} fill={c[1]} />
          <polygon points={star(w * 0.76, h * 0.5, m * 0.09)} fill={c[1]} />
        </g>
      );
    }
    case 'nordic':
      return (
        <g>
          <rect width={w} height={h} fill={c[0]} />
          <path d={`M${w * 0.36} 0 V${h} M0 ${cy} H${w}`} stroke={c[1]} strokeWidth={m * 0.2} />
        </g>
      );
    case 'disc':
      return (
        <g>
          <rect width={w} height={h} fill={c[0]} />
          <circle cx={cx} cy={cy} r={m * 0.3} fill={c[1]} />
        </g>
      );
    case 'taegeuk': {
      const r = m * 0.26;
      return (
        <g>
          <rect width={w} height={h} fill={c[0]} />
          <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill={c[1]} />
          <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 0 ${cx + r} ${cy} Z`} fill={c[2]} />
          <circle cx={cx - r / 2} cy={cy} r={r / 2} fill={c[1]} />
          <circle cx={cx + r / 2} cy={cy} r={r / 2} fill={c[2]} />
          {[
            [0.14, 0.18],
            [0.86, 0.18],
            [0.14, 0.82],
            [0.86, 0.82],
          ].map(([fx, fy]) => (
            <rect key={`${fx}${fy}`} x={w * fx - m * 0.08} y={h * fy - m * 0.06} width={m * 0.16} height={m * 0.12} fill="#111" />
          ))}
        </g>
      );
    }
    case 'diamond':
      return (
        <g>
          <rect width={w} height={h} fill={c[0]} />
          <polygon points={`${w * 0.08},${cy} ${cx},${h * 0.1} ${w * 0.92},${cy} ${cx},${h * 0.9}`} fill={c[1]} />
          <circle cx={cx} cy={cy} r={m * 0.24} fill={c[2]} />
        </g>
      );
    case 'canada':
      return (
        <g>
          <rect width={w} height={h} fill={c[1]} />
          <rect width={w / 4} height={h} fill={c[0]} />
          <rect x={(w * 3) / 4} width={w / 4} height={h} fill={c[0]} />
          <polygon points={star(cx, cy * 0.96, m * 0.26)} fill={c[0]} />
          <rect x={cx - m * 0.02} y={cy} width={m * 0.04} height={m * 0.24} fill={c[0]} />
        </g>
      );
    case 'cantonStar':
      return (
        <g>
          <rect width={w} height={h} fill={c[0]} />
          <polygon points={star(w * 0.18, h * 0.27, m * 0.15)} fill={c[2]} />
          {[
            [0.33, 0.12],
            [0.39, 0.22],
            [0.39, 0.35],
            [0.33, 0.45],
          ].map(([fx, fy]) => (
            <polygon key={`${fx}${fy}`} points={star(w * fx, h * fy, m * 0.05)} fill={c[2]} />
          ))}
        </g>
      );
    case 'cantonSun':
      return (
        <g>
          <rect width={w} height={h} fill={c[0]} />
          <rect width={w / 2} height={h / 2} fill={c[1]} />
          <polygon points={star(w / 4, h / 4, m * 0.17)} fill={c[2]} />
          <circle cx={w / 4} cy={h / 4} r={m * 0.08} fill={c[2]} stroke={c[1]} strokeWidth={m * 0.02} />
        </g>
      );
    case 'cuba':
      return (
        <g>
          {hBands([c[0], c[1], c[0], c[1], c[0]], w, h)}
          <polygon points={`0,0 ${w * 0.45},${cy} 0,${h}`} fill={c[2]} />
          <polygon points={star(w * 0.15, cy, m * 0.13)} fill={c[1]} />
        </g>
      );
    case 'hoist':
      return (
        <g>
          {hBands([c[0], c[1], '#000000'], w, h)}
          <rect width={w * 0.26} height={h} fill={c[2]} />
        </g>
      );
    case 'israel':
      return (
        <g>
          <rect width={w} height={h} fill={c[1]} />
          <rect y={h * 0.1} width={w} height={h * 0.14} fill={c[0]} />
          <rect y={h * 0.76} width={w} height={h * 0.14} fill={c[0]} />
          <g fill="none" stroke={c[0]} strokeWidth={m * 0.035}>
            <polygon points={`${cx},${cy - m * 0.2} ${cx + m * 0.17},${cy + m * 0.1} ${cx - m * 0.17},${cy + m * 0.1}`} />
            <polygon points={`${cx},${cy + m * 0.2} ${cx + m * 0.17},${cy - m * 0.1} ${cx - m * 0.17},${cy - m * 0.1}`} />
          </g>
        </g>
      );
    case 'india':
      return (
        <g>
          {hBands(c, w, h)}
          <circle cx={cx} cy={cy} r={m * 0.12} fill="none" stroke="#000080" strokeWidth={m * 0.03} />
          <circle cx={cx} cy={cy} r={m * 0.03} fill="#000080" />
        </g>
      );
    case 'lebanon':
      return (
        <g>
          <rect width={w} height={h} fill={c[1]} />
          <rect width={w} height={h / 4} fill={c[0]} />
          <rect y={(h * 3) / 4} width={w} height={h / 4} fill={c[0]} />
          <polygon points={`${cx},${cy - m * 0.2} ${cx + m * 0.2},${cy + m * 0.16} ${cx - m * 0.2},${cy + m * 0.16}`} fill={c[2]} />
        </g>
      );
    case 'pakistan':
    case 'crescent': {
      const pk = layout === 'pakistan';
      const ox = pk ? w * 0.25 : 0;
      const ccx = ox + (w - ox) * (pk ? 0.48 : 0.4);
      const r = m * 0.24;
      return (
        <g>
          <rect width={w} height={h} fill={c[0]} />
          {pk && <rect width={ox} height={h} fill={c[1]} />}
          <circle cx={ccx} cy={cy} r={r} fill={c[1]} />
          <circle cx={ccx + r * 0.3} cy={cy - (pk ? r * 0.15 : 0)} r={r * 0.8} fill={c[0]} />
          <polygon points={star(ccx + r * 0.95, cy - (pk ? r * 0.35 : 0), r * 0.36)} fill={c[1]} />
        </g>
      );
    }
    case 'philippines':
      return (
        <g>
          <rect width={w} height={cy} fill={c[0]} />
          <rect y={cy} width={w} height={cy} fill={c[2]} />
          <polygon points={`0,0 ${w * 0.43},${cy} 0,${h}`} fill={c[1]} />
          <circle cx={w * 0.14} cy={cy} r={m * 0.08} fill="#fcd116" />
        </g>
      );
    case 'prk':
      return (
        <g>
          <rect width={w} height={h} fill={c[0]} />
          <rect y={h * 0.17} width={w} height={h * 0.66} fill={c[2]} />
          <rect y={h * 0.21} width={w} height={h * 0.58} fill={c[1]} />
          <circle cx={w * 0.36} cy={cy} r={m * 0.2} fill={c[2]} />
          <polygon points={star(w * 0.36, cy, m * 0.18)} fill={c[1]} />
        </g>
      );
    case 'triangle':
      return (
        <g>
          {hBands(c, w, h)}
          <polygon points={`0,0 ${w * 0.38},${cy} 0,${h}`} fill="#ce1126" />
        </g>
      );
    case 'saudi':
      return (
        <g>
          <rect width={w} height={h} fill={c[0]} />
          <rect x={w * 0.22} y={h * 0.3} width={w * 0.56} height={h * 0.12} rx={h * 0.04} fill={c[1]} opacity="0.9" />
          <rect x={w * 0.22} y={h * 0.62} width={w * 0.56} height={h * 0.05} fill={c[1]} />
        </g>
      );
    case 'zaf':
      return (
        <g>
          <rect width={w} height={cy} fill={c[2]} />
          <rect y={cy} width={w} height={cy} fill="#002395" />
          <path d={`M0 ${h * 0.1} L${w * 0.42} ${cy} L0 ${h * 0.9} M${w * 0.4} ${cy} H${w}`} stroke="#ffffff" strokeWidth={m * 0.34} fill="none" />
          <path d={`M0 ${h * 0.1} L${w * 0.42} ${cy} L0 ${h * 0.9} M${w * 0.4} ${cy} H${w}`} stroke={c[0]} strokeWidth={m * 0.2} fill="none" />
          <polygon points={`0,${h * 0.22} ${w * 0.3},${cy} 0,${h * 0.78}`} fill={c[1]} />
          <polygon points={`0,${h * 0.3} ${w * 0.24},${cy} 0,${h * 0.7}`} fill="#000000" />
        </g>
      );
    case 'vertical':
    default:
      return c.map((col, i) => <rect key={`${clip}${i}`} x={(w * i) / c.length} width={w / c.length + 0.3} height={h} fill={col} />);
  }
}

/**
 * A nation's flag drawn from its three palette colours, laid out by FLAG_LAYOUT (stripes, canton,
 * cross, disc...). Draws in the box x, y, w, h; pass `d` (a path in the same user space) to clip it
 * to a draped banner outline. Wrap it in an animated group to make it ripple.
 */
export default function Flag({ colors, x, y, w, h, d, opacity }: { colors: C; x: number; y: number; w: number; h: number; d?: string; opacity?: number }) {
  const clip = `flag-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <g clipPath={`url(#${clip})`} opacity={opacity}>
      <clipPath id={clip}>{d ? <path d={d} /> : <rect x={x} y={y} width={w} height={h} />}</clipPath>
      <g transform={`translate(${x} ${y})`}>{pattern(flagLayout(colors), colors, w, h, clip)}</g>
    </g>
  );
}
