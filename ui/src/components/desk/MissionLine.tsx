import { IconTarget } from '@tabler/icons-react';
import { useGameStore } from '../../store/gameStore';
import { goalPunct, missionSentence } from '../../lib/goals';
import { MISSION_SENTENCE_ID } from '../../lib/month';
import '../../styles/month.css';

/**
 * Month 1: the one goal the player is judged on, in one plain sentence above the crisis (F-02-1).
 * Goal names are plain text, not pressable (design-agenda 0.8: no text links on the desk); the
 * Mission button in the state band opens what each goal needs.
 */
export function MissionLine() {
  const world = useGameStore((s) => s.worldState);
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
                <b className="mission-goal">{g.text}</b>
                {after}
              </span>
              {join}
            </span>
          );
        })}
      </span>
    </p>
  );
}

