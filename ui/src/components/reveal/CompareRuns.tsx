import { useMemo, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { firstSplit, shortDate, type StoredRun } from '../../lib/runs';
import { useModalFocus } from '../../lib/useModalFocus';
import { MiniChart, SeriesTable } from './MiniChart';

/**
 * Compare runs (design-reveal.md 2.7): this run against any earlier run on the same seat, side by
 * side: Presidency Score parts, approval and score curves overlaid, achievements gained and lost,
 * and the crisis choices month by month with the first month they differ marked.
 */
const PARTS = ['Mission', 'Timing', 'Leadership', 'Finish'];
const PART_MAX = [400, 100, 300, 200];

export function CompareRuns({ current, runs, names, onClose }: { current: StoredRun; runs: StoredRun[]; names: Record<string, string>; onClose: () => void }) {
  const others = runs.filter((r) => r.saveId !== current.saveId);
  const [otherId, setOtherId] = useState(() => others[0]?.saveId ?? others[0]?.date ?? '');
  const [table, setTable] = useState(false);
  const other = others.find((r) => (r.saveId ?? r.date) === otherId) ?? others[0];
  const ref = useModalFocus<HTMLDivElement>(true);
  const split = useMemo(() => (other ? firstSplit(current, other) : null), [current, other]);
  const label = (r: StoredRun) => (r === current ? 'This run' : `${shortDate(r.date)} run`);

  const rows = useMemo(() => {
    if (!other) return [];
    const turns = [...new Set([...current.choices.map((c) => c.turn), ...other.choices.map((c) => c.turn)])].sort((a, b) => a - b);
    return turns.map((t) => ({
      turn: t,
      a: current.choices.find((c) => c.turn === t),
      b: other.choices.find((c) => c.turn === t),
    }));
  }, [current, other]);

  return (
    <div className="rv-overlay" role="dialog" aria-modal="true" aria-labelledby="rv-compare-h" ref={ref} onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), onClose())}>
      <div className="rv-compare">
        <header className="rv-compare-head">
          <h2 id="rv-compare-h" className="rv-h2">
            Compare runs
          </h2>
          <button type="button" className="rv-icon-btn" onClick={onClose} aria-label="Close Compare runs">
            <IconX size={20} />
          </button>
        </header>
        {!other ? (
          <p className="rv-body">Finish another run on this seat to compare. "Replay same opening" gives you the same first crisis.</p>
        ) : (
          <>
            <label className="rv-select">
              <span>Compare with</span>
              <select value={otherId} onChange={(e) => setOtherId(e.target.value)}>
                {others.map((r) => (
                  <option key={r.saveId ?? r.date} value={r.saveId ?? r.date}>
                    {shortDate(r.date)} · {r.presidencyScore} · grade {r.grade}
                    {r.seed === current.seed ? ' · same opening' : ''}
                  </option>
                ))}
              </select>
            </label>
            {other.seed === current.seed && <p className="rv-chip inline">Same opening (seed {current.seedCode || current.seed})</p>}
            <div className="rv-compare-grid">
              {[current, other].map((r) => (
                <div key={r.saveId ?? r.date} className={`rv-card ${r === current ? 'me' : ''}`}>
                  <div className="rv-caps">{label(r)}</div>
                  <div className="rv-compare-total num">
                    {r.presidencyScore} <small>/ 1000 · {r.grade} · {'★'.repeat(r.stars)}</small>
                  </div>
                  <ul className="rv-compare-parts">
                    {PARTS.map((p, i) => (
                      <li key={p}>
                        <span>{p}</span>
                        <span className="rv-bar" aria-hidden>
                          <b style={{ width: `${Math.min(100, ((r.parts[i] ?? 0) / PART_MAX[i]) * 100)}%` }} />
                        </span>
                        <b className="num">{r.parts[i] ?? 0}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {(['approval', 'score'] as const).map((k) => {
              const series = [
                { id: 'a', label: 'This run', values: current.series?.[k] ?? [], color: '#f2a93b' },
                { id: 'b', label: label(other), values: other.series?.[k] ?? [], color: '#a3aebf', dashed: true },
              ].filter((s) => s.values.length > 0);
              if (!series.length) return null;
              const n = Math.max(...series.map((s) => s.values.length));
              const xl = Array.from({ length: n }, (_, i) => String(i + 1));
              return (
                <div key={k} className="rv-card">
                  <div className="rv-caps">{k === 'approval' ? 'Approval by month' : 'Score by month'}</div>
                  {table ? (
                    <SeriesTable series={series} xLabels={xl} unit={k === 'approval' ? '%' : ''} caption={k === 'approval' ? 'Approval by month' : 'Score by month'} />
                  ) : (
                    <MiniChart series={series} xLabels={xl} title={k === 'approval' ? 'Approval by month' : 'Score by month'} unit={k === 'approval' ? '%' : ''} height={150} markers={split ? [{ index: split.turn, label: 'split' }] : []} />
                  )}
                </div>
              );
            })}
            <button type="button" className="rv-link small" onClick={() => setTable((v) => !v)} aria-pressed={table}>
              {table ? 'Show the charts' : 'Show as tables'}
            </button>
            <div className="rv-card">
              <div className="rv-caps">Seals</div>
              <AchDiff a={current.achievements} b={other.achievements} names={names} otherLabel={label(other)} />
            </div>
            <div className="rv-card">
              <div className="rv-caps">Crisis choices, month by month</div>
              {rows.length === 0 ? (
                <p className="rv-hint">No crisis choices were recorded for these runs.</p>
              ) : (
                <table className="rv-choices">
                  <thead>
                    <tr>
                      <th scope="col">Month</th>
                      <th scope="col">This run</th>
                      <th scope="col">{label(other)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isSplit = split?.turn === row.turn;
                      return (
                        <tr key={row.turn} className={isSplit ? 'split' : ''}>
                          <th scope="row" className="num">
                            {row.turn + 1}
                          </th>
                          <td>
                            {row.a ? (
                              <>
                                <small>{row.a.title}</small>
                                {row.a.choice}
                              </>
                            ) : (
                              <span className="rv-hint">no crisis</span>
                            )}
                          </td>
                          <td>
                            {row.b ? (
                              <>
                                <small>{row.b.title}</small>
                                {row.b.choice}
                              </>
                            ) : (
                              <span className="rv-hint">no crisis</span>
                            )}
                            {isSplit && <span className="rv-split-tag">Your choices split here</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {!split && rows.length > 0 && <p className="rv-hint">Your crisis choices never split: the difference came from your orders.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AchDiff({ a, b, names, otherLabel }: { a: string[]; b: string[]; names: Record<string, string>; otherLabel: string }) {
  const gained = a.filter((x) => !b.includes(x));
  const lost = b.filter((x) => !a.includes(x));
  const both = a.filter((x) => b.includes(x));
  const n = (id: string) => names[id] ?? id.replace(/_/g, ' ');
  return (
    <dl className="rv-achdiff">
      <div>
        <dt>Only this run</dt>
        <dd>{gained.length ? gained.map(n).join(', ') : 'none'}</dd>
      </div>
      <div>
        <dt>Only the {otherLabel}</dt>
        <dd>{lost.length ? lost.map(n).join(', ') : 'none'}</dd>
      </div>
      <div>
        <dt>Both</dt>
        <dd>{both.length ? both.map(n).join(', ') : 'none'}</dd>
      </div>
    </dl>
  );
}
