import { useEffect, useSyncExternalStore } from 'react';

/**
 * Motion helpers (design-feel.md 6.1): flights between two places (Web Animations API on a
 * portal layer), FLIP, restartable class verbs, reduced motion and the idle switch that pauses
 * every scene loop. Only transform and opacity are animated.
 */

export const DUR = { press: 80, quick: 140, move: 280, travel: 420, page: 360, scene: 600, stinger: 2400, stingerNuclear: 2800 } as const;
export const EASE = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  stamp: 'cubic-bezier(.2, 1.6, .4, 1)',
  back: 'cubic-bezier(.34, 1.56, .64, 1)',
  flight: 'cubic-bezier(.34, 1.3, .64, 1)',
  in: 'cubic-bezier(.5, 0, .75, 0)',
} as const;

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Live reduced-motion flag for components. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (fn) => {
      let mq: MediaQueryList | null = null;
      try {
        mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        mq.addEventListener('change', fn);
      } catch {
        /* no matchMedia */
      }
      return () => mq?.removeEventListener('change', fn);
    },
    prefersReducedMotion,
    () => false,
  );
}

let layer: HTMLDivElement | null = null;
function flyLayer(): HTMLDivElement {
  if (layer?.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = 'wc-fly-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  return layer;
}

export interface FlyOptions {
  /** The thing that flies (cloned if it is already in the document). Defaults to a clone of `from`. */
  node?: Element;
  duration?: number;
  /** Height of the arc's peak above the straight line, px. */
  arc?: number;
  easing?: string;
  /** Rotation at the arc's peak, degrees. */
  rotate?: number;
  /** Scale at start, peak and landing. */
  scale?: [number, number, number];
  /** Called when the flight lands (also called at once under reduced motion). */
  onLand?: () => void;
}

/**
 * Fly a copy of `node` from the centre of `from` to the centre of `to` along a quadratic arc,
 * on a fixed portal layer above everything. Resolves on landing. Reduced motion: no flight.
 */
export function flyBetween(from: Element, to: Element, opts: FlyOptions = {}): Promise<void> {
  const { duration = DUR.travel, arc = 60, easing = EASE.flight, rotate = 20, scale = [1, 1.25, 0.62], onLand } = opts;
  if (prefersReducedMotion() || typeof document === 'undefined' || !from.isConnected || !to.isConnected) {
    onLand?.();
    return Promise.resolve();
  }
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const src = opts.node ?? from;
  const n = (src.isConnected || src === from ? src.cloneNode(true) : src) as HTMLElement | SVGElement;
  const w = a.width || 24;
  const h = a.height || 24;
  n.setAttribute('aria-hidden', 'true');
  n.removeAttribute('id');
  const style = (n as HTMLElement).style;
  style.position = 'fixed';
  style.left = `${a.left + a.width / 2 - w / 2}px`;
  style.top = `${a.top + a.height / 2 - h / 2}px`;
  style.width = `${w}px`;
  style.height = `${h}px`;
  style.margin = '0';
  style.pointerEvents = 'none';
  style.willChange = 'transform';
  flyLayer().appendChild(n);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = n.animate(
    [
      { transform: `translate(0px, 0px) scale(${scale[0]}) rotate(0deg)` },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - arc}px) scale(${scale[1]}) rotate(${rotate}deg)`, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale[2]}) rotate(0deg)` },
    ],
    { duration, easing, fill: 'forwards' },
  );
  return anim.finished.then(
    () => {
      n.remove();
      onLand?.();
    },
    () => {
      n.remove();
    },
  );
}

/** FLIP: animate `el` from where it was (`first`, a rect measured before the DOM change) to where it is now. */
export function flipFrom(el: Element, first: DOMRect, duration: number = DUR.travel, easing: string = EASE.back): Animation | null {
  if (prefersReducedMotion()) return null;
  const last = el.getBoundingClientRect();
  if (!last.width || !last.height) return null;
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  const sx = first.width / last.width;
  const sy = first.height / last.height;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return null;
  return el.animate(
    [{ transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transformOrigin: '0 0', transform: 'none' }],
    { duration, easing },
  );
}

/** Re-trigger a one-shot class animation (shake, flash) even if it is already on the element. */
export function restartClass(el: Element | null | undefined, cls: string, ms = 700): void {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), ms);
}

/** The refusal verb: shake (or, with reduced motion, a two-flash red outline). */
export const shake = (el: Element | null | undefined) => restartClass(el, 'wc-shake', 420);

// ---------------------------------------------------------------------------
// Idle: after `ms` without pointer, key, wheel, scroll or touch input, <html> gets .wc-idle and
// every scene loop holds its frame (feel.css). Any input wakes it. One tracker for the page.
// ---------------------------------------------------------------------------
let idle = false;
let idleUsers = 0;
let idleMs = 15_000;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
const idleListeners = new Set<() => void>();
const IDLE_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'] as const;

function setIdle(v: boolean) {
  if (idle === v) return;
  idle = v;
  document.documentElement.classList.toggle('wc-idle', v);
  for (const l of idleListeners) l();
}
function wake() {
  setIdle(false);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => setIdle(true), idleMs);
}
function onVisibility() {
  if (document.visibilityState === 'hidden') setIdle(true);
  else wake();
}

function startIdle(ms: number) {
  idleMs = Math.min(idleMs, ms);
  if (idleUsers++ > 0) return;
  for (const e of IDLE_EVENTS) window.addEventListener(e, wake, { passive: true, capture: true });
  document.addEventListener('visibilitychange', onVisibility);
  wake();
}
function stopIdle() {
  if (--idleUsers > 0) return;
  for (const e of IDLE_EVENTS) window.removeEventListener(e, wake, { capture: true });
  document.removeEventListener('visibilitychange', onVisibility);
  clearTimeout(idleTimer);
  setIdle(false);
}

/**
 * Track idleness (sets `.wc-idle` on <html> after `ms`, default 15 s). Returns the live flag.
 * Safe to call from many components: one listener set for the page.
 */
export function useIdle(ms = 15_000): boolean {
  useEffect(() => {
    startIdle(ms);
    return stopIdle;
  }, [ms]);
  return useSyncExternalStore(
    (fn) => {
      idleListeners.add(fn);
      return () => idleListeners.delete(fn);
    },
    () => idle,
    () => false,
  );
}

/** Subscribe to idle changes outside React (SceneFrame uses it to pause off-screen work). */
export function onIdleChange(fn: (idle: boolean) => void): () => void {
  const l = () => fn(idle);
  idleListeners.add(l);
  return () => idleListeners.delete(l);
}
export const isIdle = () => idle;
