import type { JSX } from 'react';
import { metCount } from '../../lib/learn';
import { useGameStore } from '../../store/gameStore';
import { useExplain } from './explain';

/** "You met N new entries" for the end screen (this session's finds), with a link to the codex. */
export function CodexEndLine(): JSX.Element | null {
  const metNow = useExplain((s) => s.metThisSession.length);
  const total = useGameStore((s) => metCount(s.learn));
  const openCodex = useExplain((s) => s.openCodex);
  if (total === 0) return null;
  return (
    <p className="lx-endline">
      {metNow > 0 ? `You met ${metNow} new ${metNow === 1 ? 'entry' : 'entries'} in the codex this game.` : `${total} entries in your codex.`}{' '}
      <button type="button" className="link" onClick={() => openCodex()}>
        Open the codex
      </button>
    </p>
  );
}
