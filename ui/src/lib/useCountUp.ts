import { useEffect, useState } from 'react';

/** Animated count from 0 to the target, eased, once per mount (skipped with reduced motion). */
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
