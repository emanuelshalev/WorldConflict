import { IconLayoutColumns, IconLayoutList, IconTarget } from '@tabler/icons-react';
import { type ConditionStatus, useGameStore } from '../../store/gameStore';
import { goalPunct, missionSentence, missionSummary, nowNeed, stateOf, stepObjective, useGoalHighlight } from '../../lib/goals';
import { MISSION_SENTENCE_ID, showMissionSentence } from '../../lib/month';
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
  const title = world.objective?.title ?? 'Stay in power';
  const step = stepObjective(status);
  const stepC = step >= 0 ? status[step] : undefined;
  const stepText = stepC ? nowNeed(stepC) ?? stepC.short ?? stepC.label : null;
  const summary = missionSummary(status, world.turn, world.maxTurns);
  // Month 1: the goal line links to the one-sentence goal above the crisis instead of a step
  const first = world.turn === 0;
  return (
    <div className="goal-line" data-point="mission">
      <button type="button" className="goal-main" onClick={() => setDrawer('objective')} aria-label={`Mission: ${title}. ${summary}. Open the mission sheet`}>
        <IconTarget size={18} className="goal-icon" aria-hidden />
        <b className="goal-title">{title}</b>
        {primary.length > 0 && <Segments status={status} />}
        <span className="goal-sum num">{summary}</span>
      </button>
      {first && (
        <button type="button" className="goal-step goal-link" onClick={showMissionSentence} data-goal-link="">
          <span className="goal-step-k">How you win:</span> <b>read your goal</b>
        </button>
      )}
      {!first && stepText && stepC && (
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

/**
 * Month 1: the one goal the player is judged on, in one plain sentence above the crisis (F-02-1).
 * Each goal name points at its goal-line segment and at the options that move it.
 */
export function MissionLine() {
  const world = useGameStore((s) => s.worldState);
  const point = useGoalHighlight((s) => s.point);
  if (!world || world.turn !== 0) return null;
  const m = missionSentence({ objective: world.objective, maxTurns: world.maxTurns });
  return (
    <p className="mission-line" id={MISSION_SENTENCE_ID} tabIndex={-1} data-mission-sentence="">
      <IconTarget size={18} className="goal-icon" aria-hidden />
      <span>
        <b className="mission-line-k">Your goal. </b>
        {m.lead}
        {m.goals.map((g, i) => {
          // The punctuation stays glued to its goal, so a comma never wraps onto a line of its own
          const { after, join } = goalPunct(i, m.goals.length);
          return (
            <span key={g.index}>
              <span className="mission-goal-unit">
                {/* The punctuation sits inside the button's box (a button is laid out as an
                    inline block), after the last word, so it wraps with it on the phone (RC-5);
                    only the goal text is underlined and named */}
                <button type="button" className="mission-goal" onClick={() => point(g.index)} title="Show it in the goal line and what moves it">
                  <span className="mission-goal-text">{g.text}</span>
                  {after && (
                    <span className="mission-goal-punct" aria-hidden>
                      {after}
                    </span>
                  )}
                </button>
              </span>
              {join}
            </span>
          );
        })}
      </span>
    </p>
  );
}

