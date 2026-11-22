import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * A small line chart drawn at its real pixel size (ResizeObserver), so its labels keep a 13 px
 * floor on phones instead of shrinking with a viewBox. One y axis, 2 px lines, recessive grid,
 * a direct label on the last value, a crosshair tooltip (pointer, touch and arrow keys) and a
 * legend whenever there are two or more series. `SeriesTable` is the table view of the same data.
 */

export interface ChartSeries {
  id: string;
  label: string;
  values: number[];
  color: string;
  dashed?: boolean;
}

export interface ChartMarker {
  index: number;
  label: string;
}

export interface MiniChartProps {
  series: ChartSeries[];
  /** X labels per index (month letters or numbers). */
  xLabels: string[];
  /** Accessible title ("Approval by month"). */
  title: string;
  unit?: string;
  height?: number;
  /** Fixed y domain; otherwise padded around the data. */
  domain?: [number, number];
  /** Horizontal gridlines with labels (the one axis). */
  grid?: number[];
  /** A horizontal reference line ("par 107", "goal 56%"). */
  reference?: { value: number; label: string };
  /** Vertical markers (elections). */
  markers?: ChartMarker[];
  /** Mark the worst point of the first series with a label ("44% low"). */
  markLow?: boolean;
  /** Draw the line in on mount. */
  animate?: boolean;
  /** Number format for labels and tooltip. */
  format?: (v: number) => string;
  /** Show x labels (default true). */
  showX?: boolean;
}

