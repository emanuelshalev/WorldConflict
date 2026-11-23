import { useEffect, useState } from 'react';

/** Animated count from 0 to the target, eased, once per mount (skipped with reduced motion). */
/**
 * What a counting total shows (QA3R-2i): a placeholder until the count starts, then at least 1,
 * so a positive score never paints as 0 while it waits to count.
 */
export function countText(target: number, value: number): string {
  if (target <= 0) return String(Math.round(target));
  if (value <= 0) return '···';
  return String(Math.max(1, Math.min(Math.round(target), Math.round(value))));
}

export function useCountUp(target: number, ms = 900, delay = 300): number {
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [v, setV] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / ms));
      setV(target * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, delay, reduced]);
  return reduced ? target : v;
}
