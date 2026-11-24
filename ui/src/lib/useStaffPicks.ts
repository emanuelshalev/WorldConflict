import { useGameStore } from '../store/gameStore';
import { staffPickItems, staffPicksBreakdown } from './month';

/** The pending picks, re-read on every change that can add, approve or alter one. */
export function useStaffPicks() {
  useGameStore((s) => s.worldState);
  useGameStore((s) => s.pendingDecisions);
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.missionImpact);
  useGameStore((s) => s.orderImpact);
  useGameStore((s) => s.skipped);
  const items = staffPickItems();
  const counted = items.filter((x) => x.fits);
  return {
    items,
    n: counted.length,
    breakdown: staffPicksBreakdown(items),
    against: counted.filter((x) => x.tag?.tone === 'risk').length,
  };
}
