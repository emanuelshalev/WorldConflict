import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { API_BASE, fetchPreview, monthView, useGameStore } from '../../store/gameStore';
import { type Availability, type MenuEntry, type MonthView, availabilityOf } from '../../lib/availability';
import { ORDERS, type OrderDef, orderLabel } from '../../lib/orders';

/**
 * The order menu cache and the hooks every order surface shares (design-orders.md §3.1, §6):
 * one `POST /api/orders/menu` per target per month, cached by `saveId:turn:target`, merged with
 * the live month layer. Falls back to one `/preview-action` per order against an older server.
 */

type Slot = MenuEntry[] | 'loading' | 'error';
interface MenuCache {
  menus: Record<string, Slot>;
}
export const useMenuCache = create<MenuCache>(() => ({ menus: {} }));

function cacheKey(target: string | null): string | null {
  const { saveId, worldState } = useGameStore.getState();
  if (!saveId || !worldState) return null;
  return `${saveId}:${worldState.turn}:${target ?? ''}`;
}

async function fallbackMenu(target: string | null): Promise<MenuEntry[]> {
  const name = useGameStore.getState().playerView.find((v) => v.id === target)?.name;
  const defs = ORDERS.filter((o) => o.targeted === !!target);
  return Promise.all(
    defs.map(async (o) => {
      const p = await fetchPreview({ type: o.type, params: o.params, ...(target ? { targetCountryId: target } : {}) });
      return {
        id: o.id,
        type: o.type,
        params: o.params ?? null,
        label: orderLabel(o, name),
        targeted: o.targeted,
        costPC: p?.costPC ?? 0,
        costM: p?.costM ?? 0,
        budgetM: p?.budgetM ?? 0,
        defenseShare: 0,
        chance: p?.successChance ?? null,
        block: p?.block ?? (p?.blocked ? { code: 'INVALID_VALUE', reason: p.blocked, fix: null, points: null } : null),
        irreversible: !!p?.irreversible || !!o.irreversible,
        missionWarning: p?.missionWarning ?? null,
        summary: p?.summary ?? '',
        effects: p?.effects ?? [],
        risks: p?.risks ?? [],
      } satisfies MenuEntry;
    }),
  );
}

/** Load (once per month) the menu for one target, or the untargeted orders for `null`. */
export async function loadMenu(target: string | null): Promise<MenuEntry[] | null> {
  const key = cacheKey(target);
  if (!key) return null;
  const have = useMenuCache.getState().menus[key];
  if (Array.isArray(have)) return have;
  if (have === 'loading') return null;
  const put = (v: Slot) => useMenuCache.setState((s) => ({ menus: { ...s.menus, [key]: v } }));
  put('loading');
  const { saveId } = useGameStore.getState();
  try {
    const res = await fetch(`${API_BASE}/orders/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveId, targetCountryId: target }),
    });
    const data = await res.json().catch(() => ({}));
    let orders: MenuEntry[];
    // An older server without the menu route: one preview per order
    if (res.status === 404 && /route/i.test(String(data.message ?? data.error ?? ''))) orders = await fallbackMenu(target);
    else if (!data.success) throw new Error(data.error ?? 'menu failed');
    else orders = data.orders as MenuEntry[];
    put(orders);
    return orders;
  } catch {
    // Cards still render (cost and month layer); queueOrder() re-checks the rules on press
    put('error');
    return null;
  }
}

/** Drop every cached menu (tests, or after an action changes the world mid-month). */
export function clearMenus(): void {
  useMenuCache.setState({ menus: {} });
}

/** The menu entries for one target by order id, or null while loading (or after an error). */
export function useOrderMenu(target: string | null | undefined): Record<string, MenuEntry> | null {
  const saveId = useGameStore((s) => s.saveId);
  const turn = useGameStore((s) => s.worldState?.turn);
  const key = saveId && turn !== undefined && target !== undefined ? `${saveId}:${turn}:${target ?? ''}` : null;
  const slot = useMenuCache((s) => (key ? s.menus[key] : undefined));
  useEffect(() => {
    if (key && slot === undefined) void loadMenu(target ?? null);
  }, [key, slot, target]);
  return useMemo(() => (Array.isArray(slot) ? Object.fromEntries(slot.map((e) => [e.id, e])) : null), [slot]);
}

/** The live month layer (re-renders when orders, answers or the payload change). */
export function useMonthView(): MonthView {
  const parts = useGameStore(
    useShallow((s) => [s.worldState, s.pendingActions, s.decisionChoices, s.pendingDecisions, s.pcIncome, s.pcCap, s.gameOver] as const),
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => monthView(), parts);
}

export interface OrderState {
  def: OrderDef;
  /** Undefined for an untargeted order. */
  targetId?: string;
  targetName?: string;
  label: string;
  entry: MenuEntry | null;
  avail: Availability;
  month: MonthView;
  /** Tray index when queued. */
  queuedIndex: number;
}

/** One order against one target: label, server entry and both availability layers. */
export function useOrderState(def: OrderDef, targetId?: string): OrderState {
  const month = useMonthView();
  const menu = useOrderMenu(def.targeted ? (targetId ?? undefined) : null);
  const targetName = useGameStore((s) => (targetId ? s.playerView.find((v) => v.id === targetId)?.name : undefined));
  const pending = useGameStore((s) => s.pendingActions);
  const t = def.targeted ? targetId : undefined;
  const entry = (menu && menu[def.id]) || null;
  const action = { type: def.type, params: def.params, targetCountryId: t };
  const avail = availabilityOf({ ...action, targeted: def.targeted }, month, entry);
  const key = `${def.type}:${t ?? ''}:${String(def.params?.targetType ?? def.params?.tactic ?? '')}`;
  const queuedIndex = pending.findIndex((a) => `${a.type}:${a.targetCountryId ?? ''}:${String(a.params?.targetType ?? a.params?.tactic ?? '')}` === key);
  return { def, targetId: t, targetName, label: orderLabel(def, targetName), entry, avail, month, queuedIndex };
}
