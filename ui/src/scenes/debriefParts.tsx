import { useCountUp } from '../lib/useCountUp';
import { factTone, fmtValue, shownDelta, signed } from '../lib/numbers';
import type { ReportFact } from '../store/gameStore';

/**
 * One number that moved: label, before to after, and a bar. A month stat inside a card is that
 * move's share ("Approval, from this: −2.9"): the month's own value lives on the tiles, so the two
 * never show different "after" numbers (lib/numbers.ts). Colour follows good or bad for you.
 */
export function FactRow({ f, i }: { f: ReportFact; i: number }) {
  const delta = shownDelta(f.before, f.after, f.unit, f.share);
  const v = useCountUp(f.after - f.before, 900, 300 + i * 180);
  const tone = factTone(f);
  const unit = f.unit && f.unit !== 'troops' ? f.unit : '';
  const scale = Math.max(Math.abs(f.before), Math.abs(f.after), 1);
  if (f.share)
    return (
      <li className={`fact share ${tone}`} style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
        <span className="fact-label">
          {f.label}
          {/ from your move$/.test(f.label) ? '' : ', from this'}
        </span>
        <span className="fact-nums num">
          <em className="fact-chip">{tone === 'flat' ? 'no change' : signed(delta)}</em>
          {unit && <small>{unit}</small>}
        </span>
      </li>
    );
  return (
    <li className={`fact ${tone}`} style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
      <span className="fact-label">{f.label}</span>
      <span className="fact-nums num">
        {fmtValue(f.before, f.unit)}
        <i aria-hidden> → </i>
        <b>{fmtValue(f.before + v, f.unit)}</b>
        {unit && <small>{unit}</small>}
        {tone !== 'flat' && <em className="fact-chip">{signed(delta)}</em>}
      </span>
      <span className="fact-bar" aria-hidden>
        <span className="fb-before" style={{ width: `${(Math.abs(f.before) / scale) * 100}%` }} />
        <span className="fb-after" style={{ width: `${(Math.abs(f.before + v) / scale) * 100}%` }} />
      </span>
    </li>
  );
}

/**
 * A HUD stat counting from its value last month to now. The delta is coloured good or bad for the
 * player (a drop in world tension is good), the same rule as every fact (lib/numbers.ts).
 */
export function StatCount({ label, before, after, i, suffix = '' }: { label: string; before: number; after: number; i: number; suffix?: string }) {
  const d = after - before;
  const v = useCountUp(d, 900, 400 + i * 150);
  const tone = Math.abs(d) <= 0.4 ? 'flat' : factTone({ label, before, after });
  return (
    <div className={`db-stat ${tone}`}>
      <span className="db-stat-label">{label}</span>
      <span className="db-stat-value num">
        {(before + v).toFixed(Math.abs(after) >= 100 ? 0 : 1)}
        {suffix}
      </span>
      <span className="db-stat-delta num">{Number.isInteger(d) ? signed(d) : `${d > 0 ? '+' : ''}${d.toFixed(Math.abs(d) >= 10 ? 0 : 1)}`}</span>
    </div>
  );
}
