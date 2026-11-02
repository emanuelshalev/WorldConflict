import { MEETING_SLOTS, capitalLeft, type GameState, useGameStore } from '../store/gameStore';
import { pcCost } from './actions';

/** Share of the monthly defense budget each order uses. Mirrors src/core/costs.ts BUDGET_SHARE. */
export const BUDGET_SHARE: Record<string, number> = {
  MILITARY_MOBILIZE: 0.12,
  MILITARY_PROCURE: 0.3,
  MILITARY_AIRSTRIKE: 0.08,
  MILITARY_DEPLOY_BORDER: 0.06,
  NUCLEAR_FUND_PROGRAM: 0.15,
};
export const MAX_ORDERS = 6; // turn.ts MAX_ORDERS
export const budgetShare = (type: string) => BUDGET_SHARE[type] ?? 0;

export interface Budget {
  key: 'pc' | 'defense' | 'orders' | 'meetings';
  label: string;
  used: number;
  total: number;
  /** How the numbers read on screen, e.g. "◆ 3 of 4". */
  text: string;
  over: boolean;
}

/** The four monthly budgets the player spends: political capital, defense money, order slots, meetings. */
export function budgets(state: GameState = useGameStore.getState()): Budget[] {
  const world = state.worldState;
  if (!world) return [];
  const pcLeft = capitalLeft(state);
  const pcSpent = state.pendingActions.reduce((s, a) => s + pcCost(a.type), 0);
  const pcTotal = pcLeft + pcSpent;
  const defense = state.pendingActions.reduce((s, a) => s + budgetShare(a.type), 0);
  const orders = state.pendingActions.length;
  const attended = (world.agenda ?? []).filter((m) => state.decisionChoices[m.id] && state.decisionChoices[m.id] !== m.defaultOptionId).length;
  return [
    { key: 'pc', label: 'Political capital', used: pcSpent, total: pcTotal, text: `◆ ${Math.max(0, pcLeft)} left of ${pcTotal}`, over: pcLeft < 0 },
    { key: 'defense', label: 'Defense budget', used: Math.round(defense * 100), total: 100, text: `${Math.round(defense * 100)}% of this month's`, over: defense > 1 },
    { key: 'orders', label: 'Orders', used: orders, total: MAX_ORDERS, text: `${orders} of ${MAX_ORDERS}`, over: orders > MAX_ORDERS },
    { key: 'meetings', label: 'In person', used: attended, total: MEETING_SLOTS, text: `${attended} of ${MEETING_SLOTS} meetings`, over: attended > MEETING_SLOTS },
  ];
}
