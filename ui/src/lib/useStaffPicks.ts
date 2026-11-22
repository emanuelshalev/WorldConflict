import { create } from 'zustand';
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
  const items = staffPickItems();
  const counted = items.filter((x) => x.fits);
  return {
    items,
    n: counted.length,
    breakdown: staffPicksBreakdown(items),
    against: counted.filter((x) => x.tag?.tone === 'risk').length,
  };
}

const OPEN_KEY = 'worldconflict.recommendedOpen';

/**
 * Map mode: whether the Recommended list is open (D-72: it starts folded behind "Review n
 * recommended"). Shared, because the strip shows the folded button in its act row and the open
 * list in a row of its own (QA AC3: folded, the globe keeps its full height).
 */
export const useRecommendedOpen = create<{ open: boolean; openedAt: number; setOpen: (v: boolean) => void }>((set) => ({
  open: (() => {
    try {
      return localStorage.getItem(OPEN_KEY) === '1';
    } catch {
      return false;
    }
  })(),
  openedAt: 0,
  setOpen: (v) => {
    try {
      localStorage.setItem(OPEN_KEY, v ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
    set({ open: v, openedAt: v ? Date.now() : 0 });
  },
}));
