import { useEffect } from 'react';
import { create } from 'zustand';
import type { PointTarget } from '../store/gameStore';
import '../styles/pointer.css';

/**
 * Point at it (design-orders.md §5, goal G2): a reason that names a resource lights that resource
 * up wherever it is drawn. `pointAt('capital')` adds `is-pointed` to every visible element with
 * `data-point="capital"` (HUD meter, rail meter, phone chip, map menu header), so no component has
 * to subscribe. If none is visible (rail collapsed on a phone or tablet), elements whose
 * `data-point-proxy` lists the target react instead (the sheet grab bar, the chip strip).
 *
 *  - `detail` shows a small accent callout under the first pointed element:
 *    "Declare war on India needs ◆ 2".
 *  - `slots` lights the tray slots (`data-point-slot="<index>"`) whose removal would cover the gap.
 *  - `hold` keeps a static ring after the two pulses until `releasePoint()` (a reason on screen).
 *
 * Motion: two 0.8 s pulses (transform and box-shadow only), then the ring fades; reduced motion
 * gets a static ring for 2 s (pointer.css). The state is a tiny separate store: `usePointed(name)`
 * lets a React element mirror it, `usePointTarget(name)` returns props to spread.
 */

export interface PointOptions {
  /** Callout text under the pointed meter. */
  detail?: string;
  /** Tray slot indices to light with the meter. */
  slots?: number[];
  /** Keep a static ring after the pulses until releasePoint() or the next pointAt(). */
  hold?: boolean;
}

interface PointState {
  target: PointTarget | null;
  nonce: number;
  detail: string | null;
  slots: number[];
}

export const usePointStore = create<PointState>(() => ({ target: null, nonce: 0, detail: null, slots: [] }));

/** How long a point lasts without `hold` (two 0.8 s pulses). */
export const POINT_MS = 1600;

let timer: ReturnType<typeof setTimeout> | null = null;
let lit: Element[] = [];
let callout: HTMLDivElement | null = null;

function visible(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect?.();
  if (!r || r.width === 0 || r.height === 0) return false;
  const cs = getComputedStyle(el as HTMLElement);
  return cs.visibility !== 'hidden' && cs.display !== 'none';
}

function clearLit() {
  for (const el of lit) el.classList.remove('is-pointed', 'is-point-held', 'is-point-slot');
  lit = [];
  callout?.remove();
  callout = null;
}

function placeCallout(anchor: Element, text: string) {
  callout = document.createElement('div');
  callout.className = 'wc-point-callout';
  callout.setAttribute('role', 'status');
  callout.textContent = text;
  document.body.appendChild(callout);
  const r = anchor.getBoundingClientRect();
  const w = callout.offsetWidth;
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  // Below the meter, or above it when the meter sits at the bottom (phone chip strip)
  const below = r.bottom + 8 + callout.offsetHeight < window.innerHeight;
  callout.style.left = `${left}px`;
  callout.style.top = below ? `${r.bottom + 8}px` : `${r.top - 8 - callout.offsetHeight}px`;
  callout.classList.add(below ? 'below' : 'above');
}

/** Every visible instance of one target, or its visible proxies when none is on screen. */
function instances(target: PointTarget): Element[] {
  const els = [...document.querySelectorAll(`[data-point="${target}"]`)].filter(visible);
  return els.length ? els : [...document.querySelectorAll(`[data-point-proxy~="${target}"]`)].filter(visible);
}

/**
 * Light up every visible instance of `target` (and the given tray slots), for 1.6 s or until
 * released. Several targets at once (`['tray', 'capital']` after an order is added) are allowed;
 * the callout sits under the first.
 */
export function pointAt(targets: PointTarget | PointTarget[], opts: PointOptions = {}): void {
  const list = Array.isArray(targets) ? targets : [targets];
  const target = list[0];
  if (timer) clearTimeout(timer);
  clearLit();
  if (!target) return;
  usePointStore.setState((s) => ({ target, nonce: s.nonce + 1, detail: opts.detail ?? null, slots: opts.slots ?? [] }));
  if (typeof document === 'undefined') return;
  const els = list.flatMap(instances);
  const slotEls = (opts.slots ?? []).flatMap((i) => [...document.querySelectorAll(`[data-point-slot="${i}"]`)].filter(visible));
  // Restart the animation even if the element was already pointed
  for (const el of [...els, ...slotEls]) {
    el.classList.remove('is-pointed');
    void (el as HTMLElement).offsetWidth;
    el.classList.add('is-pointed');
    if (opts.hold) el.classList.add('is-point-held');
  }
  for (const el of slotEls) el.classList.add('is-point-slot');
  lit = [...els, ...slotEls];
  if (opts.detail && els[0]) placeCallout(els[0], opts.detail);
  if (!opts.hold) timer = setTimeout(releasePoint, POINT_MS + 400);
}

/** End a held point (the reason left the screen). */
export function releasePoint(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  clearLit();
  usePointStore.setState({ target: null, detail: null, slots: [] });
}

/** True while `name` is the pointed target. */
export function usePointed(name: PointTarget): boolean {
  return usePointStore((s) => s.target === name);
}

/**
 * Props for an element that draws a resource: `<div {...usePointTarget('capital')}>`. The element
 * then reacts to every pointAt('capital'), wherever the call comes from.
 */
export function usePointTarget(name: PointTarget, className = ''): { 'data-point': PointTarget; className: string } {
  const on = usePointed(name);
  return { 'data-point': name, className: `${className}${on ? ' is-pointed' : ''}`.trim() };
}

/** Hold a point while a component (a reason on screen) is mounted and `on` is true. */
export function useHeldPoint(target: PointTarget | null, on: boolean, opts: Omit<PointOptions, 'hold'> = {}): void {
  const detail = opts.detail;
  const slots = (opts.slots ?? []).join(',');
  useEffect(() => {
    if (!on || !target) return;
    pointAt(target, { detail, slots: slots ? slots.split(',').map(Number) : [], hold: true });
    return () => {
      if (usePointStore.getState().target === target) releasePoint();
    };
  }, [target, on, detail, slots]);
}
