import { create } from 'zustand';
import type { ScoreMove, ScorePart } from '../store/gameStore';

/** Why your score moved (design-month.md 6.1): the one-line explanation and the sheet's open state. */

export const useScoreWhy = create<{ open: boolean; show: (open: boolean) => void }>((set) => ({ open: false, show: (open) => set({ open }) }));

export const PART_NAME: Record<keyof ScoreMove['components'], string> = { economic: 'Economy', security: 'Security', approval: 'Approval', prestige: 'Standing' };
export const SCORE_ORDER: Array<keyof ScoreMove['components']> = ['economic', 'security', 'approval', 'prestige'];
export const r = (v: number) => Math.round(v);
export const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(Math.round(v))}`;

/** The terms that move a part, biggest first, without the fixed base. */
export function movers(p: ScorePart) {
  return [...p.terms].filter((t) => !/^Base$/.test(t.label) && Math.abs(t.points) >= 0.5).sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
}

/** "Score 97 → 95. Security is pulled down by the war with India; approval lifted it. Heading to 88 if nothing changes." */
export function scoreLine(s: ScoreMove | undefined): string | null {
  if (!s) return null;
  // The part pulling hardest each way: a part whose heading is below where it is now pulls down
  const pulls = SCORE_ORDER.map((k) => ({ k, p: s.components[k], gap: s.components[k].target - s.components[k].after }));
  const down = [...pulls].sort((a, b) => a.gap - b.gap)[0];
  const up = [...pulls].sort((a, b) => b.gap - a.gap)[0];
  const neg = down && down.gap < -0.5 ? movers(down.p).find((t) => t.points < 0) : undefined;
  const pos = up && up.gap > 0.5 ? movers(up.p).find((t) => t.points > 0) : undefined;
  const bits: string[] = [];
  if (down && down.gap < -0.5) bits.push(`${PART_NAME[down.k]} is pulled down${neg ? ` (${neg.label.toLowerCase()})` : ''}`);
  if (up && up.gap > 0.5) bits.push(`${PART_NAME[up.k].toLowerCase()} lifts it${pos ? ` (${pos.label.toLowerCase()})` : ''}`);
  const why = bits.length ? `${bits.join('; ').replace(/^./, (c) => c.toUpperCase())}. ` : '';
  return `Score ${r(s.before)} → ${r(s.after)}. ${why}Heading to ${r(s.heading)} if nothing changes.`;
}

