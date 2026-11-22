import { useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../lib/motion';

/**
 * A year that rolls to its new value (2026, 2011, 1996, 1978, 1960) during a time travel. The text
 * node is written at most every 80 ms outside React; reduced motion jumps straight to the year.
 */
export function RollingYear({ year }: { year: number }) {
  const ref = useRef<HTMLElement>(null);
  const shown = useRef(year);
  useLayoutEffect(() => {
    const el = ref.current;
    const from = shown.current;
    shown.current = year;
    if (!el || from === year || !el.textContent || prefersReducedMotion()) {
      if (el) el.textContent = String(year);
      return;
    }
    const t0 = performance.now();
    let t: ReturnType<typeof setTimeout> | undefined;
    const step = () => {
      const p = Math.min(1, (performance.now() - t0 - 100) / 550);
      const e = p <= 0 ? 0 : 1 - (1 - p) ** 3;
      el.textContent = String(Math.round(from + (year - from) * e));
      if (p < 1) t = setTimeout(step, 80);
    };
    step();
    return () => clearTimeout(t);
  }, [year]);
  return <b ref={ref} className="num" />;
}
