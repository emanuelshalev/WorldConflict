import { useEffect, useRef } from 'react';
import { executeTurn, useGameStore } from '../store/gameStore';
import { budgetStatus } from './budget';

/** Execute with the double-click guard: a fresh month ignores Execute briefly. */
export function useExecute(): { run: () => void; disabled: boolean; reason: string | null; loading: boolean } {
  const turn = useGameStore((s) => s.worldState?.turn ?? -1);
  const loading = useGameStore((s) => s.isLoading);
  useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.decisionChoices);
  const advancedAt = useRef(0);
  useEffect(() => {
    advancedAt.current = Date.now();
  }, [turn]);
  const reason = budgetStatus()?.blocked ?? null;
  return {
    run: () => {
      if (reason || loading || Date.now() - advancedAt.current < 900) return;
      void executeTurn();
    },
    disabled: !!reason || loading,
    reason,
    loading,
  };
}
