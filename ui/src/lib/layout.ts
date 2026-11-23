import { type RefObject, useEffect, useLayoutEffect, useState } from 'react';
import { create } from 'zustand';

/**
 * The layout system of the game screen (design-layout.md, D-80, RS-008). The same breakpoints as
 * styles/layout.css (L-20): P <= 700 < T <= 1279 < L <= 1599 < D <= 2239 < W <= 3199 < U; short
 * <= 820 tall, tall >= 900, tall-plus >= 1200, tall-max >= 1300. No other width appears in the
 * game screen's code. The fit rule of the Plan (L-10) is `useFitPlan`.
 */

export type LayoutClass = 'P' | 'T' | 'L' | 'D' | 'W' | 'U';

export const BP = { P: 700, T: 1279, L: 1599, D: 2239, W: 3199, short: 820, tall: 900, tallPlus: 1200, tallMax: 1300 } as const;

export interface Layout {
  cls: LayoutClass;
  width: number;
  height: number;
  short: boolean;
  tall: boolean;
  tallPlus: boolean;
  tallMax: boolean;
  /** The List is a column (D and up). */
  listColumn: boolean;
  /** The Plan is a rail on the desk (L and up); below it is the bar (L-11). */
  planRail: boolean;
  /** Map mode: the Plan floats on the right (D and up); below it is the bar. */
  mapFloat: boolean;
  /** Map mode: the List sits under the Thing card (W and up, 1200 tall). */
  mapList: boolean;
}

export function layoutFor(width: number, height: number): Layout {
  const cls: LayoutClass = width <= BP.P ? 'P' : width <= BP.T ? 'T' : width <= BP.L ? 'L' : width <= BP.D ? 'D' : width <= BP.W ? 'W' : 'U';
  const at = (c: LayoutClass) => 'PTLDWU'.indexOf(cls) >= 'PTLDWU'.indexOf(c);
  return {
    cls,
    width,
    height,
    short: height <= BP.short,
    tall: height >= BP.tall,
    tallPlus: height >= BP.tallPlus,
    tallMax: height >= BP.tallMax,
    listColumn: at('D'),
    planRail: at('L'),
    mapFloat: at('D'),
    mapList: at('W') && height >= BP.tallPlus,
  };
}

const read = () => (typeof window === 'undefined' ? layoutFor(1440, 900) : layoutFor(window.innerWidth, window.innerHeight));

/** One store for the whole screen, updated on resize (every region reads the same class). */
export const useLayoutStore = create<Layout>(() => read());
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('resize', () => {
    const next = read();
    const cur = useLayoutStore.getState();
    if (next.width !== cur.width || next.height !== cur.height) useLayoutStore.setState(next, true);
  });
}

export function useLayout(): Layout {
  return useLayoutStore();
}

export type PlanSection = 'decided' | 'recommended' | 'skipped';

export interface PlanFit {
  /** Steps applied (L-10): 1 fold Skipped, 2 compact rows, 3 fold Decided, 4 fold Recommended. */
  level: number;
  /** The section opened with Show (accordion: the others fold), or null. */
  shown: PlanSection | null;
  show: (s: PlanSection | null) => void;
  folded: (s: PlanSection) => boolean;
  compact: boolean;
}

/**
 * The fit rule (L-10, supersedes QA3-S3-3): when the Plan's sections do not fit above the Execute
 * block, fold Skipped, then compact the rows, then fold Decided, then fold Recommended, until they
 * fit; re-run on every resize of the list and every change of the plan (`key`). A folded section
 * keeps its heading, count, summary and Show; Show opens it and folds the others. The list never
 * scrolls (`overflow: hidden`, no `auto`).
 */
/**
 * The fit loop shared by the Plan (L-10) and the Thing: raise the level one step at a time while
 * the element's content is taller than its box, from 0 again whenever the content (`key`), the
 * room (its size) or the fonts change. The element itself never scrolls.
 */
export function useFitLevel(ref: RefObject<HTMLElement | null>, key: string, max: number): number {
  const [size, setSize] = useState(0);
  // Web fonts change how the text wraps: measure again once they are in
  const [fonts, setFonts] = useState(0);
  // The level belongs to one signature (content, room, fonts): a new one starts from 0
  const sig = `${key}|${size}|${fonts}`;
  const [st, setSt] = useState<{ sig: string; level: number }>({ sig, level: 0 });
  const level = st.sig === sig ? st.level : 0;
  // Measuring the DOM after layout and stepping once per frame is the point of this effect
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (el.scrollHeight > el.clientHeight + 1 && level < max) setSt({ sig, level: level + 1 });
    else if (st.sig !== sig) setSt({ sig, level });
  }, [ref, level, max, sig, st.sig]);
  useEffect(() => {
    const f = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!f) return;
    let live = true;
    const bump = () => live && setFonts((n) => n + 1);
    void f.ready.then(bump);
    f.addEventListener?.('loadingdone', bump);
    return () => {
      live = false;
      f.removeEventListener?.('loadingdone', bump);
    };
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setSize(Math.round(el.clientHeight * 10000 + el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return level;
}

export function useFitPlan(ref: RefObject<HTMLElement | null>, key: string): PlanFit {
  const [shown, setShown] = useState<PlanSection | null>(null);
  const level = useFitLevel(ref, `${key}|${shown}`, 4);
  const folded = (s: PlanSection) => {
    if (shown) return s !== shown;
    if (s === 'skipped') return level >= 1;
    if (s === 'decided') return level >= 3;
    return level >= 4;
  };
  return { level, shown, show: setShown, folded, compact: level >= 2 || !!shown };
}
