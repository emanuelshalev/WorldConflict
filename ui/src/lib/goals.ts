import { create } from 'zustand';
import type { ConditionStatus, ObjectiveState } from '../store/gameStore';

/**
 * Goal line helpers (design-month.md 3.3): an objective's state, its metric in words, now and
 * need, this month's step, and the step highlight shared by the cards and the advisors.
 */

/** Which objective the player asked to see highlighted (the step tap), for 2.4 s. */
export const useGoalHighlight = create<{ index: number | null; nonce: number; point: (i: number) => void }>((set) => ({
  index: null,
  nonce: 0,
  point: (i) => {
    const nonce = Date.now();
    set({ index: i, nonce });
    window.setTimeout(() => {
      if (useGoalHighlight.getState().nonce === nonce) set({ index: null });
    }, 2400);
  },
}));

export const STATE_WORD: Record<ObjectiveState, string> = { on_track: 'On track', close: 'Close', off_track: 'Off track', failed: 'Failed' };

/** A condition's state, also for older payloads without one. */
export function stateOf(c: ConditionStatus): ObjectiveState {
  return c.state ?? (c.failed ? 'failed' : c.met ? 'on_track' : 'off_track');
}

/** The metric a condition counts, in words: "stability", "front", "score", "US relations". */
export function metricWord(c: ConditionStatus): string {
  const inner = /\(([^)]+)\)/.exec(c.label)?.[1] ?? '';
  if (c.unit === '%') {
    const stat = /approval|stability|legitimacy/i.exec(inner || c.label)?.[0];
    return stat ? stat.toLowerCase() : (c.short ?? 'it');
  }
  if (c.unit === 'front') return 'front';
  if (c.unit === 'score') return 'score';
  if (c.unit === 'view') {
    const who = inner.replace(/[\d+%-]+.*$/, '').trim();
    // "US relations 70+" names the country; a bare "relations 61+" leaves it to the label
    return who && who.toLowerCase() !== 'relations' ? who : `${c.short ?? 'their view of you'}:`;
  }
  return c.short ?? c.label;
}

const fmt = (v: number, unit?: string) => `${Math.round(v)}${unit === '%' ? '%' : ''}`;

/** "stability 62%, needs 78%", or null when the condition has no number. */
export function nowNeed(c: ConditionStatus): string | null {
  if (c.now === undefined || c.need === undefined) return null;
  return `${metricWord(c)} ${fmt(c.now, c.unit)}, needs ${fmt(c.need, c.unit)}`;
}

/** This month's step: the engine's pick, else the off-track objective with the largest gap. */
export function stepObjective(status: ConditionStatus[]): number {
  const marked = status.findIndex((c) => c.step && !c.bonus);
  if (marked >= 0) return marked;
  let best = -1;
  let gap = -1;
  status.forEach((c, i) => {
    if (c.bonus || stateOf(c) === 'on_track' || stateOf(c) === 'failed' || c.now === undefined || c.need === undefined) return;
    const g = Math.abs(c.need - c.now) / Math.max(1, Math.abs(c.need));
    if (g > gap) {
      gap = g;
      best = i;
    }
  });
  return best;
}

