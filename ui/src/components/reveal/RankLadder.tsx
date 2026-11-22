import type { CSSProperties } from 'react';
import { useWidth } from './useWidth';

/**
 * The Presidency Score ladder (design-reveal.md 2.7): benchmark ticks for the seat (do-nothing,
 * random and competent staff, best known), your best before, and you. Vertical from 1024 px,
 * horizontal on phones. Labels sit in text ink; the coloured mark carries identity.
 */
export interface LadderTick {
  id: string;
  label: string;
  score: number;
  kind: 'bench' | 'competent' | 'best' | 'mine';
}

export function RankLadder({ you, ticks, animate }: { you: number; ticks: LadderTick[]; animate: boolean }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const values = [you, ...ticks.map((t) => t.score)];
  const lo = Math.max(0, Math.floor((Math.min(...values) - 60) / 50) * 50);
  const hi = Math.min(1000, Math.ceil((Math.max(...values) + 40) / 50) * 50);
  const vertical = w >= 260 && (typeof window === 'undefined' || window.innerWidth > 700);
  const color = (t: LadderTick) => (t.kind === 'competent' ? 'var(--intel)' : t.kind === 'mine' ? 'var(--text-1)' : 'var(--text-3)');
  const sorted = [...ticks].sort((a, b) => b.score - a.score);
  const summary = `Your Presidency Score ${you} on a ladder from ${lo} to ${hi}: ${sorted.map((t) => `${t.label} ${t.score}`).join(', ')}.`;

  if (!vertical) {
    // Phone: a horizontal scale with ticks below and a list of the benchmarks
    const W = Math.max(200, w);
    const x = (v: number) => 14 + ((v - lo) / (hi - lo)) * (W - 28);
    return (
      <div ref={ref} className="rv-ladder horiz">
        {w > 0 && (
          <svg width={W} height={70} role="img" aria-label={summary}>
            <line x1={14} x2={W - 14} y1={30} y2={30} stroke="var(--line-2)" strokeWidth={8} strokeLinecap="round" />
            {ticks.map((t) => (
              <line key={t.id} x1={x(t.score)} x2={x(t.score)} y1={18} y2={42} stroke={color(t)} strokeWidth={2} />
            ))}
            <circle cx={x(you)} cy={30} r={9} fill="var(--accent)" stroke="var(--bg-0)" strokeWidth={3} className={animate ? 'rv-pop' : ''} />
            <text x={x(you)} y={12} textAnchor={x(you) > W - 50 ? 'end' : 'middle'} className="rv-ladder-you">
              You {you}
            </text>
            <text x={14} y={62} className="rv-axis">
              {lo}
            </text>
            <text x={W - 14} y={62} textAnchor="end" className="rv-axis">
              {hi}
            </text>
          </svg>
        )}
        <ul className="rv-ladder-list">
          {sorted.map((t) => (
            <li key={t.id}>
              <i style={{ background: color(t) }} aria-hidden />
              <span>{t.label}</span>
              <b className="num">{t.score}</b>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const H = 400;
  const top = 24;
  const bot = H - 34;
  const X = Math.min(112, Math.round(w * 0.32));
  const y = (v: number) => bot - ((v - lo) / (hi - lo)) * (bot - top);
  // Nudge labels apart (16 px minimum)
  const placed: Array<{ t: LadderTick; ly: number }> = [];
  for (const t of sorted) {
    let ly = y(t.score) + 5;
    const prev = placed[placed.length - 1];
    if (prev && ly - prev.ly < 17) ly = prev.ly + 17;
    placed.push({ t, ly });
  }
  const comp = ticks.filter((t) => t.kind === 'competent').map((t) => t.score);
  const gridVals = [250, 500, 750].filter((v) => v > lo && v < hi && Math.abs(y(v) - y(you)) > 28);
  return (
    <div ref={ref} className="rv-ladder">
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label={summary}>
          <line x1={X} x2={X} y1={top} y2={bot} stroke="var(--line-2)" strokeWidth={10} strokeLinecap="round" />
          {comp.length === 2 && (
            <rect x={X - 5} y={y(Math.max(...comp))} width={10} height={Math.abs(y(comp[0]) - y(comp[1]))} rx={4} fill="var(--intel)" opacity={0.7} />
          )}
          {gridVals.map((v) => (
            <g key={v}>
              <line x1={X - 16} x2={X - 9} y1={y(v)} y2={y(v)} stroke="var(--text-3)" />
              <text x={X - 20} y={y(v) + 4} textAnchor="end" className="rv-axis">
                {v}
              </text>
            </g>
          ))}
          {placed.map(({ t, ly }) => (
            <g key={t.id}>
              <line x1={X + 7} x2={X + 18} y1={y(t.score)} y2={y(t.score)} stroke={color(t)} strokeWidth={t.kind === 'competent' ? 2 : 1.5} />
              <text x={X + 24} y={ly} className="rv-ladder-label">
                {t.label} <tspan className="num">{t.score}</tspan>
              </text>
            </g>
          ))}
          <g className={animate ? 'rv-climb' : ''} style={{ '--from': `${bot - y(you)}px` } as CSSProperties}>
            <circle cx={X} cy={y(you)} r={10} fill="var(--accent)" stroke="var(--bg-0)" strokeWidth={3} />
            <line x1={X - 12} x2={X - 26} y1={y(you)} y2={y(you)} stroke="var(--accent)" strokeWidth={2} />
            <text x={X - 30} y={y(you) - 3} textAnchor="end" className="rv-ladder-you">
              YOU
            </text>
            <text x={X - 30} y={y(you) + 16} textAnchor="end" className="rv-ladder-you">
              {you}
            </text>
          </g>
          <text x={X} y={H - 8} textAnchor="middle" className="rv-axis">
            scale {lo} to {hi}
          </text>
        </svg>
      )}
    </div>
  );
}