const fmtDefault = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function MiniChart({
  series,
  xLabels,
  title,
  unit = '',
  height = 120,
  domain,
  grid,
  reference,
  markers = [],
  markLow = false,
  animate = false,
  format = fmtDefault,
  showX = true,
}: MiniChartProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    setW(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (active === null) return;
    const off = () => setActive(null);
    window.addEventListener('scroll', off, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', off, { capture: true });
  }, [active]);

  const n = Math.max(...series.map((s) => s.values.length), 1);
  const all = series.flatMap((s) => s.values).concat(reference ? [reference.value] : []);
  let [lo, hi] = domain ?? [Math.min(...all), Math.max(...all)];
  if (!domain) {
    const span = Math.max(hi - lo, Math.abs(hi) * 0.04, 1);
    lo -= span * 0.18;
    hi += span * 0.18;
  }
  if (hi === lo) hi = lo + 1;
  const padL = grid ? 34 : 6;
  const padR = 46; // room for the direct end label
  const padT = 14;
  const padB = showX ? 24 : 8;
  const iw = Math.max(10, w - padL - padR);
  const ih = Math.max(10, height - padT - padB);
  const x = (i: number) => padL + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => padT + ih - ((v - lo) / (hi - lo)) * ih;
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const main = series[0];
  const lowIdx = main ? main.values.indexOf(Math.min(...main.values)) : -1;
  const lastIdx = main ? main.values.length - 1 : -1;
  const every = n > 24 ? Math.ceil(n / 12) : n > 12 ? 2 : 1;

  const pick = (clientX: number) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r || n < 1) return;
    const i = Math.round(((clientX - r.left - padL) / iw) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      setActive((a) => Math.max(0, Math.min(n - 1, (a ?? (e.key === 'ArrowRight' ? -1 : n)) + (e.key === 'ArrowRight' ? 1 : -1))));
    } else if (e.key === 'Escape') setActive(null);
  };
  const summary = `${title}: ${series
    .map((s) => `${s.label} from ${format(s.values[0] ?? 0)}${unit} to ${format(s.values[s.values.length - 1] ?? 0)}${unit}`)
    .join('; ')}. Use the arrow keys for each month.`;

  return (
    <div className="rv-chart">
      <div
        ref={wrap}
        className="rv-chart-plot"
        style={{ height }}
        tabIndex={0}
        role="img"
        aria-label={summary}
        data-no-advance
        onPointerMove={(e: PointerEvent) => pick(e.clientX)}
        onPointerDown={(e: PointerEvent) => pick(e.clientX)}
        onPointerLeave={(e: PointerEvent) => e.pointerType === 'mouse' && setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {w > 0 && (
          <svg width={w} height={height} aria-hidden focusable="false">
            {grid?.map((g) => (
              <g key={g}>
                <line x1={padL} x2={padL + iw} y1={y(g)} y2={y(g)} className="rv-grid" />
                <text x={padL - 6} y={y(g) + 4} textAnchor="end" className="rv-axis">
                  {g}
                </text>
              </g>
            ))}
            {reference && (
              <g>
                <line x1={padL} x2={padL + iw} y1={y(reference.value)} y2={y(reference.value)} className="rv-ref" />
                <text x={padL + 4} y={y(reference.value) - 5} className="rv-axis rv-ref-label">
                  {reference.label}
                </text>
              </g>
            )}
            {markers.map((m) => (
              <g key={`${m.index}-${m.label}`}>
                <line x1={x(m.index)} x2={x(m.index)} y1={padT - 4} y2={padT + ih} className="rv-marker" />
                <text x={x(m.index) + 4} y={padT + 6} className="rv-axis">
                  {m.label}
                </text>
              </g>
            ))}
            {series
              .slice()
              .reverse()
              .map((s, ri) => (
                <path
                  key={s.id}
                  d={path(s.values)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dashed ? '5 5' : undefined}
                  opacity={s.dashed ? 0.8 : 1}
                  pathLength={animate && !s.dashed ? 1 : undefined}
                  className={animate && !s.dashed ? 'rv-draw' : undefined}
                  data-series={ri}
                />
              ))}
            {main && markLow && lowIdx > 0 && lowIdx < lastIdx && (
              <g>
                <circle cx={x(lowIdx)} cy={y(main.values[lowIdx])} r={4} fill="var(--war)" stroke="var(--surface-1)" strokeWidth={2} />
                <text x={x(lowIdx) + 7} y={y(main.values[lowIdx]) + 16} className="rv-axis rv-low">
                  {format(main.values[lowIdx])}
                  {unit} low
                </text>
              </g>
            )}
            {main && lastIdx >= 0 && (
              <g>
                <circle cx={x(lastIdx)} cy={y(main.values[lastIdx])} r={4.5} fill={main.color} stroke="var(--surface-1)" strokeWidth={2} />
                <text x={x(lastIdx) + 8} y={y(main.values[lastIdx]) + 4} className="rv-endlabel">
                  {format(main.values[lastIdx])}
                  {unit}
                </text>
              </g>
            )}
            {showX &&
              xLabels.map((l, i) =>
                i % every === 0 || i === n - 1 ? (
                  <text key={`${l}-${i}`} x={x(i)} y={height - 6} textAnchor="middle" className="rv-axis">
                    {l}
                  </text>
                ) : null,
              )}
            {active !== null && (
              <g>
                <line x1={x(active)} x2={x(active)} y1={padT - 4} y2={padT + ih} className="rv-cross" />
                {series.map((s) =>
                  s.values[active] !== undefined ? (
                    <circle key={s.id} cx={x(active)} cy={y(s.values[active])} r={4.5} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
                  ) : null,
                )}
              </g>
            )}
          </svg>
        )}
        {active !== null && w > 0 && (
          <div
            className="rv-tip"
            role="status"
            style={{ left: Math.min(Math.max(x(active), 70), w - 70), top: 0 }}
          >
            <b>Month {active + 1}{xLabels[active] && !/^\d+$/.test(xLabels[active]) ? ` (${xLabels[active]})` : ''}</b>
            {series.map((s) =>
              s.values[active] !== undefined ? (
                <span key={s.id}>
                  <i style={{ background: s.color }} aria-hidden /> {s.label} {format(s.values[active])}
                  {unit}
                </span>
              ) : null,
            )}
          </div>
        )}
      </div>
      {series.length > 1 && (
        <ul className="rv-legend" aria-label="Legend">
          {series.map((s) => (
            <li key={s.id}>
              <svg width={22} height={10} aria-hidden>
                <line x1={1} x2={21} y1={5} y2={5} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '4 3' : undefined} />
              </svg>
              {s.label}
            </li>
          ))}
          {markers.length > 0 && (
            <li>
              <svg width={10} height={14} aria-hidden>
                <line x1={5} x2={5} y1={0} y2={14} className="rv-marker" />
              </svg>
              Elections
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** The table view of one or more series: one row per month. */
export function SeriesTable({ series, xLabels, unit = '', format = fmtDefault, caption }: { series: ChartSeries[]; xLabels: string[]; unit?: string; format?: (v: number) => string; caption: string }) {
  const n = Math.max(...series.map((s) => s.values.length), 0);
  return (
    <div className="rv-table-wrap" data-no-advance>
      <table className="rv-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {series.map((s) => (
              <th key={s.id} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, i) => (
            <tr key={i}>
              <th scope="row">
                {i + 1}
                {xLabels[i] && !/^\d+$/.test(xLabels[i]) ? ` ${xLabels[i]}` : ''}
              </th>
              {series.map((s) => (
                <td key={s.id} className="num">
                  {s.values[i] === undefined ? '' : `${format(s.values[i])}${unit}`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
