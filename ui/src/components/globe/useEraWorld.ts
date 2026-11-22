/**
 * Title globe era state (design-worldmap.md 3.3, D-54): the era map payload with prefetch, the
 * remembered density switch and the colouring.
 */
import { useCallback, useEffect, useState } from 'react';
import { type EraMap, fetchEraMap, useGameStore } from '../../store/gameStore';
import { type ColourBy, type Density, defaultColourBy } from './eraLayers';

const DENSITY_KEY = 'wc.globe.density';
const COLOUR_KEY = 'wc.globe.colour';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
}

/**
 * The era map of the selected scenario. The first era shown is fetched at once and the other eras
 * are prefetched when the browser is idle, so a switch never waits on the network: until a late
 * payload lands, the previous era stays on screen.
 */
export function useEraMap(scenarioId: string, active: boolean, allIds: string[]): EraMap | null {
  const [maps, setMaps] = useState<Record<string, EraMap>>({});
  // The last era that landed for a request: shown until a late payload arrives
  const [shown, setShown] = useState<EraMap | null>(null);
  const idsKey = allIds.join(',');
  useEffect(() => {
    if (!active || !scenarioId) return;
    let live = true;
    fetchEraMap(scenarioId)
      .then((m) => {
        if (!live) return;
        setMaps((x) => (x[m.scenarioId] ? x : { ...x, [m.scenarioId]: m }));
        setShown(m);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [scenarioId, active]);
  useEffect(() => {
    if (!active || !idsKey) return;
    const run = () => {
      for (const id of idsKey.split(',')) {
        fetchEraMap(id)
          .then((m) => setMaps((x) => (x[m.scenarioId] ? x : { ...x, [m.scenarioId]: m })))
          .catch(() => undefined);
      }
    };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
    if (w.requestIdleCallback) {
      const h = w.requestIdleCallback(run, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(h);
    }
    const t = window.setTimeout(run, 800);
    return () => window.clearTimeout(t);
  }, [idsKey, active]);
  return maps[scenarioId] ?? shown;
}

/**
 * "Show all situations and rival lines" (variant A behind one switch), remembered. Without a saved
 * choice it is on for the "I know this" familiarity level and off otherwise.
 */
export function useGlobeDensity(): [Density, (d: Density) => void] {
  const level = useGameStore((s) => s.learn?.level);
  const [saved, setSaved] = useState<Density | null>(() => {
    const v = read(DENSITY_KEY);
    return v === 'all' || v === 'calm' ? v : null;
  });
  const set = useCallback((d: Density) => {
    write(DENSITY_KEY, d);
    setSaved(d);
  }, []);
  return [saved ?? (level === 'know' ? 'all' : 'calm'), set];
}

type ColourMemory = { hist?: ColourBy; now?: ColourBy };
const COLOURS: readonly ColourBy[] = ['blocs', 'stability', 'difficulty'];

/**
 * The colouring: Blocs by default in historical eras, Stability in November 2026 (D-54). A choice
 * is remembered per kind of era, so picking Stability in 1960 does not repaint the present.
 */
export function useColourBy(era: EraMap | null): [ColourBy, (c: ColourBy) => void] {
  const [mem, setMem] = useState<ColourMemory>(() => {
    try {
      const v = JSON.parse(read(COLOUR_KEY) ?? '{}') as ColourMemory;
      return {
        hist: v.hist && COLOURS.includes(v.hist) ? v.hist : undefined,
        now: v.now && COLOURS.includes(v.now) ? v.now : undefined,
      };
    } catch {
      return {};
    }
  });
  const slot: keyof ColourMemory = era && era.year >= 2026 ? 'now' : 'hist';
  const set = useCallback(
    (c: ColourBy) =>
      setMem((m) => {
        const next = { ...m, [slot]: c };
        write(COLOUR_KEY, JSON.stringify(next));
        return next;
      }),
    [slot],
  );
  return [mem[slot] ?? defaultColourBy(era), set];
}
