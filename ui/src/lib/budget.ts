import { MEETING_SLOTS, type GameState, committedActions, crisisAnswer, useGameStore } from '../store/gameStore';
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
  /** Staff proposals waiting for approval (F-02-4): what they would cost, held by nothing yet. */
  proposed: { count: number; pc: number; labels: string[] };
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
  // A chosen answer on the mission side also pays its price (D-84, src/core/costs.ts PUSH_PC):
  // the same rule as capitalLeft(), so the meters show what the engine will charge
  const price = (id: string, optionId: string | undefined) => (optionId ? (state.advice?.prices?.[id]?.[optionId] ?? 0) : 0);
  const crisis = state.pendingDecisions.reduce((sum, d) => {
    const o = crisisAnswer(state, d);
    return sum + (o?.effects.pc ?? 0) - price(d.id, state.decisionChoices[d.id]);
  }, 0);
  const meetings = (world.agenda ?? []).reduce((sum, m) => {
    const o = m.options.find((x) => x.id === state.decisionChoices[m.id]);
    return sum + (o?.effects.pc ?? 0) - (o && o.id !== m.defaultOptionId ? price(m.id, o.id) : 0);
  }, 0);
  // Staff proposals spend nothing until approved (F-02-4)
  const committed = committedActions(state.pendingActions);
  const waiting = state.pendingActions.filter((a) => a.proposed);
  const orders = committed.reduce((s, a) => s + pcCost(a.type), 0);
  // Same rule as capitalLeft(): the bank plus crisis and meeting answers can't go below zero
  const left = Math.max(0, world.politicalCapital + crisis + meetings) - orders;
  const share = committed.reduce((s, a) => s + budgetShare(a.type), 0);
  const users = committed.filter((a) => budgetShare(a.type) > 0).map((a) => a.label);
  const budgetM = me ? (me.gdp * (me.militaryBudgetPercent / 100)) / 12 / 1e6 : 0;
  const used = committed.length;
  const attended = (world.agenda ?? []).filter((m) => state.decisionChoices[m.id] && state.decisionChoices[m.id] !== m.defaultOptionId).length;
  const blocked =
    left < 0
      ? `Over political capital by ${-left}: remove an order`
      : share > 1
        ? 'Over the defense budget: remove a military order'
        : used > MAX_ORDERS
          ? `At most ${MAX_ORDERS} orders a month`
          : attended > MEETING_SLOTS
            ? `At most ${MEETING_SLOTS} meetings a month: let your ministers take one`
            : null;
  return {
    pc: { bank: world.politicalCapital, crisis, meetings, orders, left, cap: 6 },
    proposed: { count: waiting.length, pc: waiting.reduce((s, a) => s + pcCost(a.type), 0), labels: waiting.map((a) => a.label) },
    defense: { budgetM, share, users },
    orders: { used, max: MAX_ORDERS },
    inPerson: { used: attended, max: MEETING_SLOTS },
    blocked,
  };
}

/**
 * Political capital in one picture, the single source for every sentence that names a number
 * (design review DR-INT-2): what you have now (the bank), what this month's choices spend (the
 * band's rule, budgetStatus: answers with their D-84 price, an open call at what leaving it does,
 * chosen orders), what is left at Execute (the band's number), and what you start next month
 * with (the engine's rule, turn.ts: left plus the monthly income, capped). `free` is capital a
 * sentence assumes is not spent (Hold this month frees nothing: no move order is chosen then).
 */
export interface CapitalOutlook {
  now: number;
  spent: number;
  left: number;
  income: number;
  cap: number;
  next: number;
  /** Next month's income that does not fit under the cap. */
  lost: number;
}

export function capitalOutlook(state: GameState = useGameStore.getState(), free = 0): CapitalOutlook | null {
  const b = budgetStatus(state);
  if (!b) return null;
  const cap = state.pcCap || b.pc.cap;
  const income = state.pcIncome;
  const left = b.pc.left + free;
  const now = b.pc.bank;
  const kept = Math.max(0, left);
  return { now, spent: now - left, left, income, cap, next: Math.min(cap, kept + income), lost: Math.max(0, kept + income - cap) };
}

/** "◆ 2 is lost: you can hold at most ◆ 6" when next month's income overflows, else ''. */
const lostWords = (o: CapitalOutlook) => (o.lost ? ` (◆ ${o.lost} of the new capital is lost: you can hold at most ◆ ${o.cap})` : '');

/**
 * The plan's capital line: "Political capital: ◆ 5 now, ◆ 3 spent this month, ◆ 2 left. You start
 * next month with ◆ 5 (+3)."
 */
export function capitalLine(state: GameState = useGameStore.getState()): string {
  const o = capitalOutlook(state);
  if (!o) return '';
  const use = o.spent > 0 ? `◆ ${o.spent} spent this month` : o.spent < 0 ? `◆ ${-o.spent} gained this month` : 'nothing spent this month';
  return `Political capital: ◆ ${o.now} now, ${use}, ◆ ${o.left} left. You start next month with ◆ ${o.next} (+${o.income})${lostWords(o)}.`;
}

/** What holding (no order) keeps, after the month's other choices: "◆ 1 is left, and you start next month with ◆ 4." */
export function keepLine(state: GameState = useGameStore.getState(), free = 0): string {
  const o = capitalOutlook(state, free);
  if (!o) return '';
  return `After your other choices ◆ ${o.left} is left, and you start next month with ◆ ${o.next}${lostWords(o)}.`;
}

export function money(m: number): string {
  return m >= 1000 ? `$${(m / 1000).toFixed(1)}B` : `$${Math.round(m)}M`;
}
