import { useEffect, useState } from 'react';

/** True while the viewport is narrower than `px` (live, follows resizes and zoom). */
export function useNarrow(px: number): boolean {
  const query = `(max-width: ${px - 0.02}px)`;
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? (window.matchMedia?.(query).matches ?? window.innerWidth < px) : false));
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return narrow;
}

