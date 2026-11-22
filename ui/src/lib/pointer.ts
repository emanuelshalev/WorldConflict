import { restartClass } from './motion';

/**
 * Point at a resource (design-orders.md 5): uses the orders package's `pointAt()` when its module
 * exists, else lights every `[data-point=name]` element for 1.6 s with the same `is-pointed` class.
 */
type PointFn = (target: string, opts?: { detail?: string }) => void;
const mod = Object.values(import.meta.glob<{ pointAt?: PointFn }>('./pointAt.ts', { eager: true }))[0];

export function pointTo(target: string, detail?: string): void {
  if (mod?.pointAt) {
    mod.pointAt(target, detail ? { detail } : undefined);
    return;
  }
  document.querySelectorAll(`[data-point="${target}"]`).forEach((el) => restartClass(el, 'is-pointed', 1600));
}
