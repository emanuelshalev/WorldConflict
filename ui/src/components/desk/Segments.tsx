import type { ConditionStatus } from '../../store/gameStore';
import { stateOf, useGoalHighlight } from '../../lib/goals';
import '../../styles/month.css';

/** One segment per primary objective, a dot per bonus (the result card and the Mission sheet; never next to a button, AF-12). */
export function Segments({ status, size = 'md' }: { status: ConditionStatus[]; size?: 'md' | 'lg' }) {
  const primary = status.filter((c) => !c.bonus);
  const bonus = status.filter((c) => c.bonus);
  const hl = useGoalHighlight((s) => s.index);
  return (
    <span className={`goal-segs seg-${size}`} aria-hidden>
      {primary.map((c, i) => (
        <i key={c.label} className={`gseg s-${stateOf(c)}${hl === i ? ' is-pointed' : ''}`} />
      ))}
      {bonus.length > 0 && <span className="gseg-gap" />}
      {bonus.map((c) => (
        <i key={c.label} className={`gdot s-${stateOf(c)}`} />
      ))}
    </span>
  );
}
