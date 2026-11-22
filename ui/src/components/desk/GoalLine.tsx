import { IconLayoutColumns, IconLayoutList, IconTarget } from '@tabler/icons-react';
import { type ConditionStatus, useGameStore } from '../../store/gameStore';
import { nowNeed, stateOf, stepObjective, useGoalHighlight } from '../../lib/goals';
import '../../styles/month.css';

/**
 * The goal line (design-month.md 3.3): one row under the HUD on the desk and the map. The mission,
 * one segment per primary objective, "1 of 4 on track · month 1 of 12", and this month's step.
 * The step highlights every option and suggestion that moves it; the rest of the row opens the
 * Mission sheet. Never a bare "2/4".
 */

export function Segments({ status, size = 'md' }: { status: ConditionStatus[]; size?: 'md' | 'lg' }) {
  const primary = status.filter((c) => !c.bonus);
  const bonus = status.filter((c) => c.bonus);
  return (
    <span className={`goal-segs seg-${size}`} aria-hidden>
      {primary.map((c) => (
        <i key={c.label} className={`gseg s-${stateOf(c)}`} />
      ))}
      {bonus.length > 0 && <span className="gseg-gap" />}
      {bonus.map((c) => (
        <i key={c.label} className={`gdot s-${stateOf(c)}`} />
      ))}
    </span>
  );
}

export function GoalLine() {
  const world = useGameStore((s) => s.worldState);
  const status = useGameStore((s) => s.objectiveStatus);
  const setDrawer = useGameStore((s) => s.setDrawer);
  const deskMode = useGameStore((s) => s.deskMode);
  const deskView = useGameStore((s) => s.deskView);
  const setDeskView = useGameStore((s) => s.setDeskView);
  const gameOver = useGameStore((s) => s.gameOver);
  const point = useGoalHighlight((s) => s.point);
  if (!world || gameOver) return null;
  const primary = status.filter((c) => !c.bonus);
  const onTrack = primary.filter((c) => stateOf(c) === 'on_track').length;
  const month = Math.min(world.turn + 1, world.maxTurns);
  const title = world.objective?.title ?? 'Stay in power';
  const step = stepObjective(status);
  const stepC = step >= 0 ? status[step] : undefined;
  const stepText = stepC ? nowNeed(stepC) ?? stepC.short ?? stepC.label : null;
  const summary = primary.length ? `${onTrack} of ${primary.length} on track · month ${month} of ${world.maxTurns}` : `Month ${month} of ${world.maxTurns}`;
  return (
    <div className="goal-line" data-point="mission">
      <button type="button" className="goal-main" onClick={() => setDrawer('objective')} aria-label={`Mission: ${title}. ${summary}. Open the mission sheet`}>
        <IconTarget size={18} className="goal-icon" aria-hidden />
        <b className="goal-title">{title}</b>
        {primary.length > 0 && <Segments status={status} />}
        <span className="goal-sum num">{summary}</span>
      </button>
      {stepText && stepC && (
        <button type="button" className="goal-step" onClick={() => point(step)} title={`This month: ${stepText}. Press to see what moves it.`}>
          <span className="goal-step-k">This month:</span> <b>{stepText}</b>
        </button>
      )}
      {deskMode === 'desk' && (
        <div className="goal-view seg" role="tablist" aria-label="Desk view">
          <button type="button" role="tab" aria-selected={deskView === 'focus'} aria-label="Focus view" className={deskView === 'focus' ? 'on' : ''} onClick={() => setDeskView('focus')}>
            <IconLayoutList size={15} aria-hidden /> <span className="gv-word">Focus</span>
          </button>
          <button type="button" role="tab" aria-selected={deskView === 'full'} aria-label="Full desk" className={deskView === 'full' ? 'on' : ''} onClick={() => setDeskView('full')}>
            <IconLayoutColumns size={15} aria-hidden /> <span className="gv-word">Full desk</span>
          </button>
        </div>
      )}
    </div>
  );
}
