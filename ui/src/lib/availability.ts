import type { OrderAvailability, OrderBlock, PreviewEffect } from '../store/gameStore';
import { pcCost } from './actions';

/**
 * The client month layer of order availability (design-orders.md §3). The rule layer (wars, pacts,
 * warheads, stability) comes from the server, once per target, in `POST /api/orders/menu`; this
 * file adds what the unsent month decides (capital left, orders this month, defense budget left,
 * duplicates) and composes both in the engine's precedence order. The copy mirrors `monthBlock()`
 * in `src/core/availability.ts` word for word (`tests/ui-availability.spec.ts` compares them).
 *
 * Pure: no store, no React, no fetch (hooks live in `components/orders/useOrders.ts`).
 */

/** Player orders per month. Mirrors src/core/costs.ts MAX_ORDERS. */
export const MAX_ORDERS = 6;
/** The most political capital the bank holds. Mirrors src/core/costs.ts PC_CAP. */
export const PC_CAP = 6;

/** Share of the monthly defense budget each order uses. Mirrors src/core/costs.ts BUDGET_SHARE. */
const BUDGET_SHARE: Record<string, number> = {
  MILITARY_MOBILIZE: 0.12,
  MILITARY_PROCURE: 0.3,
  MILITARY_AIRSTRIKE: 0.08,
  MILITARY_DEPLOY_BORDER: 0.06,
  NUCLEAR_FUND_PROGRAM: 0.15,
};
export const defenseShareOf = (type: string) => BUDGET_SHARE[type] ?? 0;

/** Orders that act at home; the rest need a target. Mirrors needsTarget() in src/core/availability.ts. */
const UNTARGETED: ReadonlySet<string> = new Set([
  'MILITARY_MOBILIZE',
  'MILITARY_DEMOBILIZE',
  'MILITARY_PROCURE',
  'NUCLEAR_FUND_PROGRAM',
  'ECONOMY_ADJUST_MILITARY_BUDGET',
  'INTEL_COUNTER_INTEL',
  'DOMESTIC_PROPAGANDA',
  'DOMESTIC_REFORM',
  'DOMESTIC_POLICING',
]);
export const needsTarget = (type: string) => !UNTARGETED.has(type);

/** One order of the server's menu for a target (`POST /api/orders/menu`). */
export interface MenuEntry {
  id: string;
  type: string;
  params: Record<string, unknown> | null;
  label: string;
  targeted: boolean;
  costPC: number;
  costM: number;
  budgetM: number;
  defenseShare: number;
  /** 0-100, or null when the order is certain. */
  chance: number | null;
  /** The rule layer only. */
  block: OrderBlock | null;
  irreversible: boolean;
  missionWarning: string | null;
  summary: string;
  effects: PreviewEffect[];
  risks: string[];
}

/** An order as the month layer sees it. */
export interface OrderLike {
  type: string;
  targetCountryId?: string;
  params?: Record<string, unknown> | null;
  value?: number;
}

/** One of each order per target per month. Mirrors orderKey() in src/core/availability.ts. */
export function orderKeyOf(a: OrderLike): string {
  return `${a.type}:${a.targetCountryId ?? ''}:${String(a.params?.targetType ?? a.params?.tactic ?? '')}`;
}

/** The unsent month: everything the month layer needs, read from the store by `monthView()`. */
export interface MonthView {
  /** Political capital left after queued orders and crisis/meeting answers (may be negative). */
  pcLeft: number;
  /** The bank at the start of the month. */
  bank: number;
  /** Next month's refill (payload `pcIncome`). */
  pcIncome: number;
  pcCap: number;
  ordersUsed: number;
  queuedKeys: string[];
  /** ◆ cost of each queued order, in tray order. */
  queuedCosts: number[];
  /** Labels of the queued orders, in tray order (for "Remove Reform program (frees ◆ 2)"). */
  queuedLabels: string[];
  /** Which queued orders the staff added. */
  queuedStaff: boolean[];
  /** Exact $M the queued orders use of this month's defense budget. */
  defenseUsedM: number;
  /** This month's defense budget, $M. */
  budgetM: number;
  gameOver: boolean;
}

/** The engine's defense cost of an order in $M (actionCostM): a rounded share of the budget. */
export function defenseCostM(a: OrderLike, budgetM: number): number {
  if (a.type === 'MILITARY_PROCURE' && a.value) return a.value;
  const share = defenseShareOf(a.type);
  return share ? Math.round(share * budgetM) : 0;
}

/**
 * The queued orders whose removal alone frees `gap` capital, cheapest first, staff orders before
 * the player's own at the same cost (tray indices).
 */
export function freeingSlots(gap: number, queuedCosts: number[], staff: boolean[] = []): number[] {
  return queuedCosts
    .map((c, i) => ({ c, i, s: staff[i] ? 0 : 1 }))
    .filter((x) => x.c >= gap)
    .sort((a, b) => a.c - b.c || a.s - b.s || a.i - b.i)
    .map((x) => x.i);
}

/** The refill line: the real monthly income, or the cap when the bank is full. */
export function refillLine(m: Pick<MonthView, 'bank' | 'pcIncome' | 'pcCap'>): string {
  if (m.bank >= m.pcCap) return `Political capital is full: you can't save more than ◆ ${m.pcCap}`;
  return `+${m.pcIncome} next month`;
}

