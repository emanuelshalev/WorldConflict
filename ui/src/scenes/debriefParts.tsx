import { useCountUp } from '../lib/useCountUp';
import type { ReportFact } from '../store/gameStore';

const fmtNum = (v: number, unit?: string) => {
  if (unit === 'troops' || Math.abs(v) >= 1000) return Math.round(v).toLocaleString('en-US');
  return (Math.round(v * 10) / 10).toString();
};

/** One number that moved: label, animated before to after, and a coloured bar. */
export function FactRow({ f, i }: { f: ReportFact; i: number }) {
  const delta = f.after - f.before;
  const v = useCountUp(delta, 900, 300 + i * 180);
  const good = Math.abs(delta) < 0.05 ? null : (delta > 0) === (f.good ?? true);
  const unit = f.unit && f.unit !== 'troops' ? f.unit : '';
  const scale = Math.max(Math.abs(f.before), Math.abs(f.after), 1);
  return (
    <li className={`fact ${good === null ? 'flat' : good ? 'good' : 'bad'}`} style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
      <span className="fact-label">{f.label}</span>
      <span className="fact-nums num">
        {fmtNum(f.before, f.unit)}
        <i aria-hidden> → </i>
        <b>{fmtNum(f.before + v, f.unit)}</b>
        {unit && <small>{unit}</small>}
        {Math.abs(delta) >= 0.05 && (
          <em className="fact-chip">
            {delta > 0 ? '+' : ''}
            {fmtNum(delta, f.unit)}
          </em>
        )}
      </span>
      <span className="fact-bar" aria-hidden>
        <span className="fb-before" style={{ width: `${(Math.abs(f.before) / scale) * 100}%` }} />
        <span className="fb-after" style={{ width: `${(Math.abs(f.before + v) / scale) * 100}%` }} />
      </span>
    </li>
  );
}

/** A HUD stat counting from its value last month to now. */
export function StatCount({ label, before, after, i, suffix = '' }: { label: string; before: number; after: number; i: number; suffix?: string }) {
  const d = after - before;
  const v = useCountUp(d, 900, 400 + i * 150);
  const dir = d > 0.4 ? 'up' : d < -0.4 ? 'down' : 'flat';
  return (
    <div className={`db-stat ${dir}`}>
      <span className="db-stat-label">{label}</span>
      <span className="db-stat-value num">
        {(before + v).toFixed(Math.abs(after) >= 100 ? 0 : 1)}
        {suffix}
      </span>
      <span className="db-stat-delta num">
        {d > 0 ? '+' : ''}
        {d.toFixed(Math.abs(d) >= 10 ? 0 : 1)}
      </span>
    </div>
  );
}
