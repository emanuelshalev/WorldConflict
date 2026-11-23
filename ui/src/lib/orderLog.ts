/**
 * Validation in real use (D-75, design-order-cards.md section 3.4): a small client log of the
 * orders a player picks, removes and backs out of, by registry order id, so playtest session
 * reports can count mis-picks per icon ("given then removed", "confirm face cancelled").
 *
 * No network: entries stay in this browser. Read them with `window.wcOrderLog()` (Playwright:
 * `page.evaluate(() => window.wcOrderLog())`) or from localStorage key `worldconflict.orderLog`
 * (a JSON array, newest last, capped at MAX_ENTRIES). `window.wcOrderLog.clear()` empties it.
 */

export type OrderLogKind =
  /** The order was added to this month (by the player or accepted from a recommendation). */
  | 'pick'
  /** A queued order (or a recommendation) was taken out again. */
  | 'remove'
  /** The confirm face of a danger order was opened. */
  | 'confirm-open'
  /** The player backed out on the confirm face (Keep the peace, Stand down, Cancel, Esc). */
  | 'confirm-cancel';

export interface OrderLogEntry {
  kind: OrderLogKind;
  /** Registry id ("airstrike-nuclear"); "unknown" when the action has no registry entry. */
  orderId: string;
  /** Target country id, if any. */
  target?: string;
  /** Game month (turn) when it happened. */
  month?: number;
  /** Who queued it: player, staff (a recommendation) or crisis. */
  origin?: string;
  /** Milliseconds since the log started this page load (ordering only, never wall time). */
  at: number;
}

export const ORDER_LOG_KEY = 'worldconflict.orderLog';
export const MAX_ENTRIES = 500;

let memory: OrderLogEntry[] | null = null;
const started = typeof performance !== 'undefined' ? performance.now() : 0;

function load(): OrderLogEntry[] {
  if (memory) return memory;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ORDER_LOG_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : [];
    memory = Array.isArray(parsed) ? parsed : [];
  } catch {
    memory = [];
  }
  return memory;
}

function save(list: OrderLogEntry[]) {
  try {
    localStorage.setItem(ORDER_LOG_KEY, JSON.stringify(list));
  } catch {
    // Private mode or storage full: the in-memory log still answers window.wcOrderLog()
  }
}

/** Append one entry. Never throws: logging must not break an order. */
export function logOrder(kind: OrderLogKind, orderId: string | undefined, extra: Omit<OrderLogEntry, 'kind' | 'orderId' | 'at'> = {}): void {
  try {
    const list = load();
    const at = Math.round((typeof performance !== 'undefined' ? performance.now() : 0) - started);
    list.push({ kind, orderId: orderId ?? 'unknown', ...extra, at });
    if (list.length > MAX_ENTRIES) list.splice(0, list.length - MAX_ENTRIES);
    save(list);
  } catch {
    // ignore
  }
}

/** Every entry, oldest first (a copy). */
export function readOrderLog(): OrderLogEntry[] {
  return [...load()];
}

export function clearOrderLog(): void {
  memory = [];
  save(memory);
}

/** Per order id: picks, removes, confirm cancels (what a session report tallies). */
export function summarizeOrderLog(list: OrderLogEntry[] = readOrderLog()): Record<string, Record<OrderLogKind, number>> {
  const out: Record<string, Record<OrderLogKind, number>> = {};
  for (const e of list) {
    out[e.orderId] ??= { pick: 0, remove: 0, 'confirm-open': 0, 'confirm-cancel': 0 };
    out[e.orderId][e.kind] += 1;
  }
  return out;
}

declare global {
  interface Window {
    wcOrderLog?: (() => OrderLogEntry[]) & { clear: () => void; summary: () => ReturnType<typeof summarizeOrderLog> };
  }
}

if (typeof window !== 'undefined') {
  window.wcOrderLog = Object.assign(() => readOrderLog(), { clear: clearOrderLog, summary: () => summarizeOrderLog() });
}
