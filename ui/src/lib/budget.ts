import { MEETING_SLOTS, type GameState, useGameStore } from '../store/gameStore';
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

export interface BudgetStatus {
  pc: { bank: number; crisis: number; meetings: number; orders: number; left: number; cap: number };
  defense: { budgetM: number; share: number; users: string[] };
  orders: { used: number; max: number };
  inPerson: { used: number; max: number };
  /** Why Execute is blocked, or null. */
  blocked: string | null;
}

/** The four monthly budgets the player spends: political capital, defense money, order slots, meetings. */
export function budgetStatus(state: GameState = useGameStore.getState()): BudgetStatus | null {
  const world = state.worldState;
  if (!world) return null;
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  const crisis = state.pendingDecisions.reduce((sum, d) => {
    const o = d.options.find((x) => x.id === (state.decisionChoices[d.id] ?? d.defaultOptionId ?? d.options[0]?.id));
    return sum + (o?.effects.pc ?? 0);
  }, 0);
  const meetings = (world.agenda ?? []).reduce((sum, m) => {
    const o = m.options.find((x) => x.id === state.decisionChoices[m.id]);
    return sum + (o?.effects.pc ?? 0);
  }, 0);
  const orders = state.pendingActions.reduce((s, a) => s + pcCost(a.type), 0);
  // Same rule as capitalLeft(): the bank plus crisis and meeting answers can't go below zero
  const left = Math.max(0, world.politicalCapital + crisis + meetings) - orders;
  const share = state.pendingActions.reduce((s, a) => s + budgetShare(a.type), 0);
  const users = state.pendingActions.filter((a) => budgetShare(a.type) > 0).map((a) => a.label);
  const budgetM = me ? (me.gdp * (me.militaryBudgetPercent / 100)) / 12 / 1e6 : 0;
  const used = state.pendingActions.length;
  const attended = (world.agenda ?? []).filter((m) => state.decisionChoices[m.id] && state.decisionChoices[m.id] !== m.defaultOptionId).length;
  const blocked =
    left < 0
      ? `Over political capital by ${-left}: remove an order`
      : share > 1
        ? 'Over the defense budget: remove a military order'
        : used > MAX_ORDERS
          ? `At most ${MAX_ORDERS} orders a month`
          : attended > MEETING_SLOTS
            ? `At most ${MEETING_SLOTS} meetings in person`
            : null;
  return {
    pc: { bank: world.politicalCapital, crisis, meetings, orders, left, cap: 6 },
    defense: { budgetM, share, users },
    orders: { used, max: MAX_ORDERS },
    inPerson: { used: attended, max: MEETING_SLOTS },
    blocked,
  };
}

export function money(m: number): string {
  return m >= 1000 ? `$${(m / 1000).toFixed(1)}B` : `$${Math.round(m)}M`;
}