/**
 * NO_CAPITAL for anything that spends `pc` more than the band already counts: an order, or an
 * answer card of the month screen (F-04-1). Mirrors `capitalBlock()` in src/core/availability.ts,
 * same copy: "Needs ◆ n, you have ◆ m." and the fix (remove an order that frees enough, or wait).
 */
export function capitalBlock(pc: number, m: MonthView): MonthBlock | null {
  const have = Math.max(0, m.pcLeft);
  if (pc <= have) return null;
  const gap = pc - have;
  const slots = freeingSlots(gap, m.queuedCosts, m.queuedStaff);
  const frees = slots.length ? m.queuedCosts[slots[0]] : 0;
  // Beside a Remove fix, waiting means next month's income even with the bank full now (F-04-1:
  // "or wait: Political capital is full" read as no way out)
  const refill = frees ? `+${m.pcIncome} next month` : refillLine(m);
  const fix = frees ? `Remove an order (frees ◆ ${frees}), or wait: ${refill}` : m.bank >= m.pcCap ? refill : `Wait: ${refill}`;
  return {
    code: 'NO_CAPITAL',
    reason: `Needs ◆ ${pc}, you have ◆ ${have}.`,
    fix,
    points: 'capital',
    need: { have, need: pc, refill: m.pcIncome },
    slots,
    refill,
  };
}

/**
 * An answer card of the month screen (crisis, meeting) the player cannot afford (F-04-1): `extra`
 * is what choosing it adds to the capital the band already counts, `price` its D-84 price. The
 * engine does not take an answer whose price the bank cannot pay, and an answer that spends what
 * the queued orders need gets an order refused: either way the card says so before the press, in
 * the order cards' words. An answer whose own cost only empties the bank is still free to choose.
 * Mirrors `answerBlock()` in src/core/availability.ts.
 */
export function answerBlock(extra: number, price: number, m: MonthView): MonthBlock | null {
  const orders = m.queuedCosts.reduce((s, c) => s + c, 0);
  if (extra <= Math.max(0, m.pcLeft) || (price <= 0 && orders <= 0)) return null;
  return capitalBlock(extra, m);
}

/** A month-layer block plus what the card needs to offer its fix as a button. */
export interface MonthBlock extends OrderBlock {
  /** NO_CAPITAL: the tray slots whose removal alone covers the gap (cheapest first). */
  slots?: number[];
  /** NO_CAPITAL: the refill line on its own ("+2 next month"). */
  refill?: string;
}

/**
 * The month layer, mirroring `monthBlock()` in src/core/availability.ts: DUPLICATE (rendered as
 * queued), ORDER_LIMIT, NO_CAPITAL, NO_DEFENSE_BUDGET, or null.
 */
export function monthBlock(a: OrderLike, m: MonthView, cost?: { pc?: number; m?: number }): MonthBlock | null {
  if (m.queuedKeys.includes(orderKeyOf(a))) return { code: 'DUPLICATE', reason: 'In this month.', fix: 'Remove', points: 'tray' };
  if (m.ordersUsed >= MAX_ORDERS)
    return { code: 'ORDER_LIMIT', reason: `All ${MAX_ORDERS} orders this month are used.`, fix: 'Remove an order', points: 'orders' };
  const pc = cost?.pc ?? pcCost(a.type);
  const short = capitalBlock(pc, m);
  if (short) return short;
  const costM = cost?.m ?? defenseCostM(a, m.budgetM);
  if (costM > 0) {
    const leftM = m.budgetM - m.defenseUsedM;
    if (costM > leftM) {
      const p = Math.round((costM / Math.max(1e-9, m.budgetM)) * 100);
      const q = Math.max(0, Math.round((leftM / Math.max(1e-9, m.budgetM)) * 100));
      return {
        code: 'NO_DEFENSE_BUDGET',
        reason: `Needs ${p}% of the defense budget, ${q}% is left.`,
        fix: 'Remove a military order',
        points: 'defense',
        need: { have: q, need: p },
      };
    }
  }
  return null;
}

export interface Availability extends OrderAvailability {
  block: MonthBlock | null;
}

/**
 * Both layers in the engine's precedence: GAME_OVER, NEEDS_TARGET, rule codes, DUPLICATE
 * (queued), ORDER_LIMIT, NO_CAPITAL, NO_DEFENSE_BUDGET. The permanent reason wins, so nobody
 * frees capital for an order the rules forbid anyway. `entry` is the server's menu entry for this
 * order and target (undefined while it loads: the rule layer is then assumed clear).
 */
export function availabilityOf(a: OrderLike & { targeted: boolean }, m: MonthView, entry?: MenuEntry | null): Availability {
  if (m.gameOver) return { state: 'invalid', block: { code: 'GAME_OVER', reason: 'The game is over.', fix: null, points: null } };
  if (a.targeted && !a.targetCountryId)
    return { state: 'invalid', block: { code: 'NEEDS_TARGET', reason: 'Pick a country first.', fix: 'Pick a country', points: 'target' } };
  // DUPLICATE beats a rule block: an order already in this month shows as queued
  const dup = m.queuedKeys.includes(orderKeyOf(a));
  if (!dup && entry?.block) return { state: 'invalid', block: entry.block };
  const mb = monthBlock(a, m, entry ? { pc: entry.costPC, m: entry.costM || undefined } : undefined);
  if (!mb) return { state: 'available', block: null };
  return { state: mb.code === 'DUPLICATE' ? 'queued' : 'unaffordable', block: mb };
}
