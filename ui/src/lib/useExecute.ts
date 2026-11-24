import { useEffect } from 'react';
import { executeTurn, useGameStore } from '../store/gameStore';
import { budgetStatus } from './budget';

/**
 * When the current month first appeared, shared by every Execute button: the double-click guard
 * belongs to the month, not to a button. (Per button it ignored the first press on an Execute that
 * had just mounted, such as the phone's review screen or the Plan's bar after a resize.)
 */
const seen = { turn: -1, at: 0 };

/** Execute with the double-click guard: a fresh month ignores Execute briefly. */
export function useExecute(): { run: () => void; disabled: boolean; reason: string | null; loading: boolean } {
  const turn = useGameStore((s) => s.worldState?.turn ?? -1);
  const loading = useGameStore((s) => s.isLoading);
  useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.decisionChoices);
  useEffect(() => {
    if (seen.turn !== turn) {
      seen.turn = turn;
      seen.at = Date.now();
    }
  }, [turn]);
  const reason = budgetStatus()?.blocked ?? null;
  return {
    run: () => {
      if (reason || loading || Date.now() - seen.at < 900) return;
      void executeTurn();
    },
    disabled: !!reason || loading,
    reason,
    loading,
  };
}
